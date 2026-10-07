/** Offline writing tools: cover letter, bullet improver, LinkedIn copy, elevator pitch. */
const { parseResume, verbBase, hasMetric, STRONG_VERBS, stripBullet } = require("./resumeParser");
const { findSkills, headlineSkills } = require("./skills");
const { roleFit } = require("./roleFit");
const { wordCount, titleCase } = require("./textUtils");

const REWRITE = [
  [/^responsible for\s+(?:the\s+)?/i, "Managed "],
  [/^duties (?:included|include)\s*:?\s*/i, "Handled "],
  [/^(?:was|were) responsible for\s+/i, "Owned "],
  [/^worked on\s+(?:the\s+)?/i, "Developed "],
  [/^worked with\s+/i, "Collaborated with "],
  [/^helped (?:to |with |in )?(?:build |create |develop )?/i, "Contributed to "],
  [/^assisted (?:with|in)\s+/i, "Supported "],
  [/^involved in\s+/i, "Contributed to "],
  [/^participated in\s+/i, "Contributed to "],
  [/^tasked with\s+/i, "Executed "],
  [/^in charge of\s+/i, "Led "],
  [/^(?:made|created)\s+(?:a |an |the )?/i, "Built "],
  [/^did\s+/i, "Executed "],
  [/^used\s+/i, "Leveraged "],
  [/^(?:was )?part of\s+(?:a |the )?/i, "Collaborated in "],
];
const IMPACT_PLACEHOLDER = "[add a measurable result, e.g. X% faster / N users / Y hours saved]";

function scoreBullet(text) {
  let s = 0;
  const first = text.split(/\s+/)[0];
  if (verbBase(first)) s += 30;
  if (hasMetric(text)) s += 30;
  const w = wordCount(text);
  if (w >= 10 && w <= 26) s += 20; else if (w >= 6 && w <= 35) s += 10;
  if (findSkills(text).length) s += 10;
  if (!/responsible for|worked on|helped|assisted|involved in|participated in|duties/i.test(text)) s += 10;
  return s;
}

function improveBullet(raw, i = 0) {
  const original = stripBullet(String(raw)).trim().replace(/\s+/g, " ");
  const notes = [];
  let text = original;
  for (const [re, rep] of REWRITE) {
    if (re.test(text)) {
      text = text.replace(re, rep);
      notes.push(`Replaced a weak opener with the stronger verb “${rep.trim().split(" ")[0]}”.`);
      break;
    }
  }
  text = text.charAt(0).toUpperCase() + text.slice(1);
  if (!verbBase(text.split(/\s+/)[0])) {
    notes.push("Start with a strong action verb (Built, Led, Optimised, Automated…).");
  }
  if (!hasMetric(text)) {
    text = text.replace(/[.;]+$/, "") + `, ${IMPACT_PLACEHOLDER}`;
    notes.push("Added an impact placeholder — replace [X]/[N] with your real numbers (never invent them).");
  }
  if (wordCount(original) > 32) notes.push("This bullet is long; split it into two focused bullets.");
  text = text.replace(/\s+/g, " ").replace(/[.;]+$/, "") + ".";
  return { original, improved: text, notes, scoreBefore: scoreBullet(original), scoreAfter: Math.min(100, scoreBullet(text) + (hasMetric(original) ? 0 : 10)) };
}

function improveBullets(list) {
  return list.map((b, i) => improveBullet(b, i)).filter((b) => b.original);
}

function topAchievement(p) {
  const q = p.quantifiedExamples?.[0];
  return q ? q.replace(/\.$/, "") : null;
}

const TONES = {
  professional: { open: "I am writing to express my interest in the", close: "I would welcome the opportunity to discuss how I can contribute to your team. Thank you for your time and consideration.", sign: "Sincerely," },
  enthusiastic: { open: "I was thrilled to see the opening for the", close: "I would love the chance to talk about how my energy and skills can help your team succeed. Thank you so much for considering my application!", sign: "Best regards," },
  concise: { open: "I'm applying for the", close: "I'd be glad to discuss further. Thank you for your time.", sign: "Regards," },
};

