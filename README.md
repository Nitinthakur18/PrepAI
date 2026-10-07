# PrepAI — AI-Powered Resume & Interview Prep Platform

PrepAI helps job seekers analyze their resume, score it against ATS systems,
match it to a job description, generate custom interview questions, run a
live AI-scored mock interview, and build a clean exportable resume — all in
one place.

## ✨ Features

**Analysis**
- **Resume analysis** — PDF/DOCX parsing, an explainable 100-point ATS score
  (5 categories), **18 ATS checks** (contact info, sections, length, bullets,
  quantified results, action verbs, weak phrases, buzzwords, symbols…),
  skill extraction grouped by area (350+ skills with aliases), role-fit
  across 15 career paths, strengths/weaknesses and prioritised suggestions.
- **"Is this a resume?" detection** — question papers, invoices and other
  documents are rejected *before* scoring or spending AI quota.
- **Job match engine** — required vs. preferred skills, keyword extraction
  beyond the skills list, experience-years and education requirement checks,
  title alignment, semantic similarity, tailored bullets and a **learning
  roadmap** (effort estimates + official docs) for every gap.
- **Resume compare** — see what improved between two versions.
- **PDF reports** — download the analysis or job-match report.

**Practice**
- **Question bank** — role-specific, personalised to your resume and the job.
- **Voice mock interview** — timed answers, speak or type (Web Speech API),
  question read-aloud, rubric scoring (relevance, structure, specificity,
  depth, clarity), model answers, resumable sessions and a full report.

**Apply**
- **Career toolkit** — cover letter (3 tones), bullet improver, LinkedIn
  headline/About, 60-second interview pitch.
- **Job tracker** — drag-and-drop Kanban with match scores, next-step dates
  and response-rate stats.

**Platform**
- **Dashboard** — career-readiness score, streak, next-best-actions, ATS
  trend, interview category strengths, skill gaps, activity feed.
- **Account tools** — change password, export all data, delete account.
- **Landing page**, resume builder, history with search/sort.

## 🛡️ Reliability: the AI can fail, the app can't

Gemini returns 503/429 under load. PrepAI is built so that never reaches the
user. Every AI feature follows the same contract (`backend/services/aiService.js`):

```
request ─► Smart Engine computes the deterministic result (instant, free)
        ─► Gemini enriches it through the resilient gateway
              • model fallback chain      (GEMINI_MODELS)
              • API-key rotation          (GEMINI_API_KEYS)
              • retries + jittered exponential backoff, server retry hints
              • per-attempt timeout + total time budget
              • per-model / per-key cooldowns after 429 / auth / 404
              • circuit breaker  → during an outage requests answer instantly
              • concurrency limiter, LRU+TTL cache, in-flight de-duplication
              • tolerant JSON repair, auto-retry on malformed output
        ─► anything wrong? use the Smart Engine result, flag it in the UI
```

- The **Smart Engine** (`backend/services/engine/`) is a complete offline
  implementation of every feature: resume parser, scorer, JD matcher,
  interview bank, answer grader, cover letters, roadmap. No API key needed.
- Scores are **rule-based and reproducible**; Gemini adds content-quality
  review (blended 65/35) and qualitative insights.
- The UI always shows where a result came from (Gemini or Smart Engine) and
  offers **"Enhance with AI"** to upgrade a result once Gemini is back.
- A live **AI status badge** and a **Test AI connection** button show the
  health of each model, cooldowns and the circuit breaker.
- Other safety nets: MongoDB reconnects with backoff instead of crashing
  (API answers 503 meanwhile), uploaded files are deleted after text
  extraction, prompt-injection text in resumes is treated as data, and a React
  error boundary prevents white screens.

## 🧱 Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Framer Motion, Recharts,
  React Router, Axios, react-hot-toast, jsPDF + html2canvas.
- **Backend:** Node.js, Express 5, Mongoose (MongoDB Atlas), JWT auth, a custom
  resilient Gemini gateway + offline Smart Engine,
  Multer (uploads), pdf-parse + mammoth (PDF/DOCX text extraction),
  Google Gemini (`@google/genai`).

## 📁 Project Structure

```
PrepAI/
├── backend/          Express API
│   ├── utils/gemini.js          resilient Gemini gateway (retries, fallback, circuit breaker)
│   └── services/engine/         offline Smart Engine (parser, scorer, matcher, interviews…)
├── frontend/          React + Vite SPA
└── docker-compose.yml Local full-stack orchestration
```

## 🚀 Local Setup

### 1. Backend

```bash
cd backend
cp .env.example .env   # then fill in your real values
npm install
npm run dev             # nodemon, http://localhost:3000
```

Required environment variables (see `backend/.env.example`):

