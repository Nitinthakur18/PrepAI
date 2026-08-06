# PrepAI — AI-Powered Resume & Interview Prep Platform

PrepAI helps job seekers analyze their resume, score it against ATS systems,
match it to a job description, generate custom interview questions, run a
live AI-scored mock interview, and build a clean exportable resume — all in
one place.

## ✨ Features

- **Resume Upload + AI Analysis** — PDF/DOCX parsing, Gemini-powered ATS
  scoring, skill extraction, strengths/weaknesses, and suggestions.
- **Job Description Matching** — keyword/skill coverage score against a
  pasted job description, with matched/missing skills.
- **AI Interview Question Generator** — generates a tailored question bank
  (technical, behavioral, situational) for any target role.
- **AI Mock Interview** — a live, one-question-at-a-time simulated interview
  where Gemini scores every answer and produces a final performance report.
- **Dashboard Analytics** — ATS score trend, skill-category radar,
  most-common missing skills, and a recent activity feed.
- **Resume Builder** — build a resume with a live preview and export it to
  PDF client-side.
- **History** — every resume analysis and interview session is saved and
  browsable, with delete support.
- **Authentication** — JWT-based register/login, so your history is tied to
  your account.

## 🧱 Stack

- **Frontend:** React 19, Vite, Tailwind CSS v4, Framer Motion, Recharts,
  React Router, Axios, react-hot-toast, jsPDF + html2canvas.
- **Backend:** Node.js, Express 5, Mongoose (MongoDB Atlas), JWT auth,
  Multer (uploads), pdf-parse + mammoth (PDF/DOCX text extraction),
  Google Gemini (`@google/genai`).

## 📁 Project Structure

```
PrepAI/
├── backend/          Express API (auth, resumes, matching, interviews, analytics)
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
| `GEMINI_API_KEY` | Google Gemini API key (https://aistudio.google.com/apikey) |
| `PORT` | Defaults to 3000 |
| `CLIENT_ORIGIN` | Comma-separated allowed frontend origin(s) for CORS in production |

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
| POST | `/api/auth/register` | Create an account |
| POST | `/api/auth/login` | Log in, returns a JWT |
| GET | `/api/auth/me` | Current user (auth required) |
| PUT | `/api/auth/me` | Update profile |
| POST | `/api/resume/upload` | Upload + AI-analyze a resume |
| GET | `/api/resume/history` | List past resume analyses |
| GET/DELETE | `/api/resume/:id` | Fetch / delete a resume |
| POST | `/api/resume/match` | Match a resume against a job description |
| POST | `/api/interview/questions` | Generate an interview question bank |
| POST | `/api/interview/mock/start` | Start a mock interview session |
| POST | `/api/interview/mock/answer` | Submit + AI-score one answer |
| POST | `/api/interview/mock/finish` | Finish and get the final report |
| GET | `/api/interview/history` | List past interview sessions |
| GET | `/api/analytics/dashboard` | Dashboard stats/analytics |

## 📄 License

ISC — do whatever you'd like with this.