function coverLetter({ resumeText, jobDescription = "", jobTitle = "", company = "", tone = "professional", matchedSkills = [] } = {}) {
  const p = parseResume(resumeText || "");
  const t = TONES[tone] || TONES.professional;
  const name = p.name ? titleCase(p.name) : "Your Name";
  const jdSkills = findSkills(jobDescription).map((s) => s.name);
  const mine = p.technicalSkills.map((s) => s.name);
  const shared = (matchedSkills.length ? matchedSkills : jdSkills.filter((s) => mine.includes(s))).slice(0, 4);
  const top = shared.length ? shared : mine.slice(0, 4);
  const fit = roleFit(mine, { limit: 1 })[0];
  const role = jobTitle || fit?.role || "open position";
  const co = company ? ` at ${company}` : "";
  const exp = p.years >= 1 ? `With ${p.years >= 2 ? "over " : "about "}${Math.floor(p.years) || 1} year${Math.floor(p.years) > 1 ? "s" : ""} of hands-on experience` : "As an early-career professional with hands-on project experience";
  const ach = topAchievement(p);
  const skillsTxt = top.length ? top.slice(0, -1).join(", ") + (top.length > 1 ? " and " : "") + top.slice(-1) : "modern tools and best practices";

  const paras = [];
  paras.push(`Dear ${company ? company + " Hiring Team" : "Hiring Manager"},`);
  paras.push(`${t.open} ${role} role${co}. ${exp}, I have built a strong foundation in ${skillsTxt}, and I am excited to apply it to the problems your team is solving.`);
  if (ach) paras.push(`One example of the impact I aim to deliver: ${ach.charAt(0).toLowerCase()}${ach.slice(1)}. I approach every task by understanding the goal, building a reliable solution and measuring the result.`);
  else paras.push("I approach every task by understanding the goal, building a reliable solution and measuring the result, and I am comfortable learning new tools quickly when a project requires it.");
  if (p.education.levelLabel && p.education.institution) paras.push(`My ${p.education.levelLabel.toLowerCase()} education at ${p.education.institution} gave me the fundamentals, and my projects and practice have kept my skills current and practical.`);
  paras.push(t.close);
  paras.push(`${t.sign}\n${name}${p.contact.email ? "\n" + p.contact.email : ""}${p.contact.phone ? " | " + p.contact.phone : ""}`);
  const letter = paras.join("\n\n");
  return { subject: `Application for ${role}${company ? " – " + company : ""} – ${name}`, letter, wordCount: wordCount(letter) };
}

function linkedin({ resumeText, targetRole = "" } = {}) {
  const p = parseResume(resumeText || "");
  const mine = headlineSkills(p.technicalSkills).map((s) => s.name);
  const fit = roleFit(p.technicalSkills.map((s) => s.name), { limit: 2 });
  const role = targetRole || fit[0]?.role || "Software Engineer";
  const top = mine.slice(0, 4);
  const lvl = p.years >= 1 ? `${Math.floor(p.years)}+ yrs` : "Aspiring";
  const headlines = [
    `${role} | ${top.slice(0, 3).join(" · ") || "Problem solver"} | ${p.years >= 1 ? "Building reliable products" : "Open to opportunities"}`,
    `${lvl} ${role} • ${top.slice(0, 2).join(" & ") || "Tech enthusiast"} • Turning ideas into shipped features`,
    `${role} who ships: ${top.slice(0, 3).join(", ") || "clean, tested code"}`,
  ];
  const ach = topAchievement(p);
  const about = [
    `I'm a ${role.toLowerCase()}${p.years >= 1 ? ` with ${Math.floor(p.years)}+ years of experience` : " early in my career"} who enjoys turning real problems into working products.`,
    top.length ? `My toolkit: ${mine.slice(0, 8).join(", ")}.` : "",
    ach ? `Recent highlight: ${ach}.` : "I focus on building things end to end and learning from every release.",
    p.education.institution ? `Education: ${p.education.levelLabel || "Degree"}, ${p.education.institution}.` : "",
    "I'm always happy to connect with people building great products — feel free to reach out.",
  ].filter(Boolean).join("\n\n");
  return { headlines, about, skills: mine.slice(0, 15) };
}

function pitch({ resumeText, targetRole = "" } = {}) {
  const p = parseResume(resumeText || "");
  const mine = headlineSkills(p.technicalSkills).map((s) => s.name);
  const role = targetRole || roleFit(p.technicalSkills.map((s) => s.name), { limit: 1 })[0]?.role || "software engineer";
  const name = p.name ? titleCase(p.name).split(" ")[0] : "";
  const ach = topAchievement(p);
  const script = [
    `Hi, I'm ${name || "[Your name]"}. ${p.education.levelLabel ? `I hold a ${p.education.levelLabel.toLowerCase()}${p.education.institution ? " from " + p.education.institution : ""}` : "I'm passionate about technology"}${p.years >= 1 ? ` and have about ${Math.floor(p.years)} year(s) of experience` : " and have been building projects to learn by doing"}.`,
    `Most recently I've been working with ${mine.slice(0, 4).join(", ") || "[your top skills]"}${ach ? `, and one thing I'm proud of: ${ach}` : ""}.`,
    `I'm now looking for a ${role.toLowerCase()} role where I can ${p.years >= 3 ? "take more ownership and mentor others" : "grow quickly, contribute on real problems and learn from a strong team"}.`,
  ].join(" ");
  return {
    script,
    wordCount: wordCount(script),
    tips: ["Aim for 45–60 seconds (~120–150 words).", "Structure: present → past → future.", "Replace bracketed parts and add one number-backed achievement.", "End by connecting your goals to the company."],
  };
}

module.exports = { coverLetter, improveBullets, improveBullet, linkedin, pitch, scoreBullet };
