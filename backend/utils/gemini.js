/**
 * Resilient Gemini gateway.
 *
 * Goals: a Gemini outage, rate limit or traffic spike must NEVER break the app.
 *
 *  - model fallback chain      (GEMINI_MODELS, tried in order)
 *  - API-key rotation          (GEMINI_API_KEYS + GEMINI_API_KEY)
 *  - retries with exponential backoff + full jitter (honours server retry hints)
 *  - per-attempt timeouts and an overall time budget
 *  - per-model / per-key cooldowns after 429/auth/404
 *  - circuit breaker           (fail fast to the offline engine during outages)
 *  - concurrency limiter       (don't DoS ourselves into 429s)
 *  - LRU+TTL response cache and in-flight request de-duplication
 *  - tolerant JSON parsing with automatic retry on bad output
 *
 * Public API (backwards compatible):
 *   generateContent(prompt, opts) -> string
 *   generateJSON(prompt, opts)    -> parsed object
 *   getAIStatus()                 -> health snapshot (no secrets)
 * Callers pass `opts.meta = {}` to receive { source, model, attempts, latencyMs }.
 * On total failure these functions throw an Error with code "AI_UNAVAILABLE";
 * the caller (services/aiService.js) then switches to the offline engine.
 */
const crypto = require("crypto");
const { parseLooseJSON } = require("./jsonRepair");

let GoogleGenAI = null;
try {
  ({ GoogleGenAI } = require("@google/genai"));
} catch (_) {
  /* SDK not installed: gateway reports "not configured" and callers use the offline engine */
}

/* ------------------------------ configuration ------------------------------ */
const DEFAULT_MODELS = ["gemini-flash-latest", "gemini-2.5-flash", "gemini-flash-lite-latest", "gemini-2.5-flash-lite"];
const num = (v, d) => (Number.isFinite(Number(v)) && v !== "" && v != null ? Number(v) : d);

let overrides = {};
function cfg() {
  const env = process.env;
  const models = (env.GEMINI_MODELS || "").split(",").map((s) => s.trim()).filter(Boolean);
  return {
    models: models.length ? models : DEFAULT_MODELS,
    timeoutMs: num(env.AI_TIMEOUT_MS, 25000),
    totalBudgetMs: num(env.AI_TOTAL_BUDGET_MS, 45000),
    retriesPerModel: num(env.AI_RETRIES_PER_MODEL, 2),
    backoffBaseMs: num(env.AI_BACKOFF_BASE_MS, 600),
    backoffMaxMs: num(env.AI_BACKOFF_MAX_MS, 5000),
    maxConcurrency: num(env.AI_MAX_CONCURRENCY, 4),
    queueTimeoutMs: num(env.AI_QUEUE_TIMEOUT_MS, 8000),
    cacheTtlMs: num(env.AI_CACHE_TTL_MS, 30 * 60 * 1000),
    cacheMax: num(env.AI_CACHE_MAX, 300),
    circuitThreshold: num(env.AI_CIRCUIT_THRESHOLD, 3),
    circuitCooldownMs: num(env.AI_CIRCUIT_COOLDOWN_MS, 30000),
    circuitMaxCooldownMs: num(env.AI_CIRCUIT_MAX_COOLDOWN_MS, 5 * 60 * 1000),
    disabled: /^(1|true|yes)$/i.test(env.AI_DISABLED || ""),
    ...overrides,
  };
}

function readKeys() {
  const raw = [process.env.GEMINI_API_KEYS, process.env.GEMINI_API_KEY].filter(Boolean).join(",");
  const keys = raw.split(/[\s,;]+/).map((k) => k.trim()).filter((k) => k && !/your[-_ ]?(gemini|api)|changeme|placeholder|xxxx/i.test(k));
  return [...new Set(keys)];
}

/* --------------------------------- state ---------------------------------- */
const state = {
  cooldown: new Map(), // model -> until
  disabledModels: new Map(), // model -> until (404)
  jsonModeOff: new Set(), // models that rejected responseMimeType
  keyCooldown: new Map(), // keyId -> until
  keyDead: new Map(), // keyId -> until (auth failures)
  circuit: { failures: 0, openUntil: 0, probing: false, trips: 0 },
  stats: { requests: 0, success: 0, failures: 0, fallbacks: 0, cacheHits: 0, retries: 0, totalLatencyMs: 0, byModel: {} },
  lastError: null,
  lastErrorAt: 0,
  lastSuccessAt: 0,
  cache: new Map(),
  inflight: new Map(),
  rr: 0,
  active: 0,
  waiters: [],
};

