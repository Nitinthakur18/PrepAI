/**
 * Role profiles: weighted skill expectations per career path.
 * weight 3 = core, 2 = important, 1 = nice-to-have.
 * `family` links to the interview question families.
 */
const PROFILES = [
  {
    role: "Full-Stack Developer", family: "web",
    skills: { JavaScript: 3, React: 3, "Node.js": 3, HTML: 2, CSS: 2, "REST API": 3, Git: 2, MongoDB: 2, SQL: 2, "Express.js": 2, TypeScript: 2, Docker: 1, AWS: 1, "Next.js": 1, "CI/CD": 1, PostgreSQL: 1, "Tailwind CSS": 1, "Unit Testing": 1 },
  },
  {
    role: "Frontend Developer", family: "web",
    skills: { JavaScript: 3, React: 3, HTML: 3, CSS: 3, TypeScript: 2, "Responsive Design": 2, Git: 2, "Tailwind CSS": 1, "Next.js": 1, Redux: 1, "Web Accessibility": 1, Figma: 1, Webpack: 1, Vite: 1, Jest: 1, "REST API": 2 },
  },
  {
    role: "Backend Developer", family: "web",
    skills: { "Node.js": 2, Python: 2, Java: 2, "REST API": 3, SQL: 3, MongoDB: 1, PostgreSQL: 2, "Express.js": 1, Django: 1, "Spring Boot": 1, Docker: 2, Git: 2, Redis: 1, Microservices: 1, "System Design": 2, AWS: 1, JWT: 1, "Unit Testing": 1, "Database Design": 2 },
  },
  {
    role: "Software Engineer", family: "web",
    skills: { Python: 2, Java: 2, "C++": 2, JavaScript: 2, "Data Structures": 3, OOP: 3, Git: 2, SQL: 2, "System Design": 2, "Design Patterns": 1, "Unit Testing": 1, Linux: 1, "REST API": 1, Docker: 1, Agile: 1, "Code Review": 1, Debugging: 1 },
  },
  {
    role: "Data Analyst", family: "data",
    skills: { SQL: 3, Excel: 3, Python: 2, "Power BI": 2, Tableau: 2, Pandas: 2, "Data Visualization": 3, "Data Analysis": 3, Statistics: 2, NumPy: 1, "Data Cleaning": 1, "A/B Testing": 1, "Google Analytics": 1, ETL: 1, Looker: 1 },
  },
  {
    role: "Data Scientist", family: "data",
    skills: { Python: 3, "Machine Learning": 3, Statistics: 3, Pandas: 2, NumPy: 2, "scikit-learn": 3, SQL: 2, "Data Visualization": 2, "Deep Learning": 2, TensorFlow: 1, PyTorch: 1, "Feature Engineering": 1, Jupyter: 1, "A/B Testing": 1, NLP: 1, "Data Cleaning": 1 },
  },
  {
    role: "Machine Learning / AI Engineer", family: "data",
    skills: { Python: 3, "Machine Learning": 3, "Deep Learning": 3, PyTorch: 2, TensorFlow: 2, "scikit-learn": 2, NLP: 2, "Computer Vision": 1, LLM: 2, "Generative AI": 1, MLOps: 1, Docker: 1, "Hugging Face": 1, LangChain: 1, RAG: 1, Git: 1, SQL: 1 },
  },
  {
    role: "DevOps / Cloud Engineer", family: "devops",
    skills: { Docker: 3, Kubernetes: 3, AWS: 3, "CI/CD": 3, Linux: 3, Terraform: 2, Jenkins: 2, "GitHub Actions": 1, Ansible: 1, Bash: 2, Git: 2, Monitoring: 2, Prometheus: 1, Grafana: 1, Nginx: 1, Azure: 1, GCP: 1, "Infrastructure as Code": 2, Python: 1 },
  },
  {
    role: "Mobile App Developer", family: "mobile",
    skills: { "React Native": 2, Flutter: 2, Android: 2, iOS: 2, Kotlin: 2, Swift: 2, Dart: 1, Firebase: 2, "REST API": 2, Git: 2, "Mobile Development": 3, "Jetpack Compose": 1, SwiftUI: 1, JavaScript: 1, "Unit Testing": 1 },
  },
  {
    role: "QA / Test Engineer", family: "qa",
    skills: { "Test Automation": 3, Selenium: 3, "Manual Testing": 2, Postman: 2, JIRA: 2, "Test Cases": 2, Cypress: 2, Playwright: 1, JUnit: 1, PyTest: 1, SQL: 1, "Regression Testing": 2, "Bug Tracking": 2, Agile: 1, JMeter: 1, Appium: 1, QA: 2, Git: 1 },
  },
  {
    role: "UI/UX Designer", family: "design",
    skills: { Figma: 3, "UI Design": 3, "UX Design": 3, "User Research": 2, Wireframing: 2, Prototyping: 3, "Design Systems": 2, "Usability Testing": 2, "Adobe XD": 1, Sketch: 1, "Interaction Design": 1, Typography: 1, "Information Architecture": 1, "Web Accessibility": 1, HTML: 1, CSS: 1 },
  },
  {
    role: "Product Manager", family: "product",
    skills: { "Product Management": 3, "Product Roadmap": 3, "User Stories": 2, "Stakeholder Management": 3, "Market Research": 2, "Competitive Analysis": 1, Agile: 2, Scrum: 1, JIRA: 1, KPIs: 2, OKRs: 1, "Data Analysis": 2, SQL: 1, "A/B Testing": 1, "Project Management": 2, "Strategic Planning": 1 },
  },
  {
    role: "Business Analyst", family: "business",
    skills: { "Business Analysis": 3, "Requirements Gathering": 3, SQL: 2, Excel: 3, "Data Analysis": 2, "Power BI": 1, Tableau: 1, JIRA: 1, "User Stories": 2, "Stakeholder Management": 2, "Process Improvement": 2, "Project Management": 1, Agile: 1, "Financial Modeling": 1, KPIs: 1, Confluence: 1 },
  },
  {
    role: "Digital Marketer", family: "marketing",
    skills: { "Digital Marketing": 3, SEO: 3, "Google Ads": 2, "Social Media Marketing": 2, "Content Marketing": 2, "Google Analytics": 3, "Email Marketing": 2, "Content Writing": 2, Canva: 1, HubSpot: 1, CRM: 1, "Market Research": 1, "A/B Testing": 1, "Lead Generation": 1 },
  },
  {
    role: "Cybersecurity Analyst", family: "security",
    skills: { Cybersecurity: 3, "Network Security": 3, "Penetration Testing": 2, OWASP: 2, SIEM: 2, Wireshark: 1, Nmap: 1, "Incident Response": 2, "Vulnerability Assessment": 2, Linux: 2, "Ethical Hacking": 1, Cryptography: 1, Firewalls: 1, "Burp Suite": 1, Networking: 2, Python: 1, "Kali Linux": 1 },
  },
];

module.exports = { PROFILES };
