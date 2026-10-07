/**
 * Deterministic resume analyzer: the same input always produces the same,
 * explainable result. Produces the exact JSON shape the AI path produces, so
 * the app works identically with or without Gemini.
 */
const { parseResume } = require("./resumeParser");
const { findSkills, headlineSkills } = require("./skills");
const { roleFit } = require("./roleFit");
const { clamp, round1 } = require("./textUtils");

const ENGINE_VERSION = "2.0";

const pct = (n) => Math.round(n * 100);
const group = (skills) => {
  const out = {};
  for (const s of skills) (out[s.category] ||= []).push(s.name);
  return out;
};

function experienceLevel(years, p) {
  const text = p.text.toLowerCase();
  const studentish = /\b(student|fresher|undergraduate|pursuing|intern(?:ship)?)\b/.test(text);
  if (years >= 10) return "Lead / Executive";
  if (years >= 6) return "Senior";
  if (years >= 3) return "Mid Level";
  if (years >= 1) return "Junior";
  return studentish || years === 0 ? "Entry Level" : "Junior";
}

/**
 * How likely is it that this document is actually a resume/CV?
 * Prevents scoring (and spending AI quota on) question papers, invoices, etc.
 */
function resumeValidity(p) {
  let score = 0;
  const reasons = [];
  const add = (v, why) => { score += v; if (v > 0) reasons.push(why); };
  if (p.contact.email || p.contact.phone) add(0.25, "contact details");
  const secs = p.sectionKeys.length;
  if (secs >= 2) add(0.25, "resume sections"); else if (secs === 1) add(0.1, "a resume section");
  if (p.education.level > 0) add(0.1, "education");
  if (p.dateRanges > 0 || p.education.hasYears) add(0.1, "dates");
  if (p.technicalSkills.length + p.softSkills.length >= 3) add(0.1, "skills");
  if (p.name) add(0.1, "a name");
  if (p.statementsWithVerb >= 2) add(0.1, "achievement statements");
  if (p.wordCount >= 120 && p.wordCount <= 2500) add(0.1, "typical length"); else score -= 0.2;
  const questionLines = p.lines.filter((l) => /\?\s*$/.test(l.trim())).length;
  if (questionLines >= 5) score -= 0.4;
  score = Math.max(0, Math.min(1, Math.round(score * 100) / 100));
  return { score, isResume: score >= 0.35, reasons };
}

