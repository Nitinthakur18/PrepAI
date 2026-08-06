const COMMON_SKILLS = [
  "javascript",
  "typescript",
  "react",
  "next.js",
  "node",
  "express",
  "mongodb",
  "mysql",
  "postgresql",
  "redis",
  "docker",
  "kubernetes",
  "aws",
  "azure",
  "gcp",
  "git",
  "github",
  "html",
  "css",
  "tailwind",
  "bootstrap",
  "python",
  "java",
  "c++",
  "c",
  "sql",
  "nosql",
  "rest api",
  "graphql",
  "jwt",
  "firebase",
  "linux",
  "figma",
  "machine learning",
  "deep learning",
  "tensorflow",
  "pytorch",
  "opencv",
  "numpy",
  "pandas"
];

function normalize(text) {
  return text.toLowerCase();
}

function extractSkills(text) {
  const normalized = normalize(text);

  return COMMON_SKILLS.filter((skill) => {
    const escapedSkill = skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedSkill}\\b`, "i");

    return regex.test(normalized);
  });
}
function calculateATS(resumeText, jobDescription) {
  const resumeSkills = extractSkills(resumeText);
  const jdSkills = extractSkills(jobDescription);

  const matchedSkills = jdSkills.filter(skill =>
    resumeSkills.includes(skill)
  );

  const missingSkills = jdSkills.filter(skill =>
    !resumeSkills.includes(skill)
  );

  const atsScore =
    jdSkills.length === 0
      ? 0
      : Math.round((matchedSkills.length / jdSkills.length) * 100);

  return {
    atsScore,
    matchedSkills,
    missingSkills,
    matchedKeywords: matchedSkills.length,
    totalKeywords: jdSkills.length,
    coverage: atsScore
  };
}

module.exports = {
  calculateATS
};