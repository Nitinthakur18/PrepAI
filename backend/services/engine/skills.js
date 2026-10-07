/**
 * Skills taxonomy used by the offline "Smart Engine".
 *
 * Format:  "Canonical Name|alias one|alias two"
 * A trailing "!" on the canonical name marks the term as AMBIGUOUS (e.g. the
 * language "C", "R" or "Go"). Ambiguous terms are only counted when they
 * appear in a list-like context ("Skills: Python, R, SQL") so that ordinary
 * English words are never mistaken for skills.
 */
const RAW = {
  Languages: [
    "JavaScript|js|ecmascript|es6|es2015|es2020|vanilla js|vanilla javascript",
    "TypeScript|ts",
    "Python|python3",
    "Java",
    "C++|cpp",
    "C#|csharp|c-sharp",
    "C!",
    "Go!|golang",
    "Rust",
    "PHP",
    "Ruby",
    "Swift",
    "Kotlin",
    "Scala",
    "R!",
    "MATLAB",
    "Perl",
    "Dart",
    "Bash|shell scripting|shell script|zsh",
    "PowerShell",
    "SQL|t-sql|pl/sql|plsql|pl-sql",
    "HTML|html5",
    "CSS|css3",
    "Sass|scss",
    "Objective-C",
    "Lua",
    "Haskell",
    "Elixir",
    "Solidity",
    "Assembly|assembly language",
    "VBA",
    "Julia",
  ],
  Frontend: [
    "React|react.js|reactjs|react js",
    "Next.js|nextjs|next js",
    "Vue.js|vue|vuejs|vue js",
    "Nuxt|nuxt.js",
    "Angular|angularjs|angular.js",
    "Svelte|sveltekit",
    "Redux|redux toolkit|rtk",
    "Zustand",
    "jQuery",
    "Tailwind CSS|tailwind|tailwindcss",
    "Bootstrap",
    "Material UI|mui|material-ui",
    "Chakra UI",
    "Ant Design|antd",
    "Webpack",
    "Vite",
    "Babel",
    "Storybook",
    "Framer Motion",
    "Three.js|threejs",
    "D3.js|d3",
    "WebSockets|websocket|web sockets",
    "PWA|progressive web app|progressive web apps",
    "Responsive Design|responsive web design|responsive layouts|mobile-first",
    "Web Accessibility|wcag|a11y|accessibility",
    "React Query|tanstack query",
    "Gatsby",
    "Astro",
    "Remix",
    "Electron",
    "AJAX",
  ],
  Backend: [
    "Node.js|node|nodejs|node js",
    "Express.js|express|expressjs|express js",
    "NestJS|nest.js",
    "Django",
    "Flask",
    "FastAPI",
    "Spring Boot|springboot",
    "Spring|spring framework|spring mvc",
    ".NET|dotnet|.net core|asp.net|asp.net core",
    "Laravel",
    "Ruby on Rails|rails",
    "REST API|rest|restful|restful api|rest apis|restful apis|restful services|web services",
    "GraphQL",
    "gRPC",
    "Microservices|microservice|micro-services",
    "JWT|json web token|json web tokens",
    "OAuth|oauth2|oauth 2.0",
    "Socket.io|socketio",
    "Kafka|apache kafka",
    "RabbitMQ",
    "Celery",
    "Hibernate",
    "Prisma",
    "Sequelize",
    "Mongoose",
    "Swagger|openapi",
    "API Design|api development|api integration",
    "Serverless",
    "Message Queues|message queue|pub/sub|pubsub",
  ],
  Databases: [
    "MongoDB|mongo",
    "MySQL",
    "PostgreSQL|postgres|psql",
    "SQLite",
    "Redis",
    "Elasticsearch|elastic search",
    "DynamoDB",
    "Firebase|firestore",
    "Cassandra",
    "Oracle|oracle db|oracle database",
    "SQL Server|mssql|microsoft sql server",
    "Supabase",
    "Neo4j",
    "NoSQL",
    "Snowflake",
    "BigQuery",
    "Redshift",
    "Database Design|data modeling|data modelling|schema design|database management|dbms",
    "ORM",
  ],
  "Cloud & DevOps": [
    "AWS|amazon web services",
    "Azure|microsoft azure",
    "GCP|google cloud|google cloud platform",
    "Docker|dockerfile|docker compose|containerization|containerisation",
    "Kubernetes|k8s",
    "Terraform",
    "Ansible",
    "Jenkins",
    "GitHub Actions",
    "GitLab CI|gitlab ci/cd",
    "CI/CD|cicd|ci cd|continuous integration|continuous deployment|continuous delivery",
    "Linux|ubuntu|unix",
    "Nginx",
    "Apache",
    "Heroku",
    "Vercel",
    "Netlify",
    "Cloudflare",
    "Prometheus",
    "Grafana",
    "Datadog",
    "ELK Stack|elk",
    "Helm",
    "Infrastructure as Code|iac",
    "EC2",
    "S3",
    "AWS Lambda|lambda functions",
    "CloudFormation",
    "ArgoCD",
    "Istio",
    "DevOps",
    "SRE|site reliability",
    "Load Balancing|load balancer",
    "Monitoring|observability",
  ],
  "Data & AI": [
    "Machine Learning|ml",
    "Deep Learning",
    "NLP|natural language processing",
    "Computer Vision",
    "TensorFlow",
    "PyTorch",
    "Keras",
    "scikit-learn|sklearn|scikit learn",
    "Pandas",
    "NumPy",
    "Matplotlib",
    "Seaborn",
    "OpenCV",
    "Jupyter|jupyter notebook",
    "Hugging Face|huggingface|transformers",
    "LLM|large language models|llms|large language model",
    "Generative AI|genai|gen ai|generative ai",
    "Prompt Engineering",
    "LangChain",
    "RAG|retrieval augmented generation|retrieval-augmented generation",
    "Data Analysis|data analytics|analytics",
    "Data Visualization|data visualisation|dashboards",
    "Statistics|statistical analysis|statistical modeling",
    "Power BI|powerbi",
    "Tableau",
    "Excel|microsoft excel|ms excel|advanced excel",
    "Looker",
    "Apache Spark|spark|pyspark",
    "Hadoop",
    "Airflow|apache airflow",
    "ETL|elt",
    "Data Warehousing|data warehouse",
    "Data Engineering",
    "dbt",
    "A/B Testing|ab testing|a/b test|split testing",
    "Time Series",
    "Reinforcement Learning",
    "XGBoost",
    "Feature Engineering",
    "MLOps",
    "Data Mining",
    "Big Data",
    "Neural Networks|cnn|rnn|lstm",
    "Google Analytics|ga4",
    "SPSS",
    "SAS",
    "Web Scraping|scraping|beautifulsoup|scrapy",
    "Data Cleaning|data wrangling|data preprocessing",
  ],
  Mobile: [
    "React Native",
    "Flutter",
    "Android|android development|android sdk|android studio",
    "iOS|ios development",
    "SwiftUI",
    "Jetpack Compose",
    "Xamarin",
    "Ionic",
    "Expo",
    "Mobile Development|mobile app development|app development",
  ],
  Testing: [
    "Jest",
    "Mocha",
    "Chai",
    "Cypress",
    "Selenium",
    "Playwright",
    "JUnit",
    "PyTest",
    "Postman",
    "Unit Testing|unit tests|unit test",
    "Integration Testing|integration tests",
    "Test Automation|automation testing|automated testing|test automation",
    "TDD|test driven development|test-driven development",
    "Manual Testing",
    "Load Testing|performance testing",
    "JMeter",
    "Appium",
    "QA|quality assurance",
    "Vitest",
    "React Testing Library|rtl",
    "Supertest",
    "Regression Testing",
    "Bug Tracking|bug reporting",
    "Test Cases|test plans|test planning",
  ],
  "Engineering Practices": [
    "Git|version control",
    "GitHub",
    "GitLab",
    "Bitbucket",
    "Agile|agile methodology|agile methodologies",
    "Scrum",
    "Kanban",
    "JIRA",
    "Confluence",
    "Code Review|code reviews|peer review",
    "System Design|software architecture|high level design|low level design|hld|lld",
    "Data Structures|dsa|data structures and algorithms|algorithms|data structures & algorithms",
    "OOP|object-oriented programming|object oriented programming|oops|object oriented design",
    "Design Patterns",
    "SOLID",
    "Clean Code",
    "Technical Documentation|documentation",
    "Debugging|troubleshooting",
    "Performance Optimization|performance tuning|performance optimisation",
    "Web Development|web dev|web application development",
    "Full Stack Development|full stack|full-stack|fullstack",
    "Open Source|open-source",
    "Cross-Browser Compatibility|cross-browser",
    "Payment Gateway|payment integration|razorpay|stripe",
    "SEO|search engine optimization|search engine optimisation",
    "Concurrency|multithreading|multi-threading",
  ],
  Design: [
    "Figma",
    "Adobe XD",
    "Sketch",
    "Photoshop|adobe photoshop",
    "Illustrator|adobe illustrator",
    "InVision",
    "UI Design|ui design|user interface design",
    "UX Design|ux design|user experience|user experience design",
    "User Research",
    "Wireframing|wireframes|wireframe",
    "Prototyping|prototypes|prototype",
    "Design Systems|design system",
    "Usability Testing",
    "Interaction Design",
    "Adobe Creative Suite|creative cloud|adobe creative cloud",
    "After Effects",
    "Canva",
    "Typography",
    "Information Architecture",
    "Video Editing|premiere pro",
    "Visual Design|graphic design",
  ],
  "Business & Product": [
    "Product Management|product manager",
    "Product Roadmap|roadmapping|roadmap planning",
    "User Stories|acceptance criteria",
    "Stakeholder Management|stakeholder communication",
    "Market Research",
    "Competitive Analysis|competitor analysis",
    "Business Analysis",
    "Requirements Gathering|requirement gathering|requirements analysis",
    "OKRs|okr",
    "KPIs|kpi|key performance indicators",
    "Project Management|project planning|program management",
    "Budgeting",
    "Forecasting",
    "Financial Modeling|financial modelling|financial analysis",
    "Digital Marketing",
    "Google Ads|sem|adwords|ppc",
    "Social Media Marketing|smm|social media management|social media",
    "Content Marketing",
    "Content Writing|copywriting|content creation",
    "Email Marketing|mailchimp",
    "CRM|customer relationship management",
    "Salesforce",
    "HubSpot",
    "Lead Generation",
    "Sales",
    "Customer Success",
    "Customer Service|customer support",
    "Business Development",
    "SAP",
    "Tally",
    "QuickBooks",
    "Accounting|bookkeeping",
    "Recruitment|talent acquisition|recruiting",
    "Operations Management|supply chain",
    "Six Sigma|lean",
    "Risk Management",
    "Compliance",
    "Process Improvement|process optimization|process optimisation",
    "Strategic Planning|strategic planning",
  ],
  Security: [
    "Cybersecurity|cyber security|information security|infosec",
    "Penetration Testing|pentesting|pen testing|vapt",
    "OWASP",
    "Network Security",
    "SIEM|splunk",
    "Wireshark",
    "Nmap",
    "Burp Suite",
    "Cryptography",
    "Ethical Hacking",
    "Incident Response",
    "Vulnerability Assessment",
    "Firewalls|firewall",
    "IAM|identity and access management",
    "SOC",
    "Kali Linux",
    "ISO 27001",
    "Encryption",
  ],
  "Systems & Hardware": [
    "Networking|computer networks|tcp/ip",
    "CCNA|cisco",
    "Embedded Systems|embedded",
    "IoT|internet of things",
    "Arduino",
    "Raspberry Pi",
    "RTOS",
    "PLC",
    "AutoCAD",
    "SolidWorks",
    "Simulink",
    "Verilog",
    "VHDL",
    "FPGA",
    "Blockchain",
    "Web3",
    "Ethereum",
    "Smart Contracts",
    "Unity",
    "Unreal Engine",
    "Game Development",
    "AR/VR|augmented reality|virtual reality",
  ],
};

