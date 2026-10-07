/** Offline interview question generator: role families + skill-specific questions. */
const { detectFamily } = require("./roleFit");
const { findSkills } = require("./skills");
const { pick } = require("./textUtils");

// [question, category, difficulty, tips]
const T = (q, c, d, t) => ({ question: q, category: c, difficulty: d, idealAnswerTips: t });

const BEHAVIORAL = [
  T("Tell me about yourself and why you are interested in this role.", "Behavioral", "Easy", "Use present → past → future: current focus, 1–2 relevant achievements, why this role is the logical next step."),
  T("Describe a challenging project you worked on. What was your role and what was the outcome?", "Behavioral", "Medium", "Use STAR: situation, task, your specific actions, measurable result and what you learned."),
  T("Tell me about a time you disagreed with a teammate. How did you handle it?", "Behavioral", "Medium", "Show listening, data-driven discussion and a constructive resolution — never blame."),
  T("Describe a time you failed or made a mistake. What did you learn?", "Behavioral", "Medium", "Own the mistake, explain the fix and the process change you made afterwards."),
  T("Tell me about a time you had to learn a new technology quickly.", "Behavioral", "Easy", "Describe your learning approach, how fast you became productive and what you shipped."),
  T("Give an example of when you showed leadership, even without a formal title.", "Behavioral", "Medium", "Highlight initiative, how you aligned others and the result for the team."),
  T("How do you handle tight deadlines and competing priorities?", "Behavioral", "Easy", "Explain prioritisation (impact vs effort), communication with stakeholders and a real example."),
  T("Tell me about a time you received critical feedback. What did you do with it?", "Behavioral", "Easy", "Show openness, a concrete change and the improvement that followed."),
  T("What accomplishment are you most proud of, and why?", "Behavioral", "Easy", "Pick something relevant to the job; quantify the impact and your personal contribution."),
  T("Describe a time you worked in a team to achieve a goal. What was your contribution?", "Behavioral", "Easy", "Clarify the team goal, your distinct part and how collaboration improved the outcome."),
];
const SITUATIONAL = [
  T("You discover a critical bug in production an hour before a major release. What do you do?", "Situational", "Medium", "Assess impact, communicate early, decide rollback vs hotfix, then run a post-mortem."),
  T("A stakeholder keeps changing requirements mid-sprint. How do you respond?", "Situational", "Medium", "Clarify the root need, document changes, negotiate scope/timeline and set a change process."),
  T("You are given a task with unclear requirements and no one available to ask. How do you proceed?", "Situational", "Medium", "State assumptions, build the smallest useful slice, validate early and keep a decision log."),
  T("Your teammate is falling behind and it risks the deadline. What would you do?", "Situational", "Hard", "Offer help privately first, understand blockers, re-split work and escalate only if needed."),
  T("How would you prioritise if you were assigned three urgent tasks at once?", "Situational", "Easy", "Rank by business impact and deadline, communicate trade-offs, and confirm with your manager."),
];
const GENERAL_ROLE = [
  T("Why do you want to work for our company?", "Role-specific", "Easy", "Show you researched the product, mission and team and connect it to your goals."),
  T("Where do you see yourself in the next three to five years?", "Role-specific", "Easy", "Be ambitious but realistic, tying growth to skills this role would give you."),
  T("What are your biggest strengths and one area you are improving?", "Role-specific", "Easy", "Pick relevant strengths with evidence; show a real weakness and what you are doing about it."),
  T("Do you have any questions for us?", "Role-specific", "Easy", "Ask about team goals, success metrics for the first 90 days and engineering/work culture."),
];

