/**
 * Tolerant JSON parsing for LLM output: strips markdown fences, extracts the
 * first balanced object/array, removes trailing commas and closes truncated JSON.
 */
function stripFences(s) {
  return String(s)
    .replace(/^\uFEFF/, "")
    .replace(/```(?:json|JSON)?\s*/g, "")
    .replace(/```/g, "")
    .trim();
}

function extractBalanced(s) {
  const start = s.search(/[{[]/);
  if (start === -1) return null;
  const stack = [];
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") {
      stack.pop();
      if (!stack.length) return { text: s.slice(start, i + 1), complete: true };
    }
  }
  return { text: s.slice(start), complete: false, stack, inStr };
}

function closeTruncated(text) {
  let inStr = false;
  let esc = false;
  const stack = [];
  for (const ch of text) {
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{" || ch === "[") stack.push(ch);
    else if (ch === "}" || ch === "]") stack.pop();
  }
  let out = text;
  if (inStr) out += '"';
  out = out.replace(/[\s,]+$/, "");
  if (/:\s*$/.test(out)) out += "null";
  // drop a dangling key with no value:  {"a":1,"b"
  out = out.replace(/,\s*"[^"]*"\s*$/, "");
  while (stack.length) out += stack.pop() === "{" ? "}" : "]";
  return out;
}

const removeTrailingCommas = (s) => s.replace(/,\s*([}\]])/g, "$1");
const fixSmartQuotes = (s) => s.replace(/[\u201C\u201D]/g, '"').replace(/[\u2018\u2019]/g, "'");

function parseLooseJSON(input) {
  if (input && typeof input === "object") return input;
  const raw = stripFences(input ?? "");
  if (!raw) throw new Error("Empty response");
  const attempts = [];
  attempts.push(() => JSON.parse(raw));
  const ex = extractBalanced(raw);
  if (ex) {
    attempts.push(() => JSON.parse(ex.text));
    attempts.push(() => JSON.parse(removeTrailingCommas(ex.text)));
    attempts.push(() => JSON.parse(removeTrailingCommas(fixSmartQuotes(ex.text))));
    if (!ex.complete) attempts.push(() => JSON.parse(removeTrailingCommas(closeTruncated(ex.text))));
  }
  let lastErr;
  for (const fn of attempts) {
    try {
      const v = fn();
      if (v !== null && typeof v === "object") return v;
    } catch (e) {
      lastErr = e;
    }
  }
  const err = new Error(`Could not parse JSON: ${lastErr ? lastErr.message : "unknown"}`);
  err.code = "AI_BAD_JSON";
  throw err;
}

module.exports = { parseLooseJSON, stripFences };