let clientFactory = null; // injectable for tests
const clients = new Map();
const keyId = (k) => crypto.createHash("sha1").update(k).digest("hex").slice(0, 8);

function getClient(key) {
  if (clientFactory) return clientFactory(key);
  if (!GoogleGenAI) return null;
  if (!clients.has(key)) clients.set(key, new GoogleGenAI({ apiKey: key }));
  return clients.get(key);
}

const now = () => Date.now();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------ error handling ----------------------------- */
function parseRetryDelay(msg) {
  const m = String(msg).match(/retry(?:Delay|[ _-]?after)?["':\s]*"?(\d+(?:\.\d+)?)\s*(ms|s|sec|seconds)?/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return m[2] && m[2].toLowerCase() === "ms" ? v : v * 1000;
}

function classify(err) {
  const status = Number(err?.status || err?.statusCode || err?.code || err?.response?.status) || 0;
  const msg = String(err?.message || err || "").toLowerCase();
  const code = String(err?.code || "");
  if (code === "AI_TIMEOUT" || err?.name === "AbortError" || /timed out|timeout|deadline exceeded/.test(msg)) return { type: "timeout", retryable: true };
  if (code === "AI_EMPTY" || code === "AI_BAD_JSON") return { type: "bad_output", retryable: true };
  if (/api key not valid|api_key_invalid|invalid api key|permission denied|unauthenticated|api key expired/.test(msg) || status === 401 || status === 403)
    return { type: "auth", retryable: false };
  if (status === 429 || /resource_exhausted|quota|rate limit|too many requests/.test(msg))
    return { type: "rate_limit", retryable: true, retryAfterMs: parseRetryDelay(err?.message || ""), daily: /per day|daily|perday/.test(msg) };
  if ([500, 502, 503, 504].includes(status) || /unavailable|overloaded|internal error|bad gateway|high demand|try again later|service is currently/.test(msg))
    return { type: "overloaded", retryable: true };
  if (status === 404 || /is not found|not supported for generatecontent|unknown model|models\/.*not found/.test(msg)) return { type: "not_found", retryable: false };
  if (/safety|blocked|prohibited|recitation/.test(msg) && status !== 400) return { type: "blocked", retryable: false };
  if (status === 400 || /invalid argument|invalid_argument|bad request/.test(msg)) return { type: "bad_request", retryable: false };
  if (/fetch failed|econnreset|econnrefused|enotfound|etimedout|socket hang up|network|eai_again|und_err|terminated/.test(msg) || err?.cause?.code) return { type: "network", retryable: true };
  return { type: "unknown", retryable: true };
}

function aiError(reason, detail, extra = {}) {
  const e = new Error(detail || reason);
  e.code = "AI_UNAVAILABLE";
  e.reason = reason;
  Object.assign(e, extra);
  return e;
}

/* ------------------------------ circuit breaker ---------------------------- */
function circuitState() {
  const c = state.circuit;
  if (c.openUntil && now() < c.openUntil) return "open";
  if (c.failures >= cfg().circuitThreshold) return "half-open";
  return "closed";
}
function circuitAllows(force) {
  if (force) return true;
  const s = circuitState();
  if (s === "closed") return true;
  if (s === "half-open" && !state.circuit.probing) {
    state.circuit.probing = true; // exactly one probe request
    return true;
  }
  return false;
}
function circuitSuccess() {
  Object.assign(state.circuit, { failures: 0, openUntil: 0, probing: false, trips: 0 });
}
function circuitFailure() {
  const c = cfg();
  const ci = state.circuit;
  ci.failures += 1;
  ci.probing = false;
  if (ci.failures >= c.circuitThreshold) {
    const cooldown = Math.min(c.circuitMaxCooldownMs, c.circuitCooldownMs * 2 ** ci.trips);
    ci.openUntil = now() + cooldown;
    ci.trips += 1;
  }
}

/* --------------------------- concurrency limiter --------------------------- */
function acquire(timeoutMs) {
  const max = cfg().maxConcurrency;
  if (state.active < max) {
    state.active++;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const w = { resolve, timer: null };
    w.timer = setTimeout(() => {
      state.waiters = state.waiters.filter((x) => x !== w);
      reject(aiError("queue_timeout", "AI queue is full"));
    }, timeoutMs);
    state.waiters.push(w);
  });
}
function release() {
  const next = state.waiters.shift();
  if (next) {
    clearTimeout(next.timer);
    next.resolve(); // slot handed over
  } else state.active = Math.max(0, state.active - 1);
}

/* ---------------------------------- cache ---------------------------------- */
function cacheGet(key) {
  const e = state.cache.get(key);
  if (!e) return null;
  if (e.exp < now()) {
    state.cache.delete(key);
    return null;
  }
  state.cache.delete(key);
  state.cache.set(key, e); // LRU bump
  return e;
}
function cacheSet(key, value, model) {
  const c = cfg();
  state.cache.set(key, { value, model, exp: now() + c.cacheTtlMs });
  while (state.cache.size > c.cacheMax) state.cache.delete(state.cache.keys().next().value);
}

/* ------------------------------ core execution ----------------------------- */
function withTimeout(promise, ms, controller) {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => {
      try { controller?.abort(); } catch (_) {}
      const e = new Error(`AI request timed out after ${ms}ms`);
      e.code = "AI_TIMEOUT";
      rej(e);
    }, ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

function pickKey(keys) {
  const t = now();
  const usable = keys.filter((k) => !((state.keyDead.get(keyId(k)) || 0) > t) && !((state.keyCooldown.get(keyId(k)) || 0) > t));
  if (!usable.length) return null;
  return usable[state.rr++ % usable.length];
}

async function callOnce({ model, key, prompt, json, temperature, timeoutMs }) {
  const client = getClient(key);
  if (!client) throw aiError("not_configured", "Gemini SDK unavailable");
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const config = { temperature };
  if (json && !state.jsonModeOff.has(model)) config.responseMimeType = "application/json";
  if (controller) config.abortSignal = controller.signal;
  const res = await withTimeout(client.models.generateContent({ model, contents: prompt, config }), timeoutMs, controller);
  let text;
  try {
    text = typeof res?.text === "string" ? res.text : res?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
  } catch (_) {
    text = "";
  }
  if (!text || !text.trim()) {
    const e = new Error("Empty response from model");
    e.code = "AI_EMPTY";
    throw e;
  }
  return text;
}

/**
 * Runs the prompt through the fallback chain.
 * @returns {{value:any, model:string, attempts:number, latencyMs:number}}
 */
async function execute(prompt, { json = false, temperature = 0.4, force = false, timeoutMs, parse } = {}) {
  const c = cfg();
  const keys = readKeys();
  if (c.disabled) throw aiError("disabled", "AI disabled by configuration");
  if (!keys.length && !clientFactory) throw aiError("not_configured", "No Gemini API key configured");
  if (!circuitAllows(force)) throw aiError("circuit_open", "Gemini temporarily unavailable (circuit open)", { retryAt: state.circuit.openUntil });

  const started = now();
  let attempts = 0;
  const errors = [];
  let serviceFault = false;
  const attemptTimeout = timeoutMs || c.timeoutMs;
  const budget = force ? Math.min(c.totalBudgetMs, 30000) : c.totalBudgetMs;
  const retries = force ? 1 : c.retriesPerModel;

  try {
    await acquire(c.queueTimeoutMs);
  } catch (e) {
    throw e;
  }
  try {
    const t0 = now();
    const models = c.models.filter((m) => !((state.disabledModels.get(m) || 0) > t0));
    // available first, then ones cooling shortest-first (only if the wait is tiny)
    const available = models.filter((m) => !((state.cooldown.get(m) || 0) > t0));
    const cooling = models.filter((m) => (state.cooldown.get(m) || 0) > t0).sort((a, b) => state.cooldown.get(a) - state.cooldown.get(b));
    const order = [...available, ...cooling.filter((m) => state.cooldown.get(m) - t0 <= 2000)];
    if (!order.length) {
      serviceFault = true;
      throw aiError("all_models_cooling", "All Gemini models are rate-limited right now");
    }

    outer: for (const model of order) {
      for (let attempt = 0; attempt < retries; attempt++) {
        if (now() - started > budget) { errors.push({ model, type: "budget" }); break outer; }
        const key = pickKey(keys) || (clientFactory ? "test-key" : null);
        if (!key) { errors.push({ model, type: "no_key" }); break outer; }
        attempts++;
        state.stats.requests++;
        try {
          const raw = await callOnce({ model, key, prompt, json, temperature, timeoutMs: attemptTimeout });
          const value = parse ? parse(raw) : raw;
          const latencyMs = now() - started;
          state.stats.success++;
          state.stats.totalLatencyMs += latencyMs;
          state.stats.byModel[model] = (state.stats.byModel[model] || 0) + 1;
          state.lastSuccessAt = now();
          circuitSuccess();
          return { value, model, attempts, latencyMs };
        } catch (err) {
          const cls = classify(err);
          state.stats.failures++;
          errors.push({ model, type: cls.type, message: String(err?.message || err).slice(0, 160) });
          state.lastError = cls.type;
          state.lastErrorAt = now();
          if (cls.type !== "bad_request" && cls.type !== "blocked" && cls.type !== "bad_output" && cls.type !== "not_found" && cls.type !== "auth") serviceFault = true;

          if (cls.type === "auth") {
            state.keyDead.set(keyId(key), now() + 10 * 60 * 1000);
            if (pickKey(keys)) { attempt--; continue; } // try another key without burning an attempt
            throw aiError("auth", "Gemini API key rejected", { errors });
          }
          if (cls.type === "not_found") { state.disabledModels.set(model, now() + 60 * 60 * 1000); continue outer; }
          if (cls.type === "bad_request") {
            if (json && !state.jsonModeOff.has(model) && /mime|response_?mime|json/i.test(String(err?.message))) { state.jsonModeOff.add(model); attempt--; continue; }
            continue outer;
          }
          if (cls.type === "blocked") throw aiError("blocked", "Prompt blocked by safety filters", { errors });
          if (cls.type === "rate_limit") {
            const wait = Math.min(cls.daily ? 15 * 60 * 1000 : 10 * 60 * 1000, cls.retryAfterMs ?? 30000);
            if (keys.length > 1) {
              state.keyCooldown.set(keyId(key), now() + wait);
              if (pickKey(keys)) { attempt--; continue; } // rotate to another key on the same model
            }
            state.cooldown.set(model, now() + wait);
            continue outer;
          }
          // transient: back off and retry the same model, then move on
          if (attempt < retries - 1) {
            state.stats.retries++;
            const cap = Math.min(c.backoffMaxMs, c.backoffBaseMs * 2 ** attempt);
            const delay = Math.random() * cap; // full jitter
            if (now() - started + delay > budget) break outer;
            await sleep(delay);
          }
        }
      }
    }
    throw aiError(serviceFault ? "exhausted" : "request_rejected", "All Gemini models failed", { errors });
  } catch (e) {
    if (e.code === "AI_UNAVAILABLE" && ["exhausted", "all_models_cooling"].includes(e.reason)) circuitFailure();
    else if (circuitState() === "half-open") state.circuit.probing = false;
    e.attempts = attempts;
    e.latencyMs = now() - started;
    throw e;
  } finally {
    release();
  }
}

/* --------------------------------- public API ------------------------------ */
async function run(prompt, opts, json) {
  const c = cfg();
  const useCache = opts.cache !== false;
  const key = useCache ? crypto.createHash("sha1").update(`${json ? "j" : "t"}|${prompt}`).digest("hex") : null;
  const meta = opts.meta || {};

  if (key) {
    const hit = cacheGet(key);
    if (hit) {
      state.stats.cacheHits++;
      Object.assign(meta, { source: "cache", model: hit.model, attempts: 0, latencyMs: 0 });
      return hit.value;
    }
    if (state.inflight.has(key)) {
      const r = await state.inflight.get(key);
      Object.assign(meta, { source: "gemini", model: r.model, attempts: r.attempts, latencyMs: r.latencyMs, deduped: true });
      return r.value;
    }
  }
  const promise = execute(prompt, {
    json,
    temperature: opts.temperature ?? 0.4,
    force: !!opts.force,
    timeoutMs: opts.timeoutMs,
    parse: json ? parseLooseJSON : undefined,
  });
  if (key) {
    state.inflight.set(key, promise);
    promise.catch(() => {}).finally(() => state.inflight.delete(key));
  }
  try {
    const r = await promise;
    if (key) cacheSet(key, r.value, r.model);
    Object.assign(meta, { source: "gemini", model: r.model, attempts: r.attempts, latencyMs: r.latencyMs });
    return r.value;
  } catch (err) {
    state.stats.fallbacks++;
    Object.assign(meta, { source: "local", reason: err.reason || err.code || "error", attempts: err.attempts || 0, latencyMs: err.latencyMs || 0 });
    if (typeof opts.fallback === "function") return opts.fallback(err);
    throw err;
  }
}

const generateJSON = (prompt, opts = {}) => run(prompt, opts, true);
const generateContent = (prompt, opts = {}) => run(prompt, opts, false);

function getAIStatus() {
  const c = cfg();
  const keys = readKeys();
  const t = now();
  const cs = circuitState();
  const configured = !c.disabled && (keys.length > 0 || !!clientFactory);
  const models = c.models.map((m) => ({
    name: m,
    state: (state.disabledModels.get(m) || 0) > t ? "unavailable" : (state.cooldown.get(m) || 0) > t ? "cooling" : "ready",
    cooldownSeconds: Math.max(0, Math.ceil(((state.cooldown.get(m) || 0) - t) / 1000)),
    successes: state.stats.byModel[m] || 0,
  }));
  let status = "operational";
  if (!configured) status = "offline_engine";
  else if (cs === "open") status = "offline_engine";
  else if (models.every((m) => m.state !== "ready")) status = "offline_engine";
  else if (cs === "half-open" || models.some((m) => m.state !== "ready") || (state.lastErrorAt && t - state.lastErrorAt < 2 * 60 * 1000 && state.lastErrorAt > state.lastSuccessAt)) status = "degraded";
  const s = state.stats;
  return {
    status,
    configured,
    keys: keys.length,
    circuit: { state: cs, retryInSeconds: cs === "open" ? Math.ceil((state.circuit.openUntil - t) / 1000) : 0, trips: state.circuit.trips },
    models,
    stats: {
      requests: s.requests, success: s.success, failures: s.failures, retries: s.retries,
      fallbacks: s.fallbacks, cacheHits: s.cacheHits, cacheSize: state.cache.size,
      avgLatencyMs: s.success ? Math.round(s.totalLatencyMs / s.success) : 0,
    },
    lastError: state.lastError,
    lastSuccessAt: state.lastSuccessAt || null,
    message:
      status === "operational" ? "Gemini AI is online."
      : status === "degraded" ? "Gemini is under load — retrying and falling back automatically."
      : configured ? "Gemini is busy. The built-in Smart Engine is handling requests so nothing breaks."
      : "No Gemini key configured — running on the built-in Smart Engine.",
  };
}

/** Tiny live probe used by the "Test AI connection" button. */
async function pingAI() {
  const meta = {};
  try {
    const text = await generateContent("Reply with exactly: OK", { cache: false, force: true, temperature: 0, meta, timeoutMs: 12000 });
    return { ok: /ok/i.test(String(text)), meta };
  } catch (e) {
    return { ok: false, meta, reason: e.reason || e.code || "error" };
  }
}

/* -------------------------------- test hooks -------------------------------- */
function __configure(o) { overrides = { ...overrides, ...o }; }
function __setClientFactory(f) { clientFactory = f; clients.clear(); }
function __reset() {
  overrides = {};
  clientFactory = null;
  clients.clear();
  state.cooldown.clear(); state.disabledModels.clear(); state.jsonModeOff.clear();
  state.keyCooldown.clear(); state.keyDead.clear(); state.cache.clear(); state.inflight.clear();
  Object.assign(state.circuit, { failures: 0, openUntil: 0, probing: false, trips: 0 });
  Object.assign(state.stats, { requests: 0, success: 0, failures: 0, fallbacks: 0, cacheHits: 0, retries: 0, totalLatencyMs: 0, byModel: {} });
  state.lastError = null; state.lastErrorAt = 0; state.lastSuccessAt = 0; state.active = 0; state.waiters = [];
}

module.exports = { generateContent, generateJSON, getAIStatus, pingAI, __configure, __setClientFactory, __reset, classify };
