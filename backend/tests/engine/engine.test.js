const engine = require("../../services/engine");
const { parseDateRanges, totalMonths, matchHeading, verbBase } = require("../../services/engine/resumeParser");
const { findSkills, canonicalName } = require("../../services/engine/skills");
const { parseLooseJSON } = require("../../utils/jsonRepair");

const JD = `Full Stack Developer (MERN) — Acme Labs
Requirements:
- 2+ years of experience building web applications
- Strong proficiency in JavaScript, React and Node.js
- Experience with MongoDB or PostgreSQL and REST APIs
- Familiarity with Docker and CI/CD pipelines
- Bachelor's degree in Computer Science or equivalent
Nice to have:
- TypeScript, GraphQL, Kubernetes
We offer free snacks and AWS credits.`;

describe("skills taxonomy", () => {
  test("detects aliases and canonicalises them", () => {
    const names = findSkills("Built SPAs with reactjs, k8s and Postgres; wrote ES6 and node.js services").map((s) => s.name);
    expect(names).toEqual(expect.arrayContaining(["React", "Kubernetes", "PostgreSQL", "JavaScript", "Node.js"]));
    expect(canonicalName("K8S")).toBe("Kubernetes");
  });
  test("does not confuse java with javascript, or c with c++", () => {
    const names = findSkills("Experience with JavaScript and C++").map((s) => s.name);
    expect(names).toContain("JavaScript");
    expect(names).toContain("C++");
    expect(names).not.toContain("Java");
    expect(names).not.toContain("C");
  });
  test("ambiguous single-letter skills only count in list context", () => {
    expect(findSkills("Skills: Python, R, C, Go").map((s) => s.name)).toEqual(expect.arrayContaining(["R", "C", "Go"]));
    expect(findSkills("R&D culture. Go to market. The C-suite.").map((s) => s.name)).toEqual([]);
  });
});

describe("resume parser", () => {
  test("parses date ranges and merges overlaps", () => {
    const now = new Date("2026-01-01");
    const r = parseDateRanges("Jan 2020 – Dec 2021 and 2021-2022", now);
    expect(r.length).toBe(2);
    expect(totalMonths(r) / 12).toBeGreaterThan(2);
    expect(totalMonths(r) / 12).toBeLessThan(3.1);
    expect(totalMonths(parseDateRanges("Jan 2020 – Present", now)) / 12).toBeCloseTo(6, 0);
  });
  test("recognises headings and verbs", () => {
    expect(matchHeading("WORK EXPERIENCE")).toBe("experience");
    expect(matchHeading("Technical Skills:")).toBe("skills");
    expect(matchHeading("Experience with React and Node")).toBeNull();
    expect(verbBase("Developed")).toBe("develop");
    expect(verbBase("Responsible")).toBeNull();
  });
  test("a Languages sub-label inside Skills does not steal the skills section", () => {
    const p = engine.parseResume("Jane Doe\njane@x.com\nTECHNICAL SKILLS\nLanguages\nC, Java, Python\nFrameworks\nReact, Node.js\nEDUCATION\nB.Tech");
    expect(p.sections.skills.text).toMatch(/Python/);
  });
});

describe("resume analyzer (offline)", () => {
  const a = engine.analyzeResume(engine.sampleResume);
  test("is deterministic", () => {
    expect(engine.analyzeResume(engine.sampleResume)).toEqual(a);
  });
  test("returns the full contract used by the UI", () => {
    expect(a.atsScore).toBeGreaterThan(50);
    expect(a.atsScore).toBeLessThanOrEqual(100);
    expect(Object.keys(a.scoreBreakdown).sort()).toEqual(["education", "formatting", "keywords", "projects", "skills"]);
    expect(Object.values(a.scoreBreakdown).reduce((x, y) => x + y, 0)).toBe(a.atsScore);
    expect(a.technicalSkills).toEqual(expect.arrayContaining(["React", "Node.js", "MongoDB", "Docker"]));
    expect(Array.isArray(a.strengths) && a.strengths.length).toBeTruthy();
    expect(a.suggestions.length).toBeGreaterThan(2);
    expect(a.checks.length).toBeGreaterThan(10);
    expect(a.validity.isResume).toBe(true);
    expect(a.contact).toMatchObject({ email: true, phone: true, linkedin: true, github: true });
    expect(a.stats.yearsExperience).toBeGreaterThan(2);
  });
  test("flags weak phrases and buzzwords in the demo resume", () => {
    expect(a.weakPhrases.length).toBeGreaterThan(0);
    expect(a.buzzwords.length).toBeGreaterThan(0);
  });
  test("rejects non-resume documents (e.g. a question paper)", () => {
    const paper = Array.from({ length: 30 }, (_, i) => `Question ${i + 1}: Explain polymorphism in object oriented programming and give an example of it?`).join("\n");
    expect(engine.analyzeResume(paper).validity.isResume).toBe(false);
  });
  test("an empty-ish resume scores far lower than a good one", () => {
    const thin = engine.analyzeResume("John Smith\nI want a job. I am hard-working team player.\nI like computers.");
    expect(thin.atsScore).toBeLessThan(a.atsScore - 25);
  });
});