const FAMILY = {
  web: [
    T("Explain the difference between var, let and const in JavaScript, and when you would use each.", "Technical", "Easy", "Cover scope, hoisting, temporal dead zone and reassignment vs mutation."),
    T("What happens when you type a URL into the browser and press Enter?", "Technical", "Medium", "DNS, TCP/TLS, HTTP request, server processing, rendering pipeline, caching."),
    T("How does the JavaScript event loop work? Explain microtasks vs macrotasks.", "Technical", "Hard", "Call stack, task queues, promises vs setTimeout ordering, and why blocking is harmful."),
    T("What is the difference between REST and GraphQL? When would you choose each?", "Technical", "Medium", "Over/under-fetching, caching, versioning, tooling and team needs."),
    T("How would you design authentication and authorization for a web app?", "Technical", "Medium", "Password hashing, sessions vs JWT, refresh tokens, RBAC, HTTPS and token storage trade-offs."),
    T("Explain how you would optimise a slow web page or API endpoint.", "Technical", "Medium", "Measure first, then caching, indexing, pagination, bundle size, lazy loading and N+1 queries."),
    T("What is the difference between SQL and NoSQL databases, and how do you decide?", "Technical", "Easy", "Data shape, consistency, scaling model, query patterns and examples."),
    T("How do you handle errors and validation across a full-stack application?", "Technical", "Medium", "Input validation, centralised error handling, status codes, user-facing messages, logging."),
    T("Describe how you would structure a large codebase so a team can work on it together.", "Technical", "Hard", "Modules, naming, layering, testing, code review, CI and documentation."),
    T("What is CORS, why does it exist, and how do you fix a CORS error?", "Technical", "Medium", "Same-origin policy, preflight requests and configuring allowed origins/headers on the server."),
    T("How would you design a URL shortener? Walk me through the architecture.", "Technical", "Hard", "Requirements, ID generation, storage, caching, redirects, scale and analytics."),
    T("How do you keep your application secure against XSS, CSRF and SQL injection?", "Technical", "Medium", "Escaping, CSP, SameSite cookies/CSRF tokens, parameterised queries."),
  ],
  data: [
    T("Explain the bias–variance trade-off and how it affects model choice.", "Technical", "Medium", "Underfitting vs overfitting, regularisation, cross-validation, model complexity."),
    T("How would you handle missing values and outliers in a dataset?", "Technical", "Easy", "Understand the cause, then drop/impute/cap with justification and check impact."),
    T("Walk me through an end-to-end analysis or ML project you have done.", "Technical", "Medium", "Problem framing, data, features, model, metrics, deployment/communication of results."),
    T("What metrics would you use to evaluate a classification model on imbalanced data?", "Technical", "Medium", "Precision/recall/F1, PR-AUC, confusion matrix, threshold tuning, resampling."),
    T("Explain the difference between a left join, inner join and a full outer join with an example.", "Technical", "Easy", "Define each, show which rows are kept, and mention null handling."),
    T("How would you design an A/B test and decide whether the result is significant?", "Technical", "Hard", "Hypothesis, sample size, randomisation, p-values/confidence intervals, practical significance."),
    T("A dashboard metric suddenly dropped 20%. How do you investigate?", "Situational", "Medium", "Validate data pipeline first, segment by dimensions, check releases/seasonality, then hypothesise."),
    T("Explain how you would present complex findings to a non-technical stakeholder.", "Behavioral", "Easy", "Lead with the decision, use simple visuals, quantify impact and give clear next steps."),
    T("What is the difference between supervised and unsupervised learning? Give examples.", "Technical", "Easy", "Labels vs structure discovery; classification/regression vs clustering/dimensionality reduction."),
    T("How do you prevent data leakage when building a model?", "Technical", "Hard", "Split before preprocessing, time-aware splits, careful feature construction, pipelines."),
  ],
  devops: [
    T("Explain the difference between a container and a virtual machine.", "Technical", "Easy", "Kernel sharing, isolation, size/startup, use cases."),
    T("Walk me through a CI/CD pipeline you built or would design.", "Technical", "Medium", "Build, test, scan, artifact, deploy stages, environments, rollbacks and approvals."),
    T("How does Kubernetes schedule and keep applications running?", "Technical", "Hard", "Pods, deployments, controllers, scheduler, probes, autoscaling, self-healing."),
    T("What is Infrastructure as Code and why is it valuable?", "Technical", "Easy", "Repeatability, versioning, review, drift detection; tools like Terraform."),
    T("How would you troubleshoot a service that is slow or intermittently failing in production?", "Situational", "Hard", "Check metrics/logs/traces, recent changes, dependencies, resources; mitigate then root-cause."),
    T("Explain blue-green and canary deployments and when to use each.", "Technical", "Medium", "Risk, traffic shifting, rollback speed, cost trade-offs."),
    T("What would you monitor for a web service and which alerts would page a human?", "Technical", "Medium", "Golden signals (latency, traffic, errors, saturation), SLOs and alert fatigue."),
    T("How do you manage secrets and configuration securely across environments?", "Technical", "Medium", "Secret managers, least privilege, rotation, never in git, env separation."),
  ],
  mobile: [
    T("Explain the lifecycle of an app screen (Activity/ViewController/Widget) and why it matters.", "Technical", "Medium", "Create/start/resume/pause/destroy, state restoration and avoiding leaks."),
    T("How do you handle offline support and data synchronisation in a mobile app?", "Technical", "Hard", "Local storage, queueing, conflict resolution, retry/backoff."),
    T("How would you optimise the performance and battery usage of a mobile app?", "Technical", "Medium", "Profiling, lazy loading, image caching, background work limits, list virtualisation."),
    T("Compare native development with cross-platform frameworks like Flutter or React Native.", "Technical", "Medium", "Performance, ecosystem, team skills, access to platform APIs, maintenance."),
    T("How do you manage state in a large mobile application?", "Technical", "Medium", "Local vs global state, patterns (MVVM/Bloc/Redux), testing and predictability."),
    T("How would you secure sensitive data (tokens, user info) on a device?", "Technical", "Medium", "Keychain/Keystore, encryption, certificate pinning, avoiding logs."),
  ],
  qa: [
    T("What is the difference between smoke, sanity and regression testing?", "Technical", "Easy", "Scope, timing and purpose of each with examples."),
    T("How do you decide what to automate and what to test manually?", "Technical", "Medium", "Repeatability, risk, ROI, stability; exploratory testing still matters."),
    T("Walk me through how you would test a login page.", "Technical", "Easy", "Positive/negative, boundary, security, accessibility, performance and cross-browser."),
    T("Describe a critical bug you found. How did you report it and what happened next?", "Behavioral", "Medium", "Clear repro steps, severity/priority, collaboration with devs and verification."),
    T("How do you design a maintainable automation framework?", "Technical", "Hard", "Page objects, reusable utilities, data management, reporting, CI integration, flakiness control."),
    T("What would you do if developers dispute your bug report?", "Situational", "Medium", "Reproduce with evidence, check requirements, stay objective and involve the product owner."),
  ],
  design: [
    T("Walk me through your design process from problem to final solution.", "Role-specific", "Medium", "Research, define, ideate, prototype, test, iterate — with a concrete case."),
    T("How do you decide between competing design directions?", "Role-specific", "Medium", "User evidence, usability testing, business goals, constraints and stakeholder alignment."),
    T("How do you ensure your designs are accessible?", "Technical", "Medium", "Contrast, keyboard/screen reader use, target sizes, semantics and testing with real users."),
    T("Describe how you handle feedback from stakeholders you disagree with.", "Behavioral", "Medium", "Listen, ground the discussion in user data and propose testable alternatives."),
    T("How do you measure the success of a design change?", "Technical", "Hard", "Define metrics up front (task success, conversion, time-on-task), A/B tests and qualitative feedback."),
  ],
  product: [
    T("How do you prioritise a roadmap when everything seems important?", "Role-specific", "Medium", "Frameworks (RICE/impact-effort), strategy alignment, data and explicit trade-offs."),
    T("Tell me about a product you improved. How did you define and measure success?", "Behavioral", "Medium", "Problem, hypothesis, metrics, launch, results and learning."),
    T("How would you decide whether to build a new feature?", "Role-specific", "Medium", "User problem, size of opportunity, cost, risks, experiments and success criteria."),
    T("How do you work with engineers and designers when timelines slip?", "Situational", "Medium", "Transparent communication, scope cuts, re-prioritisation and protecting quality."),
    T("A key metric is declining week over week. What do you do?", "Situational", "Hard", "Validate data, segment, review releases, talk to users, form and test hypotheses."),
  ],
  marketing: [
    T("Walk me through a campaign you ran. What were the goals and results?", "Behavioral", "Medium", "Objective, audience, channels, budget, KPIs and measurable outcomes."),
    T("How do you measure the ROI of a marketing channel?", "Technical", "Medium", "Attribution, CAC, LTV, conversion rates and incremental testing."),
    T("How would you improve organic traffic for a website that has plateaued?", "Technical", "Medium", "Keyword/intent research, content gaps, technical SEO, backlinks and measurement."),
    T("How do you decide how to split budget across channels?", "Situational", "Hard", "Test-and-learn, marginal returns, funnel stage goals and attribution limits."),
  ],
  business: [
    T("How do you gather and document requirements from multiple stakeholders?", "Role-specific", "Medium", "Interviews/workshops, user stories, acceptance criteria, traceability and sign-off."),
    T("Describe a time you used data to influence a business decision.", "Behavioral", "Medium", "Question, analysis, insight, recommendation and the outcome."),
    T("How do you handle conflicting priorities between departments?", "Situational", "Medium", "Align on goals, quantify trade-offs and escalate with options."),
    T("How would you analyse why a process is inefficient and propose improvements?", "Role-specific", "Medium", "Map the process, find bottlenecks with data, pilot improvements and measure."),
  ],
  security: [
    T("Explain the OWASP Top 10 and pick two risks you would test first.", "Technical", "Medium", "Name categories, explain impact and how to detect/mitigate (injection, broken access control)."),
    T("What is the difference between symmetric and asymmetric encryption?", "Technical", "Easy", "Key usage, speed, examples (AES vs RSA) and hybrid use in TLS."),
    T("How would you respond to a suspected security incident?", "Situational", "Hard", "Contain, preserve evidence, eradicate, recover, communicate and run a lessons-learned review."),
    T("Walk me through how you would perform a basic web application penetration test.", "Technical", "Hard", "Scope/authorisation, recon, scanning, exploitation, reporting and remediation advice."),
  ],
  generic: [
    T("What skills make someone excellent in this role, and which of them do you have?", "Role-specific", "Easy", "Pick 3 relevant skills and back each with a concrete example."),
    T("Describe a situation where you had to solve a problem with limited information.", "Situational", "Medium", "Show structured thinking, assumptions, how you validated and the result."),
    T("What tools or methods do you use to stay organised and productive?", "Role-specific", "Easy", "Mention concrete tools/habits and how they improved your results."),
  ],
};