const SOFT_RAW = [
  "Communication|communication skills|verbal communication|written communication|excellent communication",
  "Leadership|team leadership|led a team|team lead",
  "Teamwork|collaboration|team player|collaborative|cross-functional",
  "Problem Solving|problem-solving|analytical thinking|analytical skills|analytical",
  "Critical Thinking",
  "Time Management",
  "Adaptability|flexibility|quick learner|fast learner",
  "Creativity|creative thinking|innovative",
  "Mentoring|coaching|mentored",
  "Decision Making",
  "Emotional Intelligence",
  "Conflict Resolution",
  "Attention to Detail|detail-oriented|detail oriented",
  "Public Speaking|presentation skills|presentations",
  "Negotiation",
  "Ownership|accountability|initiative",
  "Self-Motivated|self-starter|self motivated",
  "Multitasking|prioritization|prioritisation",
  "Customer Focus",
];

function parseEntry(entry, category, soft = false) {
  const parts = entry.split("|").map((s) => s.trim()).filter(Boolean);
  let name = parts[0];
  let ambiguous = false;
  if (name.endsWith("!")) {
    ambiguous = true;
    name = name.slice(0, -1);
  }
  const aliases = parts.slice(1).map((a) => a.toLowerCase());
  return { name, category, soft, ambiguous, terms: [name.toLowerCase(), ...aliases] };
}

