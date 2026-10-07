/** Learning roadmap for missing skills. Resources are official docs / well-known stable sites only. */
const { categoryOf, canonicalName } = require("./skills");

const RES = {
  React: ["React official docs", "https://react.dev/learn"],
  JavaScript: ["MDN JavaScript Guide", "https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide"],
  TypeScript: ["TypeScript Handbook", "https://www.typescriptlang.org/docs/handbook/intro.html"],
  "Node.js": ["Node.js docs", "https://nodejs.org/en/learn"],
  Python: ["Python tutorial", "https://docs.python.org/3/tutorial/"],
  Docker: ["Docker get started", "https://docs.docker.com/get-started/"],
  Kubernetes: ["Kubernetes basics", "https://kubernetes.io/docs/tutorials/kubernetes-basics/"],
  Git: ["Pro Git book", "https://git-scm.com/book/en/v2"],
  HTML: ["MDN HTML", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Structuring_content"],
  CSS: ["MDN CSS", "https://developer.mozilla.org/en-US/docs/Learn_web_development/Core/Styling_basics"],
  MongoDB: ["MongoDB docs", "https://www.mongodb.com/docs/manual/"],
  PostgreSQL: ["PostgreSQL tutorial", "https://www.postgresql.org/docs/current/tutorial.html"],
  "Tailwind CSS": ["Tailwind docs", "https://tailwindcss.com/docs"],
  GraphQL: ["Learn GraphQL", "https://graphql.org/learn/"],
  Terraform: ["Terraform tutorials", "https://developer.hashicorp.com/terraform/tutorials"],
  "Next.js": ["Next.js learn", "https://nextjs.org/learn"],
  Redis: ["Redis docs", "https://redis.io/docs/"],
  Django: ["Django tutorial", "https://docs.djangoproject.com/en/stable/intro/tutorial01/"],
  "Spring Boot": ["Spring guides", "https://spring.io/guides"],
  Flutter: ["Flutter docs", "https://docs.flutter.dev/"],
  "scikit-learn": ["scikit-learn user guide", "https://scikit-learn.org/stable/user_guide.html"],
  Pandas: ["pandas getting started", "https://pandas.pydata.org/docs/getting_started/index.html"],
  PyTorch: ["PyTorch tutorials", "https://pytorch.org/tutorials/"],
  TensorFlow: ["TensorFlow tutorials", "https://www.tensorflow.org/tutorials"],
  Jest: ["Jest docs", "https://jestjs.io/docs/getting-started"],
  Cypress: ["Cypress docs", "https://docs.cypress.io/"],
  Selenium: ["Selenium docs", "https://www.selenium.dev/documentation/"],
  Linux: ["Linux Journey", "https://linuxjourney.com/"],
  AWS: ["AWS Skill Builder", "https://skillbuilder.aws/"],
  Azure: ["Microsoft Learn: Azure", "https://learn.microsoft.com/en-us/training/azure/"],
  Figma: ["Figma learn", "https://help.figma.com/hc/en-us/categories/360002051613"],
  SQL: ["SQLBolt interactive lessons", "https://sqlbolt.com/"],
  "REST API": ["MDN HTTP overview", "https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview"],
  Kotlin: ["Kotlin docs", "https://kotlinlang.org/docs/home.html"],
  Swift: ["Swift book", "https://docs.swift.org/swift-book/"],
  Go: ["A Tour of Go", "https://go.dev/tour/"],
  Rust: ["The Rust Book", "https://doc.rust-lang.org/book/"],
  "Express.js": ["Express guide", "https://expressjs.com/en/starter/installing.html"],
  Redux: ["Redux essentials", "https://redux.js.org/tutorials/essentials/part-1-overview-concepts"],
};

const CAT = {
  Languages: { hours: 50, project: "a command-line or small web tool that solves a real task you have" },
  Frontend: { hours: 30, project: "a responsive multi-page app (e.g. dashboard or portfolio) deployed publicly" },
  Backend: { hours: 30, project: "a REST API with auth, validation and a database, with tests" },
  Databases: { hours: 20, project: "a data-driven app with a designed schema, indexes and a few complex queries" },
  "Cloud & DevOps": { hours: 25, project: "containerise an app, add CI/CD and deploy it to a cloud provider" },
  "Data & AI": { hours: 40, project: "an end-to-end analysis or model on a public dataset, published as a notebook/report" },
  Mobile: { hours: 40, project: "a small app with navigation, API calls and local storage" },
  Testing: { hours: 15, project: "add automated tests (unit + e2e) to an existing project and run them in CI" },
  "Engineering Practices": { hours: 12, project: "apply it to one of your existing projects and document the change" },
  Design: { hours: 20, project: "redesign an existing app screen with a case study of your process" },
  "Business & Product": { hours: 12, project: "write a short case study applying it to a real product" },
  Security: { hours: 25, project: "a lab write-up from a legal practice platform" },
  "Systems & Hardware": { hours: 30, project: "a small build or simulation with a written report" },
};

function stepsFor(skill, cat) {
  return [
    `Learn the core concepts of ${skill} (follow the official guide below).`,
    `Build ${CAT[cat]?.project || "a small project that uses it"}.`,
    `Add a bullet with a number to your resume, e.g. “Built … using ${skill}, achieving [X].”`,
    `Prepare to explain one trade-off or problem you hit while using ${skill}.`,
  ];
}

/**
 * @param {Array<{skill:string, importance?:string}>} missing
 */
function buildRoadmap(missing = [], { hoursPerWeek = 8 } = {}) {
  const items = missing
    .map((m) => (typeof m === "string" ? { skill: m } : m))
    .map((m) => ({ ...m, skill: canonicalName(m.skill) || m.skill }))
    .slice(0, 8)
    .map((m) => {
      const cat = categoryOf(m.skill) || "Engineering Practices";
      const base = CAT[cat] || CAT["Engineering Practices"];
      const res = RES[m.skill];
      return {
        skill: m.skill,
        category: cat,
        priority: m.importance === "required" ? "High" : m.importance === "preferred" ? "Low" : "Medium",
        estimatedHours: base.hours,
        steps: stepsFor(m.skill, cat),
        projectIdea: base.project,
        resources: res ? [{ title: res[0], url: res[1] }] : [{ title: "roadmap.sh — learning paths", url: "https://roadmap.sh/" }],
      };
    });
  const order = { High: 0, Medium: 1, Low: 2 };
  items.sort((a, b) => order[a.priority] - order[b.priority] || a.estimatedHours - b.estimatedHours);

  let week = 1;
  const phases = [];
  let carry = 0;
  let cur = { label: "", skills: [], hours: 0 };
  for (const it of items) {
    cur.skills.push(it.skill);
    cur.hours += it.estimatedHours;
    if (cur.hours >= hoursPerWeek * 2) {
      const weeks = Math.max(1, Math.round(cur.hours / hoursPerWeek));
      phases.push({ label: `Week ${week}${weeks > 1 ? `–${week + weeks - 1}` : ""}`, skills: cur.skills, hours: cur.hours });
      week += weeks; cur = { label: "", skills: [], hours: 0 };
    }
  }
  if (cur.skills.length) {
    const weeks = Math.max(1, Math.round(cur.hours / hoursPerWeek));
    phases.push({ label: `Week ${week}${weeks > 1 ? `–${week + weeks - 1}` : ""}`, skills: cur.skills, hours: cur.hours });
    week += weeks;
  }
  const totalHours = items.reduce((a, b) => a + b.estimatedHours, 0);
  return { items, phases, totalHours, totalWeeks: Math.max(0, week - 1), hoursPerWeek };
}

module.exports = { buildRoadmap };
