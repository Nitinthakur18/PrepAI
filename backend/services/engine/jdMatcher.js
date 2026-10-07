/**
 * Job-description matcher.
 *  - extracts skills from the JD and weights them by importance (required / preferred)
 *  - extracts domain keywords that are NOT in the skills taxonomy
 *  - checks years-of-experience and education requirements
 *  - measures overall semantic overlap (TF cosine)
 */
const { findSkills } = require("./skills");
const { parseResume } = require("./resumeParser");
const {
  cleanText, tokenize, stem, termFreq, cosine, clamp, uniq,
  STOPWORDS, GENERIC_JD_WORDS,
} = require("./textUtils");

const CTX = [
  ["benefits", /^(benefits|perks|what we offer|we offer|compensation|salary|why join|why you'll love|equal opportunity|about (?:us|the company)|who we are|our (?:mission|values|culture))\b/i],
  ["preferred", /^(nice[- ]to[- ]have|preferred|bonus|good to have|desirable|additional (?:skills|qualifications)|extra credit|plus(?:es)?)\b/i],
  ["required", /^(requirements?|qualifications?|must[- ]haves?|what you(?:'ll| will)? need|what we(?:'re| are) looking for|you have|skills required|required skills|minimum qualifications|basic qualifications|who you are|essential|your profile|skills and experience|technical skills|you bring|about you)\b/i],
  ["responsibilities", /^(responsibilit|what you(?:'ll| will) do|your role|the role|duties|day[- ]to[- ]day|key tasks|you will|in this role|what you(?:'ll| will) be doing)/i],
];

const LINE_PREFERRED = /\b(preferred|nice to have|a plus|bonus|good to have|desirable|is a plus|are a plus|would be (?:great|nice|an advantage)|advantage)\b/i;
const LINE_REQUIRED = /\b(required|must|mandatory|essential|proficien(?:t|cy)|strong (?:knowledge|experience|understanding|background)|expert(?:ise)?|hands[- ]on|solid (?:knowledge|understanding)|deep (?:knowledge|understanding))\b/i;

function cleanTitle(t) {
  return String(t)
    .replace(/^[#*\-\s]+/, "")
    .split(/\s+[—–|@]\s+|\s+-\s+|\s+at\s+/i)[0]
    .replace(/\(.*?\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function detectTitle(lines) {
  for (const l of lines.slice(0, 12)) {
    const m = l.match(/^(?:job\s*title|position|role|title|opening)\s*[:\-–]\s*(.{3,80})$/i);
    if (m) return cleanTitle(m[1]);
  }
  const first = lines.find((l) => l.trim());
  if (first && first.length <= 90 && !/[.!?]$/.test(first.trim()) && first.split(/\s+/).length <= 14) return cleanTitle(first);
  return null;
}

function parseExperienceRequirement(text) {
  if (/\b(fresher|freshers|entry[- ]level|new grad|recent graduate|no experience required|0\s*[-–]\s*1\s*years?)\b/i.test(text)) {
    return { years: 0, raw: "entry level" };
  }
  let best = null;
  const re = /(\d{1,2})\s*\+?\s*(?:(?:to|-|–)\s*(\d{1,2})\s*\+?\s*)?(?:years?|yrs?)\b/gi;
  let m;
  while ((m = re.exec(text))) {
    const ctx = text.slice(Math.max(0, m.index - 70), m.index + m[0].length + 70).toLowerCase();
    if (!/experience|exposure|background|working|hands-on|professional/.test(ctx)) continue;
    const y = parseInt(m[1], 10);
    if (y > 25) continue;
    if (!best || y > best.years) best = { years: y, raw: m[0].trim() };
  }
  return best;
}

function parseEducationRequirement(text) {
  const t = text.toLowerCase();
  if (/\b(ph\.?d|doctorate)\b/.test(t)) return { level: 5, label: "PhD" };
  if (/\b(master'?s?|m\.?tech|m\.?sc|mba|mca|postgraduate)\b/.test(t) && /(required|degree|qualification|education|must|preferred)/.test(t)) return { level: 4, label: "Master's" };
  if (/\b(bachelor'?s?|b\.?tech|b\.?e\b|b\.?sc|bca|bs\b|undergraduate|degree|graduate)\b/.test(t)) return { level: 3, label: "Bachelor's / degree" };
  if (/\b(diploma)\b/.test(t)) return { level: 2, label: "Diploma" };
  return null;
}

function segmentJD(lines) {
  let ctx = "general";
  const segs = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const head = line.replace(/^[•*#\-–—\s]+/, "").replace(/[:\s]+$/, "");
    if (head.length <= 400) {
      const hit = CTX.find(([, re]) => re.test(head));
      const colon = head.indexOf(":");
      const inlineHeading = hit && colon > 0 && colon <= 45; // "Requirements: React, Node.js ..."
      const pureHeading = hit && head.length <= 60 && (raw.trim().endsWith(":") || head.split(/\s+/).length <= 6) && colon === -1;
      if (inlineHeading || pureHeading) {
        ctx = hit[0];
        const rest = inlineHeading ? head.slice(colon + 1).trim() : "";
        if (rest.length > 2) segs.push({ line: rest, ctx });
        continue;
      }
    }
    let lineCtx = ctx;
    if (LINE_PREFERRED.test(line)) lineCtx = "preferred";
    else if (LINE_REQUIRED.test(line) && ctx !== "benefits") lineCtx = "required";
    segs.push({ line, ctx: lineCtx });
  }
  return segs;
}

const IMPORTANCE_WEIGHT = { required: 3, responsibilities: 2, general: 2, preferred: 1, benefits: 0 };
const IMPORTANCE_LABEL = { required: "required", responsibilities: "mentioned", general: "mentioned", preferred: "preferred", benefits: "mentioned" };
const RANK = { required: 3, responsibilities: 2, general: 2, preferred: 1, benefits: 0 };

function extractJDSkills(segs) {
  const map = new Map();
  for (const { line, ctx } of segs) {
    for (const s of findSkills(line)) {
      const e = map.get(s.name) || { skill: s.name, category: s.category, count: 0, ctx: "benefits" };
      e.count += s.count;
      if (RANK[ctx] > RANK[e.ctx]) e.ctx = ctx;
      map.set(s.name, e);
    }
  }
  return [...map.values()]
    .filter((e) => e.ctx !== "benefits" || e.count > 1)
    .map((e) => ({
      skill: e.skill,
      category: e.category,
      count: e.count,
      importance: IMPORTANCE_LABEL[e.ctx],
      weight: Math.max(0.5, IMPORTANCE_WEIGHT[e.ctx]) + Math.min(1, (e.count - 1) * 0.35),
    }))
    .sort((a, b) => b.weight - a.weight || a.skill.localeCompare(b.skill));
}

function extractKeywords(segs, skillNames) {
  const skillTokens = new Set();
  for (const n of skillNames) tokenize(n).forEach((t) => skillTokens.add(stem(t)));

  const uni = new Map();
  const bi = new Map();
  for (const { line, ctx } of segs) {
    if (ctx === "benefits") continue;
    const toks = tokenize(line).filter((t) => t.length > 1);
    const mark = ctx === "required" ? 1.5 : 1;
    for (let i = 0; i < toks.length; i++) {
      const t = toks[i];
      const ok = (w) => w.length >= 4 && !STOPWORDS.has(w) && !GENERIC_JD_WORDS.has(w) && !/^\d/.test(w) && !skillTokens.has(stem(w));
      if (ok(t)) {
        const k = stem(t);
        const e = uni.get(k) || { term: t, score: 0, count: 0 };
        e.score += mark; e.count += 1;
        uni.set(k, e);
      }
      const n = toks[i + 1];
      if (n && ok(t) && ok(n)) {
        const phrase = `${t} ${n}`;
        const e = bi.get(phrase) || { term: phrase, score: 0, count: 0 };
        e.score += mark * 1.6; e.count += 1;
        bi.set(phrase, e);
      }
    }
  }
  const biList = [...bi.values()].filter((e) => e.count >= 2);
  const biWords = new Set(biList.flatMap((e) => e.term.split(" ").map(stem)));
  const uniList = [...uni.values()].filter((e) => (e.count >= 2 || e.score >= 1.5) && !biWords.has(stem(e.term)));
  return [...biList, ...uniList]
    .sort((a, b) => b.score - a.score)
    .slice(0, 18)
    .map((e) => ({ term: e.term, count: e.count }));
}

function verdict(score) {
  if (score >= 80) return "Excellent match";
  if (score >= 65) return "Strong match";
  if (score >= 50) return "Moderate match";
  if (score >= 35) return "Weak match";
  return "Low match";
}

function matchJD(resumeText, jobDescription, { parsedResume } = {}) {
  const resume = parsedResume || parseResume(resumeText);
  const jdClean = cleanText(jobDescription || "");
  const lines = jdClean.split("\n");
  const segs = segmentJD(lines);

  const jdSkills = extractJDSkills(segs);
  const resumeSkillSet = new Set(resume.technicalSkills.map((s) => s.name));

  const matched = jdSkills.filter((s) => resumeSkillSet.has(s.skill));
  const missing = jdSkills.filter((s) => !resumeSkillSet.has(s.skill));
  const totalW = jdSkills.reduce((a, s) => a + s.weight, 0);
  const matchedW = matched.reduce((a, s) => a + s.weight, 0);
  const skillScore = totalW ? (matchedW / totalW) * 100 : 0;

  const keywords = extractKeywords(segs, jdSkills.map((s) => s.skill));
  const resumeStems = new Set(tokenize(resume.text).map(stem));
  const resumeLower = resume.text.toLowerCase();
  const kwMatched = [];
  const kwMissing = [];
  for (const k of keywords) {
    const parts = k.term.split(" ");
    const present = parts.length > 1
      ? resumeLower.includes(k.term) || parts.every((p) => resumeStems.has(stem(p)))
      : resumeStems.has(stem(k.term));
    (present ? kwMatched : kwMissing).push(k);
  }
  const kwScore = keywords.length ? (kwMatched.length / keywords.length) * 100 : null;

  // Experience requirement
  const expReq = parseExperienceRequirement(jdClean);
  const cand = resume.years;
  let expStatus = "unknown";
  let expScore = 80;
  if (expReq) {
    if (cand >= expReq.years) { expStatus = "meets"; expScore = 100; }
    else if (cand >= expReq.years - 1) { expStatus = "close"; expScore = 70; }
    else { expStatus = "below"; expScore = Math.max(20, Math.round((cand / expReq.years) * 100)); }
  }

  // Education requirement
  const eduReq = parseEducationRequirement(jdClean);
  let eduStatus = "unknown";
  let eduScore = 80;
  if (eduReq) {
    if (resume.education.level >= eduReq.level || (eduReq.level <= 3 && resume.education.level >= 3)) { eduStatus = "meets"; eduScore = 100; }
    else if (resume.education.level === 0) { eduStatus = "unknown"; eduScore = 60; }
    else { eduStatus = "below"; eduScore = 40; }
  }

  // Semantic overlap
  const clean = (toks) => toks.filter((t) => !STOPWORDS.has(t) && !GENERIC_JD_WORDS.has(t));
  const sim = cosine(termFreq(clean(tokenize(resume.text))), termFreq(clean(tokenize(jdClean))));
  const semScore = clamp(sim / 0.35, 0, 1) * 100;

  // Title
  const jobTitle = detectTitle(lines);
  let titleMatch = null;
  if (jobTitle) {
    const tt = tokenize(jobTitle).filter((t) => !STOPWORDS.has(t) && !/^(senior|junior|sr|jr|lead|ii|iii|intern|trainee|associate|principal|staff|remote|hybrid)$/.test(t));
    if (tt.length) titleMatch = tt.filter((t) => resumeStems.has(stem(t))).length / tt.length >= 0.6;
  }

  const hasSkills = jdSkills.length > 0;
  const W = hasSkills
    ? { skills: 0.55, keywords: kwScore == null ? 0 : 0.2, experience: 0.1, education: 0.05, semantic: 0.1 }
    : { skills: 0, keywords: kwScore == null ? 0 : 0.5, experience: 0.12, education: 0.08, semantic: 0.3 };
  const sumW = Object.values(W).reduce((a, b) => a + b, 0) || 1;
  const raw =
    (skillScore * W.skills + (kwScore ?? 0) * W.keywords + expScore * W.experience + eduScore * W.education + semScore * W.semantic) / sumW;
  const atsScore = Math.round(clamp(raw, 0, 100));

  const totalKeywords = jdSkills.length + keywords.length;
  const matchedKeywords = matched.length + kwMatched.length;
  const coverage = totalKeywords ? Math.round((matchedKeywords / totalKeywords) * 100) : 0;

  const missingRequired = missing.filter((m) => m.importance === "required").map((m) => m.skill);
  const missingPreferred = missing.filter((m) => m.importance === "preferred").map((m) => m.skill);

  const recommendations = [];
  missing.filter((m) => m.importance !== "preferred").slice(0, 3).forEach((m) => {
    recommendations.push(
      `Add “${m.skill}” — it is ${m.importance === "required" ? "listed as a requirement" : "mentioned"} in this job. If you have used it, put it in your Skills section AND in a bullet (e.g. “Built … using ${m.skill}”). If not, a small project is the fastest way to earn it.`
    );
  });
  if (kwMissing.length) {
    recommendations.push(`Mirror the employer's language: terms like ${kwMissing.slice(0, 4).map((k) => `“${k.term}”`).join(", ")} appear in the job post but not in your resume.`);
  }
  if (expStatus === "below" || expStatus === "close") {
    recommendations.push(`The role asks for ${expReq.raw} of experience and your resume shows about ${cand}. Emphasise relevant projects, internships and the depth of what you built to close the gap.`);
  }
  if (titleMatch === false && jobTitle) {
    recommendations.push(`Your resume never echoes the job title “${jobTitle}”. Use it (or a close variant) in your headline or summary so ATS title filters pick you up.`);
  }
  if (atsScore >= 80) recommendations.push("You are already a strong match — tailor your summary to this role's top 3 requirements and apply.");
  else if (!recommendations.length) recommendations.push("Tailor your summary and top bullets to the first three requirements listed in the job description.");

  return {
    atsScore,
    verdict: verdict(atsScore),
    jobTitle,
    titleMatch,
    matchedSkills: matched.map((s) => s.skill),
    missingSkills: missing.map((s) => s.skill),
    matchedSkillsDetail: matched,
    missingSkillsDetail: missing,
    missingRequired,
    missingPreferred,
    additionalSkills: resume.technicalSkills.filter((s) => !jdSkills.some((j) => j.skill === s.name)).slice(0, 10).map((s) => s.name),
    keywordsMatched: kwMatched,
    keywordsMissing: kwMissing,
    matchedKeywords,
    totalKeywords,
    coverage,
    breakdown: {
      skills: Math.round(skillScore),
      keywords: kwScore == null ? null : Math.round(kwScore),
      experience: Math.round(expScore),
      education: Math.round(eduScore),
      semantic: Math.round(semScore),
    },
    requirements: {
      experience: expReq ? { required: expReq.years, label: expReq.raw, candidate: cand, status: expStatus } : null,
      education: eduReq ? { required: eduReq.label, candidate: resume.education.levelLabel, status: eduStatus } : null,
    },
    recommendations: recommendations.slice(0, 6),
    jdSkillCount: jdSkills.length,
  };
}

module.exports = { matchJD, parseExperienceRequirement, parseEducationRequirement, extractJDSkills, segmentJD };
