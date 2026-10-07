/**
 * Offline resume parser. Turns raw extracted text into structured facts:
 * contact info, sections, bullets, dates → years of experience, education,
 * quantified achievements, action verbs, weak phrases, and skills.
 */
const { cleanText, wordCount, uniq, clamp, round1 } = require("./textUtils");
const { findSkills, findSoftSkills } = require("./skills");

/* ------------------------------------------------------------------ */
/* Section headings                                                    */
/* ------------------------------------------------------------------ */
const HEADING_ALIASES = {
  summary: [
    "summary", "professional summary", "career summary", "executive summary", "profile",
    "professional profile", "personal profile", "about me", "about", "objective",
    "career objective", "professional objective", "personal statement", "overview",
  ],
  experience: [
    "experience", "work experience", "professional experience", "employment history",
    "work history", "employment", "career history", "relevant experience", "industry experience",
    "internships", "internship experience", "internship", "professional background",
    "work experience and internships", "experience and internships", "experience and projects",
  ],
  education: [
    "education", "academic background", "academics", "educational background", "education and training",
    "academic qualifications", "qualifications", "educational qualifications", "academic details",
    "education and certifications", "academic profile",
  ],
  skills: [
    "skills", "technical skills", "key skills", "core skills", "core competencies", "competencies",
    "skills and tools", "tools and technologies", "technologies", "technical proficiencies",
    "technical expertise", "areas of expertise", "skills and abilities", "skills summary",
    "technical skills and tools", "skills and technologies", "tech stack", "skill set", "expertise",
    "skills and interests",
  ],
  projects: [
    "projects", "personal projects", "academic projects", "key projects", "selected projects",
    "side projects", "project experience", "notable projects", "technical projects", "major projects",
    "projects and open source", "open source projects",
  ],
  certifications: [
    "certifications", "certificates", "licenses and certifications", "courses", "training",
    "courses and certifications", "certifications and courses", "professional certifications",
    "licenses", "online courses", "training and certifications",
  ],
  achievements: [
    "achievements", "awards", "honors", "awards and honors", "accomplishments", "honors and awards",
    "achievements and awards", "awards and achievements", "recognition", "extracurricular",
    "extracurricular activities", "activities", "leadership", "positions of responsibility",
    "leadership and activities", "co-curricular activities",
  ],
  languages: ["languages", "language proficiency", "spoken languages"],
  interests: ["interests", "hobbies", "hobbies and interests", "personal interests"],
  publications: ["publications", "research", "research experience", "papers"],
  volunteer: ["volunteer", "volunteering", "volunteer experience", "community service"],
  references: ["references"],
};

const HEADING_LOOKUP = new Map();
for (const [key, list] of Object.entries(HEADING_ALIASES)) {
  for (const a of list) HEADING_LOOKUP.set(a, key);
}