function buildChecks(p, ctx) {
  const c = [];
  const add = (id, label, status, detail, tip) => c.push({ id, label, status, detail, tip: tip || null });

  add("email", "Email address", p.contact.email ? "pass" : "fail",
    p.contact.email ? `Found ${p.contact.email}` : "No email address detected.",
    p.contact.email ? null : "Add a professional email at the very top of your resume — recruiters and ATS parsers look for it first.");

  add("phone", "Phone number", p.contact.phone ? "pass" : "warn",
    p.contact.phone ? "Phone number detected." : "No phone number detected.",
    p.contact.phone ? null : "Include a phone number with country code so recruiters can reach you quickly.");

  const online = [p.contact.linkedin && "LinkedIn", p.contact.github && "GitHub", p.contact.website && "portfolio"].filter(Boolean);
  add("online", "Online presence", online.length ? "pass" : "warn",
    online.length ? `Links found: ${online.join(", ")}.` : "No LinkedIn, GitHub or portfolio link found.",
    online.length ? null : "Add your LinkedIn and (for technical roles) GitHub or portfolio URL.");

  const hasExp = !!p.sections.experience?.text;
  const hasProj = !!p.sections.projects?.text;
  add("experience", "Experience or projects", hasExp || hasProj ? "pass" : "fail",
    hasExp && hasProj ? "Experience and projects sections found." : hasExp ? "Experience section found." : hasProj ? "Projects section found." : "No experience or projects section detected.",
    hasExp || hasProj ? null : "Add a clearly labelled “Experience” or “Projects” section — ATS systems rely on standard headings.");

  const hasEdu = !!p.sections.education?.text;
  add("education", "Education section", hasEdu ? "pass" : p.education.level ? "warn" : "fail",
    hasEdu ? (p.education.levelLabel ? `${p.education.levelLabel} level education detected.` : "Education section found.") : "No education section detected.",
    hasEdu ? null : "Add an “Education” section with degree, institution and year.");

  const hasSkills = !!p.sections.skills?.text;
  add("skills_section", "Skills section", hasSkills ? "pass" : "warn",
    hasSkills ? "Dedicated skills section found." : "No dedicated skills section.",
    hasSkills ? null : "Add a “Skills” section grouped by category (Languages, Frameworks, Tools) so keyword scanners can pick it up.");

  add("summary", "Professional summary", p.sections.summary?.text ? "pass" : "warn",
    p.sections.summary?.text ? "Summary/profile section found." : "No summary or profile at the top.",
    p.sections.summary?.text ? null : "Add a 2–3 line summary with your target role, strongest skills and one headline achievement.");

  const min = p.years >= 5 ? 400 : 250;
  const max = p.years >= 5 ? 1100 : 750;
  const wc = p.wordCount;
  const lenStatus = wc >= min && wc <= max ? "pass" : wc < min * 0.6 || wc > max * 1.5 ? "fail" : "warn";
  add("length", "Resume length", lenStatus, `${wc} words (ideal ${min}–${max}).`,
    lenStatus === "pass" ? null : wc < min ? "Your resume is thin — expand with project details, responsibilities and results." : "Your resume is long — trim older/irrelevant items so it fits 1 page (fresher) or 2 pages (experienced).");

  const nStatements = p.statements.length;
  add("bullets", "Bullet-point structure", p.bullets.length >= 4 ? "pass" : nStatements >= 4 ? "warn" : "fail",
    p.bullets.length ? `${p.bullets.length} bullet points detected.` : nStatements ? "Content found but few explicit bullets." : "No achievement bullets detected.",
    p.bullets.length >= 4 ? null : "Describe each role/project in 3–5 short bullet points starting with an action verb.");

  const qRatio = nStatements ? p.quantifiedCount / nStatements : 0;
  add("quantified", "Quantified achievements", qRatio >= 0.3 ? "pass" : p.quantifiedCount > 0 ? "warn" : "fail",
    nStatements ? `${p.quantifiedCount} of ${nStatements} bullets contain numbers (${pct(qRatio)}%).` : "No bullets to evaluate.",
    qRatio >= 0.3 ? null : "Add numbers: users served, % improvement, time saved, revenue, team size. Aim for 1 in 3 bullets.");

  const vRatio = nStatements ? p.statementsWithVerb / nStatements : 0;
  add("verbs", "Strong action verbs", vRatio >= 0.6 ? "pass" : vRatio >= 0.3 ? "warn" : "fail",
    nStatements ? `${pct(vRatio)}% of bullets start with a strong verb (${p.verbsUsed.length} distinct).` : "No bullets to evaluate.",
    vRatio >= 0.6 ? null : "Start bullets with verbs like Built, Led, Optimized, Reduced, Designed, Automated.");

  const weakCount = p.weakPhrases.reduce((a, x) => a + x.count, 0);
  add("weak", "Weak phrasing", weakCount === 0 ? "pass" : weakCount <= 2 ? "warn" : "fail",
    weakCount ? `Found: ${p.weakPhrases.map((w) => `“${w.phrase}”`).slice(0, 4).join(", ")}.` : "No passive filler phrases found.",
    weakCount ? "Replace “responsible for / worked on / helped with” with what you actually did and achieved." : null);

  const buzzCount = p.buzzwords.reduce((a, x) => a + x.count, 0);
  add("buzzwords", "Clichés & buzzwords", buzzCount === 0 ? "pass" : buzzCount <= 2 ? "warn" : "fail",
    buzzCount ? `Found: ${p.buzzwords.map((w) => `“${w.phrase}”`).slice(0, 4).join(", ")}.` : "No empty buzzwords detected.",
    buzzCount ? "Swap generic claims (“team player”, “hard-working”) for evidence: what did you deliver, with whom, and how well?" : null);

  add("pronouns", "First-person pronouns", p.pronouns <= 2 ? "pass" : p.pronouns <= 6 ? "warn" : "fail",
    p.pronouns ? `“I / me / my” appears ${p.pronouns} times.` : "No first-person pronouns.",
    p.pronouns > 2 ? "Resumes read stronger without “I/me/my” — start bullets directly with the action." : null);

  add("dates", "Dates & timeline", p.dateRanges > 0 || p.education.hasYears ? "pass" : "warn",
    p.dateRanges > 0 ? `${p.dateRanges} date range(s) parsed.` : p.education.hasYears ? "Education years found." : "No dates detected.",
    p.dateRanges > 0 || p.education.hasYears ? null : "Add consistent dates (e.g. “Jan 2024 – Present”) so recruiters can see your timeline.");

  add("symbols", "ATS-safe characters", p.nonAsciiRatio <= 0.01 ? "pass" : p.nonAsciiRatio <= 0.03 ? "warn" : "fail",
    p.nonAsciiRatio <= 0.01 ? "Plain, parser-friendly text." : "Many special characters/icons detected.",
    p.nonAsciiRatio > 0.01 ? "Icons, emojis and decorative glyphs often break ATS parsing — use plain text for contact details." : null);

  const nSkills = ctx.skills.length;
  add("skill_depth", "Skill coverage", nSkills >= 10 ? "pass" : nSkills >= 5 ? "warn" : "fail",
    `${nSkills} recognised technical skills across ${Object.keys(ctx.byCategory).length} categories.`,
    nSkills >= 10 ? null : "List more relevant tools/technologies — only keywords that appear on your resume can be matched.");

  if (!hasExp && p.years === 0) {
    add("projects", "Project evidence", p.projectCount >= 2 ? "pass" : p.projectCount === 1 ? "warn" : "fail",
      p.projectCount ? `~${p.projectCount} project(s) detected.` : "No projects detected.",
      p.projectCount >= 2 ? null : "With little work experience, 2–3 well-described projects (with tech stack and outcome) matter a lot.");
  }
  return c;
}

