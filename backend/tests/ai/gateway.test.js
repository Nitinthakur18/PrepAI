const gemini = require("../../utils/gemini");

const err = (status, message) => Object.assign(new Error(message || `HTTP ${status}`), { status });
const ok = (text) => ({ text });

function fake(script) {
  const calls = [];
  gemini.__setClientFactory(() => ({
    models: {
      generateContent: async (req) => {
        calls.push(req.model);
        return script(req.model, calls.length);
      },
    },
  }));
  return calls;
}

beforeEach(() => {
  gemini.__reset();
  gemini.__configure({
    models: ["m1", "m2", "m3"], backoffBaseMs: 1, backoffMaxMs: 3, timeoutMs: 200,
    totalBudgetMs: 3000, circuitThreshold: 2, circuitCooldownMs: 60000, retriesPerModel: 2,
  });
});
afterAll(() => gemini.__reset());

describe("Gemini gateway resilience", () => {
  test("returns parsed JSON on first success and reports metadata", async () => {
    fake(() => ok('```json\n{"hello":"world",}\n```'));
    const meta = {};
    await expect(gemini.generateJSON("p1", { meta })).resolves.toEqual({ hello: "world" });
    expect(meta).toMatchObject({ source: "gemini", model: "m1", attempts: 1 });
  });

  test("retries a 503 on the same model and succeeds", async () => {
    const calls = fake((m, n) => (n === 1 ? (() => { throw err(503, "model overloaded"); })() : ok('{"a":1}')));
    await expect(gemini.generateJSON("p2")).resolves.toEqual({ a: 1 });
    expect(calls).toEqual(["m1", "m1"]);
  });

  test("falls through to the next model on 429 and cools the limited model down", async () => {
    const calls = fake((m) => {
      if (m === "m1") throw err(429, "RESOURCE_EXHAUSTED quota");
      return ok('{"from":"' + m + '"}');
    });
    await expect(gemini.generateJSON("p3")).resolves.toEqual({ from: "m2" });
    expect(calls).toEqual(["m1", "m2"]);
    const status = gemini.getAIStatus();
    expect(status.models.find((x) => x.name === "m1").state).toBe("cooling");
    // Next request skips the cooling model entirely
    calls.length = 0;
    await gemini.generateJSON("p3b");
    expect(calls[0]).toBe("m2");
  });

  test("a 404 model is disabled and skipped", async () => {
    const calls = fake((m) => { if (m === "m1") throw err(404, "models/m1 is not found"); return ok('{"ok":true}'); });
    await gemini.generateJSON("p4");
    expect(gemini.getAIStatus().models.find((x) => x.name === "m1").state).toBe("unavailable");
    expect(calls).toEqual(["m1", "m2"]);
  });

  test("retries when the model returns invalid JSON", async () => {
    const calls = fake((m, n) => (n === 1 ? ok("I'm sorry, here is no json") : ok('{"fixed":true}')));
    await expect(gemini.generateJSON("p5")).resolves.toEqual({ fixed: true });
    expect(calls.length).toBe(2);
  });

  test("times out a hung request and moves on", async () => {
    fake((m) => (m === "m1" ? new Promise(() => {}) : ok('{"fast":true}')));
    gemini.__configure({ timeoutMs: 40, retriesPerModel: 1 });
    await expect(gemini.generateJSON("p6")).resolves.toEqual({ fast: true });
  });

  test("total outage throws AI_UNAVAILABLE, then the circuit opens and fails fast", async () => {
    const calls = fake(() => { throw err(503, "UNAVAILABLE"); });
    await expect(gemini.generateJSON("o1", { cache: false })).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
    await expect(gemini.generateJSON("o2", { cache: false })).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
    expect(gemini.getAIStatus().circuit.state).toBe("open");
    const before = calls.length;
    const t = Date.now();
    await expect(gemini.generateJSON("o3", { cache: false })).rejects.toMatchObject({ reason: "circuit_open" });
    expect(calls.length).toBe(before); // no network calls while open
    expect(Date.now() - t).toBeLessThan(50);
    expect(gemini.getAIStatus().status).toBe("offline_engine");
  });

  test("force bypasses an open circuit and recovery closes it", async () => {
    let down = true;
    fake(() => { if (down) throw err(503, "UNAVAILABLE"); return ok('{"up":true}'); });
    await expect(gemini.generateJSON("r1", { cache: false })).rejects.toBeTruthy();
    await expect(gemini.generateJSON("r2", { cache: false })).rejects.toBeTruthy();
    expect(gemini.getAIStatus().circuit.state).toBe("open");
    down = false;
    await expect(gemini.generateJSON("r3", { cache: false, force: true })).resolves.toEqual({ up: true });
    expect(gemini.getAIStatus().circuit.state).toBe("closed");
  });

  test("caches identical prompts and de-duplicates concurrent ones", async () => {
    const calls = fake(async () => { await new Promise((r) => setTimeout(r, 20)); return ok('{"v":1}'); });
    const [a, b] = await Promise.all([gemini.generateJSON("same"), gemini.generateJSON("same")]);
    expect(a).toEqual(b);
    expect(calls.length).toBe(1);
    const meta = {};
    await gemini.generateJSON("same", { meta });
    expect(meta.source).toBe("cache");
    expect(calls.length).toBe(1);
  });

  test("the fallback option is used instead of throwing", async () => {
    fake(() => { throw err(503, "UNAVAILABLE"); });
    const meta = {};
    const v = await gemini.generateJSON("f1", { cache: false, meta, fallback: () => ({ local: true }) });
    expect(v).toEqual({ local: true });
    expect(meta.source).toBe("local");
  });

  test("auth failure on a single key stops quickly with reason=auth", async () => {
    const calls = fake(() => { throw err(403, "API key not valid. Please pass a valid API key."); });
    await expect(gemini.generateJSON("a1", { cache: false })).rejects.toMatchObject({ reason: "auth" });
    expect(calls.length).toBe(1);
  });

  test("limits concurrency", async () => {
    gemini.__configure({ maxConcurrency: 2 });
    let active = 0; let peak = 0;
    fake(async () => { active++; peak = Math.max(peak, active); await new Promise((r) => setTimeout(r, 25)); active--; return ok('{"x":1}'); });
    await Promise.all(Array.from({ length: 6 }, (_, i) => gemini.generateJSON("c" + i)));
    expect(peak).toBeLessThanOrEqual(2);
  });

  test("not configured => AI_UNAVAILABLE(not_configured) without crashing", async () => {
    gemini.__reset();
    const prev = { a: process.env.GEMINI_API_KEY, b: process.env.GEMINI_API_KEYS };
    delete process.env.GEMINI_API_KEY; delete process.env.GEMINI_API_KEYS;
    await expect(gemini.generateJSON("n1")).rejects.toMatchObject({ reason: "not_configured" });
    expect(gemini.getAIStatus().configured).toBe(false);
    if (prev.a) process.env.GEMINI_API_KEY = prev.a;
    if (prev.b) process.env.GEMINI_API_KEYS = prev.b;
  });
});