describe("job description matcher", () => {
  const m = engine.matchJD(engine.sampleResume, JD);
  test("weights required vs preferred and ignores benefits noise", () => {
    const req = m.matchedSkillsDetail.find((s) => s.skill === "React");
    expect(req.importance).toBe("required");
    expect(m.missingSkills).toEqual(expect.arrayContaining(["GraphQL", "Kubernetes"]));
    expect(m.missingSkillsDetail.find((s) => s.skill === "Kubernetes").importance).toBe("preferred");
    expect(m.missingRequired).not.toContain("AWS"); // only in the benefits blurb
  });
  test("keeps backwards compatible numeric fields", () => {
    expect(typeof m.matchedKeywords).toBe("number");
    expect(typeof m.totalKeywords).toBe("number");
    expect(m.atsScore).toBeGreaterThan(55);
    expect(m.coverage).toBeGreaterThan(0);
  });
  test("extracts title, years and education requirements", () => {
    expect(m.jobTitle).toBe("Full Stack Developer");
    expect(m.requirements.experience.required).toBe(2);
    expect(m.requirements.experience.status).toBe("meets");
    expect(m.requirements.education.status).toBe("meets");
  });
  test("a mismatched resume scores much lower", () => {
    const other = engine.matchJD("Maria Lopez\nmaria@x.com\nEXPERIENCE\nNurse at City Hospital 2018 - 2024\n• Cared for patients on a busy ward", JD);
    expect(other.atsScore).toBeLessThan(m.atsScore - 25);
    expect(other.missingRequired).toEqual(expect.arrayContaining(["JavaScript", "React"]));
  });
  test("is stable for repeated calls", () => {
    expect(engine.matchJD(engine.sampleResume, JD).atsScore).toBe(m.atsScore);
  });
});

describe("interview engine (offline)", () => {
  test("generates requested number of role-aware questions", () => {
    const { questions, family } = engine.generateQuestions({ role: "Full Stack Developer", jobDescription: "React Node.js MongoDB", skills: ["Docker"], count: 10 });
    expect(family).toBe("web");
    expect(questions).toHaveLength(10);
    expect(new Set(questions.map((q) => q.question)).size).toBe(10);
    expect(questions.some((q) => /React/.test(q.question))).toBe(true);
    questions.forEach((q) => expect(q).toEqual(expect.objectContaining({ question: expect.any(String), category: expect.any(String), difficulty: expect.any(String), idealAnswerTips: expect.any(String) })));
  });
  test("works for non-technical roles and clamps count", () => {
    expect(engine.generateQuestions({ role: "Digital Marketing Executive", count: 4 }).questions).toHaveLength(4);
    expect(engine.generateQuestions({ role: "Barista", count: 999 }).questions.length).toBeLessThanOrEqual(20);
  });
  test("answer scorer rewards structure, specifics and penalises empty/filler answers", () => {
    const good = engine.scoreAnswer({ question: "Tell me about a challenging project", category: "Behavioral", answer: "At my internship I had to speed up a slow REST API built with Node.js and MongoDB. My task was to cut response time. First I profiled it, then I added an index and Redis caching. As a result latency dropped 45% and I learned to measure before optimising." });
    const weak = engine.scoreAnswer({ question: "Explain closures", category: "Technical", answer: "um basically i guess it is a function maybe" });
    const empty = engine.scoreAnswer({ question: "x", category: "Technical", answer: "" });
    expect(good.score).toBeGreaterThan(weak.score + 3);
    expect(empty.score).toBe(0);
    expect(good.rubric).toHaveProperty("structure");
    expect(weak.improvements.length).toBeGreaterThan(0);
  });
  test("summarises an interview with category scores", () => {
    const r = engine.summarizeInterview([{ category: "Technical", score: 8, improvements: [], strengths: [] }, { category: "Behavioral", score: 4, improvements: ["Add numbers"], strengths: [] }, { category: "Technical" }], "Dev");
    expect(r.overallScore).toBe(6);
    expect(r.categoryScores).toHaveLength(2);
    expect(r.summary).toMatch(/skipped/);
  });
});

describe("writing tools & roadmap (offline)", () => {
  test("bullet improver replaces weak openers and adds a placeholder instead of inventing numbers", () => {
    const [b] = engine.improveBullets(["Responsible for code reviews"]);
    expect(b.improved).toMatch(/^Managed/);
    expect(b.improved).toMatch(/\[add a measurable result/);
    expect(b.scoreAfter).toBeGreaterThan(b.scoreBefore);
  });
  test("cover letter uses facts from the resume", () => {
    const c = engine.coverLetter({ resumeText: engine.sampleResume, jobTitle: "MERN Developer", company: "Acme" });
    expect(c.letter).toMatch(/Acme/);
    expect(c.letter).toMatch(/Aarav Mehta/);
    expect(c.wordCount).toBeGreaterThan(100);
  });
  test("linkedin + pitch are generated", () => {
    expect(engine.linkedin({ resumeText: engine.sampleResume }).headlines).toHaveLength(3);
    expect(engine.pitch({ resumeText: engine.sampleResume }).script.length).toBeGreaterThan(80);
  });
  test("roadmap prioritises required skills and totals effort", () => {
    const r = engine.buildRoadmap([{ skill: "graphql", importance: "preferred" }, { skill: "Kubernetes", importance: "required" }]);
    expect(r.items[0].skill).toBe("Kubernetes");
    expect(r.items[0].priority).toBe("High");
    expect(r.totalHours).toBeGreaterThan(0);
    expect(r.items[0].resources[0].url).toMatch(/^https:\/\//);
  });
});

describe("json repair", () => {
  test("handles fences, trailing commas, chatter and truncation", () => {
    expect(parseLooseJSON('```json\n{"a":1,}\n```')).toEqual({ a: 1 });
    expect(parseLooseJSON('Sure! Here you go: {"x":[1,2,],"y":"z"} hope it helps')).toEqual({ x: [1, 2], y: "z" });
    expect(parseLooseJSON('{"list":["a","b"],"text":"cut off he')).toEqual({ list: ["a", "b"], text: "cut off he" });
    expect(() => parseLooseJSON("no json at all")).toThrow();
  });
});