function buildScores(p, ctx) {
  const { skills, byCategory, best } = ctx;
  const n = p.statements.length;
  const minW = p.years >= 5 ? 400 : 250;
  const maxW = p.years >= 5 ? 1100 : 750;
  const wc = p.wordCount;

  // 1. Formatting & structure
  let formatting = 0;
  formatting += p.contact.email ? 4 : 0;
  formatting += p.contact.phone ? 3 : 0;
  formatting += p.contact.linkedin || p.contact.github || p.contact.website ? 2 : 0;
  formatting += (p.sections.experience?.text || p.sections.projects?.text ? 2.5 : 0);
  formatting += p.sections.education?.text ? 2.5 : 0;
  formatting += p.sections.skills?.text ? 2.5 : 0;
  formatting += p.sections.summary?.text ? 1 : 0;
  formatting += wc >= minW && wc <= maxW ? 2.5 : wc >= minW * 0.7 && wc <= maxW * 1.35 ? 1.5 : 0;
  formatting += p.bullets.length >= 3 || n >= 4 ? 1.5 : 0;
  formatting += p.dateRanges > 0 || p.education.hasYears ? 0.5 : 0;
  formatting -= p.pronouns > 4 ? 1 : 0;
  formatting -= p.nonAsciiRatio > 0.02 ? 1 : 0;

  // 2. Keywords (rewards breadth, verb variety, role alignment, evidence and impact numbers)
  const outsideSkills = findSkills(p.text.replace(p.sections.skills?.text || "\u0000", " "));
  const qShare = n ? p.quantifiedCount / n : 0;
  let keywords = 0;
  keywords += Math.min(1, skills.length / 18) * 7;
  keywords += Math.min(1, p.verbsUsed.length / 10) * 4;
  keywords += (best ? best.fit / 100 : 0) * 3;
  keywords += Math.min(1, outsideSkills.length / 6) * 3;
  keywords += Math.min(1, qShare / 0.3) * 3;
  keywords -= p.buzzwords.reduce((a, x) => a + x.count, 0) > 3 ? 1 : 0;
  keywords -= p.weakPhrases.reduce((a, x) => a + x.count, 0) > 3 ? 1 : 0;

  // 3. Skills
  let skillsScore = 0;
  skillsScore += p.sections.skills?.text ? 5 : skills.length >= 8 ? 2.5 : 0;
  skillsScore += Math.min(1, Object.keys(byCategory).length / 4) * 5;
  skillsScore += Math.min(1, skills.length / 12) * 5;
  skillsScore += Math.min(1, p.softSkills.length / 3) * 2;
  const share = skills.length ? outsideSkills.length / skills.length : 0;
  skillsScore += Math.min(1, share / 0.4) * 3;

  // 4. Experience / projects impact
  let projects = 0;
  const hasExp = !!p.sections.experience?.text;
  const hasProj = !!p.sections.projects?.text;
  projects += hasExp && hasProj ? 5 : hasExp || hasProj ? 4 : 0;
  projects += Math.min(1, n / 8) * 3;
  const qRatio = n ? p.quantifiedCount / n : 0;
  projects += Math.min(1, qRatio / 0.35) * 7;
  const vRatio = n ? p.statementsWithVerb / n : 0;
  projects += Math.min(1, vRatio / 0.7) * 3;
  if (n) {
    const avg = p.statements.reduce((a, s) => a + s.text.split(/\s+/).length, 0) / n;
    projects += avg >= 8 && avg <= 28 ? 2 : avg >= 5 && avg <= 40 ? 1 : 0;
  }

  // 5. Education & credentials
  let education = 0;
  education += p.sections.education?.text ? 6 : p.education.level ? 4 : 0;
  education += p.education.level >= 3 ? 6 : p.education.level === 2 ? 4 : p.education.level === 1 ? 2 : 0;
  education += p.education.institution ? 2 : 0;
  education += p.education.hasYears ? 1 : 0;
  education += Math.min(1, p.certifications / 2) * 3;
  education += p.education.gpa ? 1 : 0;
  if (p.years >= 4 && p.education.level >= 3) education = Math.max(education, 15);

  const r = (v) => Math.round(clamp(v, 0, 20));
  const scoreBreakdown = {
    formatting: r(formatting),
    keywords: r(keywords),
    skills: r(skillsScore),
    projects: r(projects),
    education: r(education),
  };
  const atsScore = Object.values(scoreBreakdown).reduce((a, b) => a + b, 0);
  return { scoreBreakdown, atsScore };
}

