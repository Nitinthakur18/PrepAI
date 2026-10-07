const { PROFILES } = require("./roleProfiles");

/**
 * Scores how well a candidate's skills cover each career path.
 * Returns the best `limit` roles with matched/missing skills.
 */
function roleFit(skillNames, { limit = 4 } = {}) {
  const have = new Set(skillNames.map((s) => s.toLowerCase()));
  const scored = PROFILES.map((p) => {
    let total = 0;
    let got = 0;
    const matched = [];
    const missing = [];
    for (const [skill, w] of Object.entries(p.skills)) {
      total += w;
      if (have.has(skill.toLowerCase())) {
        got += w;
        matched.push(skill);
      } else {
        missing.push({ skill, weight: w });
      }
    }
    const coverage = total ? got / total : 0;
    // Gentle curve: ~65% weighted coverage reads as a strong fit; never claim a perfect 100%.
    const fit = Math.round(Math.min(0.98, coverage * 1.3) * 100);
    missing.sort((a, b) => b.weight - a.weight);
    return {
      role: p.role,
      family: p.family,
      fit,
      matched,
      missing: missing.slice(0, 6).map((m) => m.skill),
    };
  });
  return scored.sort((a, b) => b.fit - a.fit).slice(0, limit);
}

/** Best-guess interview family for free text (role title / JD). */
function detectFamily(text) {
  const t = String(text || "").toLowerCase();
  const rules = [
    ["data", /data (analyst|scientist|engineer)|machine learning|\bml\b|\bai\b|analytics|business intelligence|\bbi\b/],
    ["devops", /devops|\bsre\b|cloud engineer|platform engineer|infrastructure|site reliability/],
    ["mobile", /android|ios|mobile|flutter|react native|swift developer|kotlin/],
    ["qa", /\bqa\b|quality assurance|test engineer|tester|sdet|automation test/],
    ["design", /designer|\bux\b|\bui\b|product design|graphic/],
    ["product", /product manager|product owner|program manager|\bpm\b/],
    ["marketing", /marketing|seo|content|growth|social media|brand/],
    ["business", /business analyst|operations|consultant|finance|accountant|hr\b|human resources|sales/],
    ["security", /security|cyber|pentest|soc analyst|infosec/],
    ["web", /developer|engineer|programmer|software|frontend|front-end|backend|back-end|full[- ]?stack|web/],
  ];
  for (const [fam, re] of rules) if (re.test(t)) return fam;
  return "generic";
}

module.exports = { roleFit, detectFamily, PROFILES };
