# PrepAI — presentation guide

A 6-minute walkthrough that shows the project is far beyond "upload a resume and call an API".

## 0. Before you start (1 min)
- Backend + frontend running, an account created.
- Optional but impressive: have **two** terminals visible — one with the backend logs.

## 1. The problem and the idea (30 s)
"Most AI resume tools are a thin wrapper around one API call. When the API is overloaded they just break.
PrepAI is built so the AI can fail and the product still works."

## 2. Resume analysis (90 s)
1. **Upload** page → click **Try with a demo resume** (or drop a real PDF).
2. Walk through the report: score gauge → *How this is scored* (rule-based + AI blend) → **ATS checks** tab → **Career fit** tab.
3. Point out: "Same resume = same score. Every point is explained."
4. Upload a **non-resume PDF** (e.g. an assignment) → it's rejected with "doesn't look like a resume".

## 3. The reliability demo (90 s) — the "wow" moment
1. Open **Settings → AI system status**: models, circuit breaker, cache hits.
2. Stop Gemini on purpose: in `backend/.env` set `AI_DISABLED=true` (or use a wrong key) and restart the backend.
3. Upload / match / run a mock interview again → everything still works. The result badge now says **Smart Engine**.
4. Restore the setting, restart, and press **Enhance with AI** → the same report is upgraded with Gemini insights.

Talking points: model fallback chain, key rotation, exponential backoff with jitter, circuit breaker, cache, de-duplication, offline engine.

## 4. Job match + roadmap (60 s)
**Job Match** → *Use a sample job* → show required vs. preferred skills, requirement checks, tailored bullets and the **learning roadmap** with effort estimates. Click **Save to tracker**.

## 5. Interview practice (60 s)
**Mock Interview** → start 4 questions → click the 🎙 **Speak** button and answer aloud → show the rubric, model answer and the final report.

## 6. Apply (30 s)
**Career Tools** → cover letter + bullet improver. **Job Tracker** → drag a card between columns.

## 7. Engineering proof (30 s)
```bash
cd backend && npm test      # 110 tests, incl. simulated Gemini outages
```
Mention: ownership checks on every resource, prompt-injection defence, uploads deleted after parsing, rate limiting, DB auto-reconnect, error boundary.

## Likely questions
- **"Is the AI doing the scoring?"** The score is deterministic and explainable (rule-based); Gemini contributes a content-quality review (35%) and insights.
- **"What if Gemini changes/deletes a model?"** A 404 disables that model and the next in `GEMINI_MODELS` is used.
- **"How do you stop prompt injection in resumes?"** Resume text is wrapped as untrusted data and the model is told never to follow it; output is validated and normalised.