function narrative(p, ctx, checks, level) {
  const strengths = [];
  const weaknesses = [];
  const suggestions = [];
  const by = (id) => checks.find((c) => c.id === id);

  if (ctx.skills.length >= 10) strengths.push(`Broad technical toolkit: ${ctx.skills.length} recognised skills across ${Object.keys(ctx.byCategory).length} areas (${Object.keys(ctx.byCategory).slice(0, 3).join(", ")}).`);
  if (by("quantified").status === "pass") strengths.push(`Results are quantified — ${p.quantifiedCount} bullets include measurable impact, which recruiters scan for.`);
  if (by("verbs").status === "pass") strengths.push(`Bullets lead with strong action verbs (${p.verbsUsed.slice(0, 4).join(", ")}).`);
  if (p.contact.email && p.contact.phone && (p.contact.linkedin || p.contact.github)) strengths.push("Contact block is complete and easy for recruiters to act on.");
  if (p.years >= 3) strengths.push(`About ${p.years} years of relevant experience, which supports ${level.toLowerCase()} applications.`);
  if (p.education.level >= 3 && p.education.institution) strengths.push(`Clear educational background (${p.education.levelLabel}, ${p.education.institution}).`);
  if (ctx.best && ctx.best.fit >= 55) strengths.push(`Strong alignment with ${ctx.best.role} roles (${ctx.best.fit}% skill fit).`);
  if (p.projectCount >= 2) strengths.push(`${p.projectCount} projects demonstrate hands-on practice beyond coursework.`);
  if (by("weak").status === "pass" && by("buzzwords").status === "pass" && p.statements.length >= 4) strengths.push("Language is direct — no filler phrases or empty buzzwords.");

  for (const c of checks) {
    if (c.status === "fail") weaknesses.push(`${c.label}: ${c.detail}`);
  }
  for (const c of checks) {
    if (c.status === "warn" && weaknesses.length < 6) weaknesses.push(`${c.label}: ${c.detail}`);
  }
  for (const c of checks) {
    if (c.tip && (c.status === "fail" || c.status === "warn")) suggestions.push(c.tip);
  }
  if (ctx.best && ctx.best.missing.length) {
    suggestions.push(`To strengthen your ${ctx.best.role} profile, add (and evidence in a project) skills such as ${ctx.best.missing.slice(0, 4).join(", ")}.`);
  }
  if (!strengths.length) strengths.push("Resume text was parsed successfully, which is the first requirement for passing an ATS.");
  if (!weaknesses.length) weaknesses.push("No major structural problems detected — focus on tailoring keywords to each job description.");
  if (!suggestions.length) suggestions.push("Tailor your resume to every job description: mirror its exact keywords and lead with your most relevant project.");
  suggestions.push("Run the Job Match tool with a real job description to see exactly which keywords you are missing.");

  return {
    strengths: strengths.slice(0, 5),
    weaknesses: weaknesses.slice(0, 6),
    suggestions: [...new Set(suggestions)].slice(0, 8),
  };
}