// Skill-specific questions (used when the resume/JD mention the skill).
const SKILL_Q = {
  React: T("In React, how do you decide between local state, context and an external state library?", "Technical", "Medium", "Scope of state, re-render cost, complexity and testing."),
  "Node.js": T("How does Node.js handle concurrency despite being single-threaded?", "Technical", "Medium", "Event loop, non-blocking I/O, worker threads and when CPU-bound work is a problem."),
  JavaScript: T("Explain closures in JavaScript with a practical example.", "Technical", "Medium", "Function + lexical scope, use cases (privacy, factories) and memory considerations."),
  TypeScript: T("What benefits does TypeScript bring, and what are generics used for?", "Technical", "Medium", "Static checking, tooling, interfaces vs types and reusable typed abstractions."),
  Python: T("Explain Python's GIL and how you work around it for CPU-bound or I/O-bound tasks.", "Technical", "Hard", "Threads vs processes vs asyncio and when each helps."),
  Java: T("Explain the difference between an interface and an abstract class in Java.", "Technical", "Easy", "Multiple inheritance of type, default methods, state and when to use each."),
  SQL: T("How do database indexes work and when can they hurt performance?", "Technical", "Medium", "B-tree basics, read vs write trade-off, selectivity and covering indexes."),
  MongoDB: T("When would you embed documents versus reference them in MongoDB?", "Technical", "Medium", "Access patterns, document growth, consistency and duplication trade-offs."),
  PostgreSQL: T("What is a transaction and what do the ACID properties guarantee?", "Technical", "Easy", "Atomicity, consistency, isolation, durability with a banking example."),
  Docker: T("What is the difference between a Docker image and a container, and how do you keep images small?", "Technical", "Easy", "Layers, multi-stage builds, base images and .dockerignore."),
  Kubernetes: T("How do you roll out and roll back a new version in Kubernetes without downtime?", "Technical", "Hard", "Rolling updates, readiness probes, maxSurge/maxUnavailable and rollout undo."),
  AWS: T("Which AWS services would you use to host a scalable web application and why?", "Technical", "Medium", "Compute, storage, database, load balancing, CDN, IAM and cost."),
  Git: T("What is the difference between merge and rebase, and when would you use each?", "Technical", "Easy", "History shape, shared branches rule and conflict handling."),
  "REST API": T("What makes an API RESTful, and how do you design good error responses and versioning?", "Technical", "Medium", "Resources, verbs, status codes, idempotency, pagination and versioning."),
  Redis: T("What would you use Redis for, and how do you handle cache invalidation?", "Technical", "Medium", "Caching, rate limiting, sessions; TTLs, write-through and invalidation strategies."),
  GraphQL: T("What are the N+1 problem and DataLoader in GraphQL?", "Technical", "Hard", "Batching/caching resolver calls to avoid repeated queries."),
  "Machine Learning": T("How do you choose between a simple and a complex model for a new problem?", "Technical", "Medium", "Baseline first, data size, interpretability, cost and evaluation."),
  Django: T("How does Django's ORM work and how do you avoid N+1 queries?", "Technical", "Medium", "select_related/prefetch_related and query inspection."),
  "Spring Boot": T("How does dependency injection work in Spring Boot and why is it useful?", "Technical", "Medium", "Inversion of control, beans, testing and loose coupling."),
  Selenium: T("How do you make Selenium tests reliable and avoid flaky waits?", "Technical", "Medium", "Explicit waits, stable locators, test isolation and retries with root-cause."),
  Figma: T("How do you structure a Figma file and design system so developers can build from it?", "Technical", "Medium", "Components, variants, tokens, naming and handoff notes."),
  Excel: T("How would you use lookups and pivot tables to analyse a large dataset in Excel?", "Technical", "Easy", "XLOOKUP/INDEX-MATCH, pivot summaries, data cleaning and validation."),
  Tableau: T("How do you decide which chart to use to communicate a finding in Tableau or Power BI?", "Technical", "Easy", "Match chart to question (trend, comparison, distribution) and avoid clutter."),
  "Tailwind CSS": T("What are the trade-offs of utility-first CSS like Tailwind compared with component CSS?", "Technical", "Easy", "Speed and consistency vs markup verbosity and abstraction strategies."),
  "Next.js": T("Explain the differences between SSR, SSG and CSR and when to use each in Next.js.", "Technical", "Medium", "SEO, freshness, performance, caching and complexity."),
  Flutter: T("How does Flutter render UI and manage state?", "Technical", "Medium", "Widget tree, rendering engine and state patterns."),
  Linux: T("How would you find which process is using the most CPU or memory on a Linux server?", "Technical", "Easy", "top/htop, ps, free, vmstat and next diagnostic steps."),
  "System Design": T("How would you scale an application from 1,000 to 1,000,000 users?", "Technical", "Hard", "Stateless services, caching, DB scaling, queues, CDN and observability."),
  "Data Structures": T("When would you use a hash map versus a balanced tree? Discuss complexity.", "Technical", "Medium", "Average vs worst-case, ordering needs, memory and collision handling."),
  OOP: T("Explain the four pillars of OOP with a real-world example.", "Technical", "Easy", "Encapsulation, abstraction, inheritance, polymorphism with an example each."),
  Agile: T("How have you worked in an Agile/Scrum team? What ceremonies add the most value?", "Behavioral", "Easy", "Sprint planning, stand-ups, retros and how they improved delivery."),
  SEO: T("What are the key on-page and technical factors in SEO and how would you audit a site?", "Technical", "Medium", "Intent/content, metadata, structure, speed, crawlability and backlinks."),
};