const SKILLS = [];
for (const [category, entries] of Object.entries(RAW)) {
  for (const e of entries) SKILLS.push(parseEntry(e, category));
}
const SOFT_SKILLS = SOFT_RAW.map((e) => parseEntry(e, "Soft Skills", true));

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\\/]/g, "\\$&");

// Boundaries that treat letters/digits and "+#" as part of a token, so that
// "java" does not match inside "javascript" and "c" never matches "c++" parts.
const LB = "(?<![a-z0-9+#.])";
const RB = "(?![a-z0-9+#]|\\.[a-z0-9])";

function termRegex(term) {
  // flexible whitespace/hyphen between words
  const body = escapeRe(term).replace(/\\?[\s-]+/g, "[\\s\\-]+");
  return new RegExp(`${LB}${body}${RB}`, "gi");
}

// Context a list-like mention must appear in for ambiguous single-letter terms.
function ambiguousRegex(term) {
  const t = escapeRe(term);
  return new RegExp(
    `(?:^|[,;|/•·▪●\\n(:\\-–])\\s*${t}\\s*(?=$|[,;|/•·▪●\\n):\\-–])`,
    "gm"
  );
}

for (const s of [...SKILLS, ...SOFT_SKILLS]) {
  // Ambiguous skills: the canonical (case-sensitive) name only counts inside
  // list-like context; their explicit aliases (e.g. "golang") are unambiguous.
  s.regexes = s.ambiguous
    ? [ambiguousRegex(s.name), ...s.terms.slice(1).map(termRegex)]
    : s.terms.map(termRegex);
}