| Variable | Description |
|---|---|
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_SECRET` | Long random string used to sign auth tokens |
| `GEMINI_API_KEY` | Google Gemini API key (https://aistudio.google.com/apikey). **Optional** — without it the app runs on the Smart Engine |
| `PORT` | Defaults to 3000 |
| `CLIENT_ORIGIN` | Comma-separated allowed frontend origin(s) for CORS in production |

Optional resilience settings (`GEMINI_API_KEYS`, `GEMINI_MODELS`, `AI_TIMEOUT_MS`,
`AI_DISABLED`, …) are documented in `backend/.env.example`.

> ⚠️ **Rotate your credentials.** If you previously committed a `.env` file
> with real values to git or shared it anywhere, treat that Mongo password
> and Gemini key as compromised and regenerate both.

### 2. Frontend

```bash
cd frontend
cp .env.example .env   # points at your backend, defaults to localhost:3000
npm install
npm run dev             # http://localhost:5173
```

### 3. Or run both with Docker Compose

```bash
cp backend/.env.example backend/.env   # fill in real values first
docker compose up --build
```

- Frontend → http://localhost:5173
- Backend → http://localhost:3000

## ☁️ Deployment

This app deploys as two independent services plus MongoDB Atlas (already
cloud-hosted, no separate deployment needed).

### MongoDB Atlas
1. Create a free cluster at https://cloud.mongodb.com.
2. Add a database user and allow network access from your hosting
   provider's IP range (or `0.0.0.0/0` for simplicity, tightened later).
3. Copy the connection string into `MONGODB_URI`.

### Backend (Render / Railway / Fly.io / any Node host)
1. Point the service at the `backend/` directory.
2. Build command: `npm install`. Start command: `npm start`.
3. Set the environment variables from `backend/.env.example`.
4. Alternatively deploy the included `backend/Dockerfile` directly.
5. Note: uploaded files are stored on local disk (`backend/uploads`), which
   is fine for a single instance but **not persistent** across redeploys on
   most platforms. For production durability, swap the disk storage in
   `middleware/upload.js` for an object store (e.g. S3/Cloudinary) — the
   resume's extracted *text* is what's actually used for AI analysis and is
   already saved in MongoDB regardless.

### Frontend (Vercel / Netlify / Cloudflare Pages)
1. Point the service at the `frontend/` directory.
2. Build command: `npm run build`. Output directory: `dist`.
3. Set `VITE_API_URL` to your deployed backend's URL, e.g.
   `https://your-backend.onrender.com/api`.
4. Alternatively build the included `frontend/Dockerfile` (nginx-served)
   with `--build-arg VITE_API_URL=https://your-backend.onrender.com/api`.

### CORS
Set `CLIENT_ORIGIN` on the backend to your deployed frontend URL(s)
(comma-separated for multiple), e.g.
`CLIENT_ORIGIN=https://prepai.vercel.app`.

## 🔒 Security Notes

- Passwords are hashed with bcrypt; sessions use JWTs (7 day expiry by
  default, configurable via `JWT_EXPIRES_IN`).
- File uploads are restricted to PDF/DOCX, capped at 10MB.
- `helmet`, request logging (`morgan`), and basic rate limiting are enabled
  on the API.
- Never commit a real `.env` file — only `.env.example` files are checked
  in on purpose.

## 🗺️ API Overview

| Method | Route | Description |
|---|---|---|
| GET | `/api/health` · `/api/health/ai` | Server/DB status · Gemini + Smart Engine status (public) |
| POST | `/api/ai/test` | Live Gemini probe (auth) |
| POST | `/api/auth/register` · `/login` | Create account · log in (JWT) |
| GET/PUT/DELETE | `/api/auth/me` | Profile · update · delete account + data |
| PUT | `/api/auth/password` | Change password |
| POST | `/api/resume/upload` | Upload + analyze (`force=true` to analyze a non-resume) |
| POST | `/api/resume/sample` | Analyze the built-in demo resume |
| POST | `/api/resume/:id/reanalyze` | Retry the AI pass for an existing resume |
| GET | `/api/resume/history` · `/compare?a=&b=` · `/:id` | List · compare two · fetch one |
| DELETE | `/api/resume/:id` | Delete a resume |
| POST | `/api/resume/match` | Match a resume against a job description |
| POST | `/api/interview/questions` | Generate a question bank |
| POST | `/api/interview/mock/start` · `/answer` · `/finish` | Mock interview flow |
| GET/DELETE | `/api/interview/history` · `/:id` | Interview sessions |
| POST | `/api/tools/cover-letter` · `/bullets` · `/linkedin` · `/pitch` · `/roadmap` | Career toolkit |
| GET/POST/PUT/DELETE | `/api/tracker` · `/api/tracker/stats` | Job application tracker |
| GET | `/api/analytics/dashboard` | Dashboard analytics |

## 🧪 Tests

```bash
cd backend && npm test      # 110 tests: gateway resilience, engine, API, security
cd frontend && npm run lint
```

The suite simulates Gemini 503s, 429s, timeouts, malformed output and a total
outage, and verifies every endpoint still succeeds. It also covers upload
(real PDF extraction), ownership/IDOR protection and the engine's scoring.

## 📄 License

ISC — do whatever you'd like with this.
