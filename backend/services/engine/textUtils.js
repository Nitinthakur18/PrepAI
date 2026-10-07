/** Small, dependency-free NLP helpers used by the Smart Engine. */

const STOPWORDS = new Set(
  (
    "a about above after again against all also am an and any are aren't as at be because been before being below between both but by " +
    "can can't cannot could couldn't did didn't do does doesn't doing don't down during each few for from further had hadn't has hasn't have haven't " +
    "having he her here hers herself him himself his how i if in into is isn't it its itself just let's me more most mustn't my myself no nor not of off on " +
    "once only or other our ours ourselves out over own same she should shouldn't so some such than that the their theirs them themselves then there these " +
    "they this those through to too under until up very was wasn't we were weren't what when where which while who whom why will with won't would wouldn't " +
    "you your yours yourself yourselves etc eg ie via per within across along among around may might must shall upon whether either neither yet still " +
    "get gets got getting make makes made making use uses used using take takes taken new one two three well like able"
  ).split(/\s+/)
);

// Words that show up in nearly every job post and carry no matching signal.
const GENERIC_JD_WORDS = new Set(
  (
    "experience experienced years year work working works team teams ability strong skills skill knowledge understanding required requirement requirements " +
    "preferred responsibilities responsibility qualifications qualification role roles position positions company companies join looking candidate candidates " +
    "including include includes ensure support supporting develop developing development environment opportunity opportunities excellent good great " +
    "plus bonus nice description summary overview job jobs apply application applicants benefits salary location remote hybrid onsite full time part " +
    "etc related relevant similar various multiple key high level highly proven demonstrated successful success impact drive driven passion passionate " +
    "collaborate collaborating collaboration communicate communication solutions solution business customers customer clients client product products " +
    "services service systems system tools tool technologies technology technical software based across across new day days week weeks month months " +
    "help helping within ideal looking seeking hiring everyone someone anyone every without least minimum degree equivalent need needs needed " +
    "perform performing provide providing build building create creating design designing maintain maintaining manage managing lead leading " +
    "proficiency proficient familiarity familiar bachelor bachelors master masters equivalent computer science engineering graduate applications application " +
    "pipelines pipeline features feature flows flow stack fast growing startup snacks flexible hours credits designers managers"
  ).split(/\s+/)
);

const LIGATURES = { "ﬁ": "fi", "ﬂ": "fl", "ﬀ": "ff", "ﬃ": "ffi", "ﬄ": "ffl" };

/** Normalises text extracted from PDFs/DOCX into something predictable. */
function cleanText(raw) {
  if (!raw) return "";
  let t = String(raw).normalize("NFKC");
  t = t.replace(/[ﬁﬂﬀﬃﬄ]/g, (m) => LIGATURES[m] || m);
  t = t.replace(/\r\n?/g, "\n");
  t = t.replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "");
  t = t.replace(/[\u00A0\u2000-\u200A\u202F\u205F\u3000\t]/g, " ");
  // Normalise assorted bullet glyphs at the start of a line.
  t = t.replace(/^[ \t]*[•●▪◦■□➢➤✔✓►‣⁃∙·○▶❖*]\s*/gm, "• ");
  // Re-join words that were hyphenated across a line break.
  t = t.replace(/(\w)-\n(?=[a-z])/g, "$1");
  t = t
    .split("\n")
    .map((l) => l.replace(/[ ]{2,}/g, " ").trimEnd())
    .join("\n");
  t = t.replace(/\n{3,}/g, "\n\n");
  return t.trim();
}

function tokenize(text) {
  if (!text) return [];
  const m = String(text)
    .toLowerCase()
    .match(/[a-z][a-z0-9+#]*(?:[.\-][a-z0-9+#]+)*/g);
  return m || [];
}

/** Very light stemmer — enough to equate "managed/managing/managers". */
function stem(w) {
  let s = w.toLowerCase();
  if (s.length <= 4) return s;
  s = s.replace(/ies$/, "y");
  s = s.replace(/(ing|ed|es|s|er|ers|ly)$/, (m, g, offset) => (offset >= 3 ? "" : m));
  return s;
}

function sentences(text) {
  if (!text) return [];
  return String(text)
    .replace(/\n+/g, ". ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9•])/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length >= 3);
}

function wordCount(text) {
  if (!text) return 0;
  const m = String(text).match(/\S+/g);
  return m ? m.length : 0;
}

function termFreq(tokens, { stopwords = true, stemmed = true } = {}) {
  const tf = new Map();
  for (const tok of tokens) {
    if (tok.length < 2) continue;
    if (stopwords && STOPWORDS.has(tok)) continue;
    const k = stemmed ? stem(tok) : tok;
    tf.set(k, (tf.get(k) || 0) + 1);
  }
  return tf;
}

function cosine(tfA, tfB) {
  let dot = 0;
  let nA = 0;
  let nB = 0;
  for (const [, v] of tfA) nA += v * v;
  for (const [, v] of tfB) nB += v * v;
  for (const [k, v] of tfA) {
    const o = tfB.get(k);
    if (o) dot += v * o;
  }
  if (!nA || !nB) return 0;
  return dot / (Math.sqrt(nA) * Math.sqrt(nB));
}

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const round1 = (n) => Math.round(n * 10) / 10;
const uniq = (arr) => [...new Set(arr)];

function pick(arr, n, rand = Math.random) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a.slice(0, n);
}

function titleCase(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/(^|[\s\-/(])([a-z])/g, (m, p, c) => p + c.toUpperCase());
}

module.exports = {
  STOPWORDS,
  GENERIC_JD_WORDS,
  cleanText,
  tokenize,
  stem,
  sentences,
  wordCount,
  termFreq,
  cosine,
  clamp,
  round1,
  uniq,
  pick,
  titleCase,
};