const LEVEL_ORDER = { Easy: 0, Medium: 1, Hard: 2 };

function shuffleSeed(arr, rand) {
  return pick(arr, arr.length, rand);
}

/**
 * @param {object} o { role, jobDescription, skills[], count, level, rand }
 */
function generateQuestions({ role = "", jobDescription = "", skills = [], count = 10, rand = Math.random } = {}) {
  count = Math.max(3, Math.min(20, Number(count) || 10));
  const family = detectFamily(`${role} ${jobDescription.slice(0, 400)}`);
  const jdSkills = findSkills(jobDescription).map((s) => s.name);
  const wanted = [...new Set([...jdSkills, ...skills])];

  const tech = [];
  for (const s of wanted) if (SKILL_Q[s]) tech.push({ ...SKILL_Q[s], skill: s });
  const famQs = shuffleSeed(FAMILY[family] || FAMILY.generic, rand);
  const techPool = [...tech, ...famQs.filter((q) => !tech.some((t) => t.question === q.question))];

  const nTech = Math.round(count * 0.5);
  const nBeh = Math.round(count * 0.25);
  const nSit = Math.max(1, Math.round(count * 0.12));
  const nRole = Math.max(1, count - nTech - nBeh - nSit);

  const chosen = [
    ...techPool.slice(0, nTech),
    ...shuffleSeed(BEHAVIORAL, rand).slice(0, nBeh),
    ...shuffleSeed(SITUATIONAL, rand).slice(0, nSit),
    ...shuffleSeed(GENERAL_ROLE, rand).slice(0, nRole),
  ];

  // Fill if a pool was too small
  const all = [...techPool, ...BEHAVIORAL, ...SITUATIONAL, ...GENERAL_ROLE];
  for (const q of shuffleSeed(all, rand)) {
    if (chosen.length >= count) break;
    if (!chosen.some((c) => c.question === q.question)) chosen.push(q);
  }

  // Order warm-up → harder; keep the intro question first.
  const intro = chosen.findIndex((q) => q.question.startsWith("Tell me about yourself"));
  const list = chosen.slice(0, count).map(({ question, category, difficulty, idealAnswerTips }) => ({ question, category, difficulty, idealAnswerTips }));
  list.sort((a, b) => LEVEL_ORDER[a.difficulty] - LEVEL_ORDER[b.difficulty]);
  if (intro >= 0) {
    const i = list.findIndex((q) => q.question.startsWith("Tell me about yourself"));
    if (i > 0) list.unshift(list.splice(i, 1)[0]);
  }
  return { questions: list, family };
}

module.exports = { generateQuestions, SKILL_Q, FAMILY };