function normalizeHeading(line) {
  return line
    .replace(/^[•*#\-–—_\s]+/, "")
    .replace(/[:\-–—_|•*#\s]+$/, "")
    .replace(/&/g, " and ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function matchHeading(line) {
  const t = normalizeHeading(line);
  if (!t || t.length > 48) return null;
  return HEADING_LOOKUP.get(t) || null;
}

/* ------------------------------------------------------------------ */
/* Verbs & phrases                                                     */
/* ------------------------------------------------------------------ */
const STRONG_VERBS = new Set(
  (
    "achieve accelerate accomplish administer advise analyze analyse architect audit authored automate boost build calculate championed " +
    "collaborate compile complete conceive conduct configure consolidate construct consult contribute convert coordinate create cut " +
    "debug decrease define deliver deploy design detect develop devise diagnose direct discover document drive earn edit enable enforce " +
    "engineer enhance ensure establish evaluate exceed execute expand expedite facilitate finalize forecast formulate found generate guide " +
    "identify implement improve increase influence initiate innovate inspect install instruct integrate introduce investigate launch lead " +
    "leverage maintain manage map master maximize measure mentor migrate minimize model modernize monitor motivate negotiate operate " +
    "optimize orchestrate organize originate outperform overhaul oversee own partner perform pilot pioneer plan present prioritize produce " +
    "program promote prototype provision publish raise rebuild recommend reduce refactor refine reengineer regulate reinforce release " +
    "replace report research resolve restructure retrieve revamp review revise save scale schedule secure select serve shape ship simplify " +
    "solve spearhead standardize streamline strengthen structure succeed supervise support surpass sustain synthesize systematize target " +
    "teach test train transform translate troubleshoot unify upgrade validate verify visualize win write " +
    "built led ran drove wrote won taught grew spoke chose sold"
  ).split(/\s+/)
);

const IRREGULAR = { built: "build", led: "lead", ran: "run", drove: "drive", wrote: "write", won: "win", taught: "teach", grew: "grow", sold: "sell", chose: "choose", spoke: "speak", got: "get", made: "make" };

function verbBase(word) {
  const w = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!w) return null;
  if (STRONG_VERBS.has(w)) return IRREGULAR[w] || w;
  const cands = [
    w.replace(/ied$/, "y"), w.replace(/ed$/, ""), w.replace(/d$/, ""), w.replace(/ing$/, ""),
    w.replace(/ing$/, "e"), w.replace(/ies$/, "y"), w.replace(/es$/, ""), w.replace(/s$/, ""),
    w.replace(/([b-df-hj-np-tv-z])\1(ed|ing)$/, "$1"),
  ];
  for (const c of cands) if (c !== w && STRONG_VERBS.has(c)) return c;
  return null;
}

const WEAK_PHRASES = [
  "responsible for", "duties included", "duties include", "worked on", "helped with", "helped to", "helped in",
  "assisted with", "assisted in", "involved in", "participated in", "tasked with", "in charge of", "was part of",
  "was responsible", "exposure to", "familiar with", "worked with", "team player", "various tasks", "etc.",
];

const BUZZWORDS = [
  "hard-working", "hardworking", "hard working", "team player", "go-getter", "results-driven", "results driven",
  "self-motivated", "think outside the box", "synergy", "dynamic", "passionate", "highly motivated",
  "proven track record", "excellent communication skills", "fast learner", "quick learner", "detail-oriented",
  "go getter", "people person", "strategic thinker", "self starter", "self-starter",
];

const METRIC_PATTERNS = [
  /\d+(?:\.\d+)?\s?%/,
  /[$₹€£]\s?\d[\d,.]*\s?(?:k|m|b|bn|mn|lakh|lakhs|crore|crores|million|billion|thousand)?/i,
  /\b\d+(?:\.\d+)?\s?x\b/i,
  /\b\d[\d,]*\+?\s?(?:k|m)\b\+?/i,
  /\b\d[\d,]*\+?\s+(?:users|customers|clients|requests|projects|members|engineers|developers|students|employees|people|endpoints|tests|repos|repositories|apis|services|pages|records|transactions|downloads|visitors|leads|accounts|stores|countries|teams|applications|apps|features|releases|ms|milliseconds|seconds|hours|days|weeks|months)\b/i,
  /\b(?:reduced|increased|improved|decreased|grew|boosted|cut|saved|generated|raised|doubled|tripled|halved)\b[^.]{0,60}\b\d/i,
];

const hasMetric = (s) => METRIC_PATTERNS.some((re) => re.test(s));

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */
const MONTHS = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, sept: 8, oct: 9, nov: 10, dec: 11 };
const MON = "(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)";
const DATE = `(?:${MON}\\.?\\s*,?\\s*(?:19|20)\\d{2}|\\d{1,2}\\s*[/.-]\\s*(?:19|20)\\d{2}|(?:19|20)\\d{2})`;
const END = `(?:${DATE}|present|current|currently|now|ongoing|till\\s+date|to\\s+date|today)`;
const RANGE_RE = new RegExp(`(${DATE})\\s*(?:-|–|—|to|until|till)\\s*(${END})`, "gi");

function toMonthIndex(token, now) {
  const t = token.toLowerCase().trim();
  if (/^(present|current|currently|now|ongoing|today|till\s+date|to\s+date)$/.test(t)) {
    return now.getFullYear() * 12 + now.getMonth();
  }
  let m = t.match(new RegExp(`(${MON})\\.?\\s*,?\\s*((?:19|20)\\d{2})`, "i"));
  if (m) return parseInt(m[2], 10) * 12 + (MONTHS[m[1].slice(0, 3).toLowerCase()] ?? 0);
  m = t.match(/(\d{1,2})\s*[/.-]\s*((?:19|20)\d{2})/);
  if (m) return parseInt(m[2], 10) * 12 + clamp(parseInt(m[1], 10) - 1, 0, 11);
  m = t.match(/((?:19|20)\d{2})/);
  if (m) return parseInt(m[1], 10) * 12 + 6; // year only → mid-year
  return null;
}

function parseDateRanges(text, now = new Date()) {
  const ranges = [];
  let m;
  RANGE_RE.lastIndex = 0;
  while ((m = RANGE_RE.exec(text))) {
    const s = toMonthIndex(m[1], now);
    const e = toMonthIndex(m[2], now);
    if (s == null || e == null) continue;
    if (e < s || e - s > 12 * 45) continue;
    ranges.push({ start: s, end: e, raw: m[0] });
  }
  return ranges;
}

function totalMonths(ranges) {
  if (!ranges.length) return 0;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  let total = 0;
  let curS = sorted[0].start;
  let curE = sorted[0].end;
  for (let i = 1; i < sorted.length; i++) {
    const r = sorted[i];
    if (r.start <= curE) curE = Math.max(curE, r.end);
    else {
      total += curE - curS;
      curS = r.start;
      curE = r.end;
    }
  }
  total += curE - curS;
  return total;
}

/* ------------------------------------------------------------------ */
/* Contact                                                             */
/* ------------------------------------------------------------------ */
function extractContact(text) {
  const head = text.split("\n").slice(0, 14).join("\n");
  const scope = head + "\n" + text;
  const email = (scope.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/) || [])[0] || null;

  let phone = null;
  const phoneCands = scope.match(/(?:\+?\d[\d\s().-]{8,18}\d)/g) || [];
  for (const c of phoneCands) {
    const digits = c.replace(/\D/g, "");
    if (digits.length >= 10 && digits.length <= 15 && !/^(19|20)\d{2}\s?[-–]/.test(c.trim())) {
      phone = c.trim();
      break;
    }
  }

  const linkedin = (scope.match(/(?:https?:\/\/)?(?:[a-z]{2,3}\.)?linkedin\.com\/(?:in|pub)\/[\w\-%]+/i) || [])[0] || null;
  const github = (scope.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/[\w\-]+/i) || [])[0] || null;
  const urls = (scope.match(/(?:https?:\/\/|www\.)[^\s)>,]+/gi) || []).filter(
    (u) => !/linkedin\.com|github\.com/i.test(u)
  );
  const website = urls[0] || null;

  let location = null;
  const locM = head.match(/\b([A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?),\s*([A-Z]{2}\b|[A-Z][a-zA-Z]+(?: [A-Z][a-zA-Z]+)?)/);
  if (locM && !/@/.test(locM[0])) location = locM[0];

  return { email, phone, linkedin, github, website, location };
}

function guessName(lines) {
  for (const raw of lines.slice(0, 6)) {
    const l = raw.trim();
    if (!l || l.length > 40) continue;
    if (/@|\d|http|www\.|linkedin|github/i.test(l)) continue;
    if (matchHeading(l)) continue;
    const words = l.split(/\s+/);
    if (words.length < 2 || words.length > 4) continue;
    if (!words.every((w) => /^[A-Za-z][A-Za-z.'\-]*$/.test(w))) continue;
    return l;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Education                                                           */
/* ------------------------------------------------------------------ */
const DEGREES = [
  { level: 5, label: "PhD", re: /\b(ph\.?\s?d\.?|doctorate|doctor of philosophy)\b/i },
  { level: 4, label: "Master's", re: /\b(master(?:'s)?(?:\s+of)?|m\.?\s?tech|m\.?\s?sc|mba|mca|m\.?\s?eng|m\.?\s?phil|post\s?graduate)\b/i },
  { level: 4, label: "Master's", re: /\b(M\.E\.?|M\.S\.?|M\.A\.?|M\.Com\.?|MSc|MTech|MS)\b(?=[\s,.(\-–]|$)/ },
  { level: 3, label: "Bachelor's", re: /\b(bachelor(?:'s)?(?:\s+of)?|b\.?\s?tech|b\.?\s?sc|b\.?\s?eng|bca|bba|b\.?\s?com|undergraduate)\b/i },
  { level: 3, label: "Bachelor's", re: /\b(B\.E\.?|B\.S\.?|B\.A\.?|BE|BS|BA|BTech|BSc)\b(?=[\s,.(\-–]|$)/ },
  { level: 2, label: "Diploma / Associate", re: /\b(diploma|associate degree|polytechnic)\b/i },
  { level: 1, label: "High School", re: /\b(high school|higher secondary|12th|10th|hsc|ssc|cbse|icse|intermediate)\b/i },
];

function parseEducation(sectionText, fullText) {
  const scope = sectionText && sectionText.trim() ? sectionText : fullText;
  let best = null;
  const degrees = [];
  for (const d of DEGREES) {
    if (d.re.test(scope)) {
      degrees.push(d.label);
      if (!best || d.level > best.level) best = d;
    }
  }
  const gpaM = scope.match(/\b(cgpa|gpa|grade|percentage|score)\s*[:\-]?\s*(\d+(?:\.\d+)?)(?:\s*\/\s*(\d+(?:\.\d+)?))?\s*(%)?/i);
  let gpa = null;
  if (gpaM) gpa = { value: parseFloat(gpaM[2]), scale: gpaM[3] ? parseFloat(gpaM[3]) : gpaM[4] ? 100 : null, raw: gpaM[0] };
  const inst = (scope.match(/[^\n,|]*\b(university|college|institute|school of|academy|iit|nit|iiit|bits)\b[^\n,|]*/i) || [])[0];
  const years = (scope.match(/\b(?:19|20)\d{2}\b/g) || []).length;
  return {
    degrees: uniq(degrees),
    level: best ? best.level : 0,
    levelLabel: best ? best.label : null,
    institution: inst ? inst.trim().slice(0, 90) : null,
    hasYears: years > 0,
    gpa,
  };
}

/* ------------------------------------------------------------------ */
/* Main parse                                                          */
/* ------------------------------------------------------------------ */
function splitSections(lines) {
  const sections = {};
  let current = "header";
  sections.header = { heading: null, lines: [] };
  lines.forEach((line, idx) => {
    let key = matchHeading(line);
    // "Languages" inside a Skills block is a sub-label ("Languages: C, Java"), not a new section.
    if (key === "languages" && (current === "skills" || current === "header")) key = null;
    if (key && line.trim().length <= 48) {
      current = key;
      if (!sections[key]) sections[key] = { heading: line.trim(), startLine: idx, lines: [] };
      return;
    }
    sections[current].lines.push(line);
  });
  for (const s of Object.values(sections)) {
    s.text = s.lines.join("\n").trim();
    s.wordCount = wordCount(s.text);
  }
  return sections;
}

const isBulletLine = (l) => /^\s*(?:•|[-–—*▪◦]\s|\d+[.)]\s)/.test(l);
const stripBullet = (l) => l.replace(/^\s*(?:•|[-–—*▪◦]|\d+[.)])\s*/, "").trim();

function extractStatements(sections) {
  const bullets = [];
  const pushFrom = (secKey) => {
    const sec = sections[secKey];
    if (!sec) return;
    const lines = sec.lines;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i].trim();
      if (!l) continue;
      if (isBulletLine(l)) {
        // join wrapped continuation lines (non-bullet, lowercase start)
        let text = stripBullet(l);
        while (i + 1 < lines.length) {
          const n = lines[i + 1].trim();
          if (!n || isBulletLine(n) || /^[A-Z]/.test(n) || RANGE_RE.test(n)) break;
          RANGE_RE.lastIndex = 0;
          text += " " + n;
          i++;
        }
        RANGE_RE.lastIndex = 0;
        if (text.split(/\s+/).length >= 3) bullets.push({ text, section: secKey });
      } else {
        // PDFs frequently lose bullet glyphs: treat sentence-like lines as statements
        const words = l.split(/\s+/).length;
        RANGE_RE.lastIndex = 0;
        const looksLikeDate = RANGE_RE.test(l);
        RANGE_RE.lastIndex = 0;
        if (words >= 7 && /^[A-Z]/.test(l) && !looksLikeDate && !/\|/.test(l)) {
          bullets.push({ text: l, section: secKey, implicit: true });
        }
      }
    }
  };
  ["experience", "projects", "volunteer", "achievements"].forEach(pushFrom);
  return bullets;
}

function countPhrases(text, phrases) {
  const lower = text.toLowerCase();
  const found = [];
  for (const p of phrases) {
    const re = new RegExp(`(?<![a-z])${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z])`, "g");
    const m = lower.match(re);
    if (m) found.push({ phrase: p, count: m.length });
  }
  return found;
}

function parseResume(rawText, { now = new Date() } = {}) {
  const text = cleanText(rawText);
  const lines = text.split("\n");
  const sections = splitSections(lines);
  const contact = extractContact(text);
  const name = guessName(lines);

  const technical = findSkills(text);
  const soft = findSoftSkills(text);

  // Years of experience: prefer date ranges inside the experience section.
  const expText = sections.experience?.text || "";
  let ranges = expText ? parseDateRanges(expText, now) : [];
  if (!ranges.length) {
    const eduText = sections.education?.text || "";
    const scopeText = text.replace(eduText, "").replace(sections.projects?.text || "", "");
    ranges = expText ? [] : parseDateRanges(scopeText, now);
  }
  const computedYears = round1(totalMonths(ranges) / 12);
  const statedM = text.match(/(\d{1,2})\+?\s*(?:years?|yrs?)\s+(?:of\s+)?(?:professional\s+|relevant\s+|industry\s+|work\s+)?experience/i);
  const statedYears = statedM ? parseInt(statedM[1], 10) : null;
  let years = computedYears;
  if (statedYears != null && statedYears <= 45 && (computedYears === 0 || Math.abs(statedYears - computedYears) <= 2)) {
    years = Math.max(computedYears, statedYears);
  }
  years = clamp(years, 0, 45);

  const statements = extractStatements(sections);
  const withVerb = statements.filter((s) => verbBase(s.text.split(/\s+/)[0]));
  const quantified = statements.filter((s) => hasMetric(s.text));
  const verbsUsed = uniq(withVerb.map((s) => verbBase(s.text.split(/\s+/)[0])));

  const weakFound = countPhrases(text, WEAK_PHRASES);
  const buzzFound = countPhrases(text, BUZZWORDS);
  const pronouns = (text.match(/\b(I|me|my|myself)\b/g) || []).length;

  const education = parseEducation(sections.education?.text, text);

  const certLines = (sections.certifications?.lines || []).filter((l) => l.trim().length > 3);
  const certMentions = (text.match(/\b(certified|certification|certificate)\b/gi) || []).length;

  const projLines = (sections.projects?.lines || []).map((l) => l.trim()).filter(Boolean);
  const urlRe = /(?:https?:\/\/|www\.|\b[a-z0-9-]+\.(?:app|io|dev|com|in|org|net|ai|vercel\.app|netlify\.app)\b|github\.com)/i;
  const techLine = (l) => !!l && !isBulletLine(l) && l.split(/\s+/).length <= 18 && (/[·|•]/.test(l) || findSkills(l).length >= 2);
  let projectCount = 0;
  for (let i = 0; i < projLines.length; i++) {
    const l = projLines[i];
    if (isBulletLine(l) || /[.,;:]$/.test(l) || l.split(/\s+/).length > 10) continue;
    if (urlRe.test(l) || techLine(projLines[i + 1])) projectCount++;
  }
  if (!projectCount && (sections.projects?.wordCount || 0) >= 40) projectCount = 1;

  const urls = (text.match(/(?:https?:\/\/|www\.)[^\s)>,]+/gi) || []).length;
  const nonAscii = (text.match(/[^\x00-\x7F]/g) || []).length;
  const sectionKeys = Object.keys(sections).filter((k) => k !== "header" && sections[k].text);

  return {
    text,
    lines,
    wordCount: wordCount(text),
    name,
    contact,
    sections,
    sectionKeys,
    technicalSkills: technical,
    softSkills: soft,
    years,
    yearsFromDates: computedYears,
    dateRanges: ranges.length,
    education,
    statements,
    bullets: statements.filter((s) => !s.implicit),
    statementsWithVerb: withVerb.length,
    verbsUsed,
    quantifiedCount: quantified.length,
    quantifiedExamples: quantified.slice(0, 3).map((s) => s.text),
    weakPhrases: weakFound,
    buzzwords: buzzFound,
    pronouns,
    certifications: Math.max(certLines.length, certMentions),
    projectCount,
    urls,
    nonAsciiRatio: text.length ? nonAscii / text.length : 0,
  };
}

module.exports = {
  parseResume,
  parseDateRanges,
  totalMonths,
  matchHeading,
  verbBase,
  hasMetric,
  STRONG_VERBS,
  WEAK_PHRASES,
  BUZZWORDS,
  isBulletLine,
  stripBullet,
};