function summarize(p, ctx, level) {
  const cats = Object.entries(ctx.byCategory).sort((a, b) => b[1].length - a[1].length).map(([k]) => k);
  const title = ctx.best ? ctx.best.role : "technology";
  const exp = p.years > 0 ? `with roughly ${p.years} year${p.years === 1 ? "" : "s"} of experience` : "building a foundation through projects and coursework";
  const skillBit = ctx.skills.length
    ? `Skilled in ${headlineSkills(ctx.skills).slice(0, 5).map((s) => s.name).join(", ")}${cats.length > 1 ? ` across ${cats.slice(0, 3).join(", ")}` : ""}.`
    : "Few recognisable technical skills were found.";
  const impact = p.quantifiedCount
    ? `${p.quantifiedCount} bullet${p.quantifiedCount === 1 ? " shows" : "s show"} measurable results.`
    : "No measurable results are quantified yet.";
  return `${level} ${title} candidate ${exp}. ${skillBit} ${impact}`;
}

/**
 * Full local analysis.
 * @param {string} rawText extracted resume text
 */
function analyzeResume(rawText, opts = {}) {
  const p = parseResume(rawText, opts);
  const skills = p.technicalSkills;
  const byCategory = group(skills);
  const fits = roleFit(skills.map((s) => s.name));
  const best = fits[0] && fits[0].fit > 0 ? fits[0] : null;
  const ctx = { skills, byCategory, best };

  const level = experienceLevel(p.years, p);
  const checks = buildChecks(p, ctx);
  const { scoreBreakdown, atsScore } = buildScores(p, ctx);
  const { strengths, weaknesses, suggestions } = narrative(p, ctx, checks, level);

  const present = [];
  const missing = [];
  const wanted = [
    ["summary", "Summary"], ["experience", "Experience"], ["education", "Education"],
    ["skills", "Skills"], ["projects", "Projects"], ["certifications", "Certifications"],
  ];
  for (const [k, label] of wanted) (p.sections[k]?.text ? present : missing).push(label);

  const nStatements = p.statements.length;
  return {
    summary: summarize(p, ctx, level),
    technicalSkills: skills.slice(0, 30).map((s) => s.name),
    softSkills: p.softSkills.slice(0, 8).map((s) => s.name),
    experienceLevel: level,
    atsScore,
    scoreBreakdown,
    strengths,
    weaknesses,
    suggestions,
    // ---- extended, explainable fields ----
    checks,
    contact: {
      name: p.name,
      email: !!p.contact.email,
      phone: !!p.contact.phone,
      linkedin: !!p.contact.linkedin,
      github: !!p.contact.github,
      website: !!p.contact.website,
      location: p.contact.location,
    },
    sections: { present, missing },
    stats: {
      wordCount: p.wordCount,
      pages: round1(p.wordCount / 500),
      bullets: p.bullets.length,
      statements: nStatements,
      quantified: p.quantifiedCount,
      quantifiedPct: nStatements ? pct(p.quantifiedCount / nStatements) : 0,
      actionVerbPct: nStatements ? pct(p.statementsWithVerb / nStatements) : 0,
      distinctVerbs: p.verbsUsed.length,
      skillCount: skills.length,
      yearsExperience: p.years,
      projects: p.projectCount,
      certifications: p.certifications,
      education: p.education.levelLabel,
    },
    skillsByCategory: byCategory,
    roleFit: fits,
    targetRoles: fits.slice(0, 3).map((f) => f.role),
    weakPhrases: p.weakPhrases.map((w) => w.phrase),
    buzzwords: p.buzzwords.map((w) => w.phrase),
    actionVerbs: p.verbsUsed.slice(0, 12),
    quantifiedExamples: p.quantifiedExamples,
    validity: resumeValidity(p),
    scoreModel: { local: atsScore, ai: null, weights: { local: 1, ai: 0 } },
    engineVersion: ENGINE_VERSION,
  };
}

module.exports = { analyzeResume, ENGINE_VERSION, experienceLevel };