const BY_NAME = new Map([...SKILLS, ...SOFT_SKILLS].map((s) => [s.name.toLowerCase(), s]));

/** Canonical display name for any alias or spelling, or null if unknown. */
function canonicalName(raw) {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  if (BY_NAME.has(key)) return BY_NAME.get(key).name;
  for (const s of [...SKILLS, ...SOFT_SKILLS]) {
    if (s.terms.includes(key)) return s.name;
  }
  return null;
}

function categoryOf(name) {
  const s = BY_NAME.get(String(name).toLowerCase());
  return s ? s.category : null;
}

/**
 * Finds every known skill in `text`.
 * Returns [{ name, category, count, soft }] sorted by count desc.
 */
function findSkills(text, { includeSoft = false } = {}) {
  if (!text) return [];
  const hay = String(text);
  const pool = includeSoft ? [...SKILLS, ...SOFT_SKILLS] : SKILLS;
  const out = [];
  for (const s of pool) {
    let count = 0;
    for (const re of s.regexes) {
      re.lastIndex = 0;
      const m = hay.match(re);
      if (m) count += m.length;
    }
    if (count > 0) out.push({ name: s.name, category: s.category, soft: s.soft, count });
  }
  return out.sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function findSoftSkills(text) {
  if (!text) return [];
  const hay = String(text);
  const out = [];
  for (const s of SOFT_SKILLS) {
    let count = 0;
    for (const re of s.regexes) {
      re.lastIndex = 0;
      const m = hay.match(re);
      if (m) count += m.length;
    }
    if (count > 0) out.push({ name: s.name, category: s.category, soft: true, count });
  }
  return out.sort((a, b) => b.count - a.count);
}

const VAGUE = new Set(["Full Stack Development", "Web Development", "Debugging", "Technical Documentation", "Open Source", "Code Review", "Monitoring", "Responsive Design", "Mobile Development", "Data Analysis", "Strategic Planning"]);
/** Concrete, recruiter-friendly skills first (drops vague umbrella terms when possible). */
function headlineSkills(list) {
  const concrete = list.filter((s) => !VAGUE.has(s.name || s));
  return concrete.length >= 3 ? concrete : list;
}

module.exports = {
  headlineSkills,
  SKILLS,
  SOFT_SKILLS,
  findSkills,
  findSoftSkills,
  canonicalName,
  categoryOf,
};
