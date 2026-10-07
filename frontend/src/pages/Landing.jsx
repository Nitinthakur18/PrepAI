import { Link } from "react-router-dom";
import {
  FiZap, FiFileText, FiTarget, FiMic, FiMail, FiBriefcase, FiShield, FiCpu, FiTrendingUp,
  FiGitMerge, FiCheckCircle, FiArrowRight, FiLayers,
} from "react-icons/fi";
import AIStatusBadge from "../components/AIStatusBadge";

const FEATURES = [
  { icon: FiFileText, title: "ATS resume analysis", text: "Section-by-section parsing, 18 ATS checks, skill extraction and an explainable 100-point score — the same resume always gets the same score." },
  { icon: FiTarget, title: "Job match engine", text: "Required vs. preferred skills, experience and education requirements, keyword gaps and a learning roadmap for every missing skill." },
  { icon: FiMic, title: "Voice mock interviews", text: "Timed questions, speak or type your answers, rubric scoring, model answers and a full performance report." },
  { icon: FiMail, title: "Career toolkit", text: "Tailored cover letters, stronger resume bullets, LinkedIn headlines and a 60-second “tell me about yourself” pitch." },
  { icon: FiBriefcase, title: "Job tracker", text: "A drag-and-drop board for every application, with match scores, follow-up dates and response-rate stats." },
  { icon: FiGitMerge, title: "Version compare", text: "See exactly what improved between two versions of your resume: score, categories and skills." },
];

const PIPELINE = [
  { icon: FiLayers, title: "Your request", note: "Upload, match or practise" },
  { icon: FiZap, title: "Gemini", note: "Retries with backoff, rotates keys" },
  { icon: FiCpu, title: "Backup models", note: "Auto-switch on 429 / 503" },
  { icon: FiShield, title: "Smart Engine", note: "Offline rule-based fallback" },
  { icon: FiCheckCircle, title: "Result", note: "Always delivered" },
];

function Landing() {
  return (
    <div className="min-h-screen bg-bg bg-grid text-slate-200 overflow-x-hidden">
      <div className="pointer-events-none fixed top-[-12%] right-[-10%] w-[560px] h-[560px] bg-indigo-600/25 blur-[150px] rounded-full" />
      <div className="pointer-events-none fixed bottom-[-12%] left-[-8%] w-[480px] h-[480px] bg-cyan-500/15 blur-[150px] rounded-full" />

      <header className="relative z-10 max-w-6xl mx-auto flex items-center justify-between px-5 py-6">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-400 flex items-center justify-center shadow-lg shadow-indigo-500/30"><FiZap className="text-white" size={18} /></div>
          <span className="text-xl font-display font-bold text-white">Prep<span className="text-gradient">AI</span></span>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/login" className="px-4 py-2 text-sm text-slate-300 hover:text-white">Sign in</Link>
          <Link to="/register" className="btn-primary px-5 py-2.5 rounded-xl text-sm font-semibold">Get started</Link>
        </nav>
      </header>

      <main className="relative z-10">
        {/* Hero */}
        <section className="max-w-6xl mx-auto px-5 pt-10 pb-20 grid lg:grid-cols-[1.1fr,0.9fr] gap-12 items-center">
          <div>
            <AIStatusBadge className="mb-5" />
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold font-display text-white leading-[1.05]">
              Your resume, analysed. <span className="text-gradient">Your interview, rehearsed.</span>
            </h1>
            <p className="text-lg text-slate-400 mt-6 max-w-xl leading-relaxed">
              PrepAI scores your resume like an ATS, matches it to real job posts, writes your cover letters and runs voice mock interviews —
              and it keeps working even when the AI behind it is overloaded.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <Link to="/register" className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl font-semibold">Start free <FiArrowRight /></Link>
              <Link to="/login" className="inline-flex items-center px-7 py-3.5 rounded-2xl bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10">I have an account</Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-400">
              {["No credit card", "Demo resume built in", "Private by design"].map((t) => <li key={t} className="flex items-center gap-2"><FiCheckCircle className="text-emerald-400" /> {t}</li>)}
            </ul>
          </div>

          {/* Product preview */}
          <div className="card p-6 sm:p-7 relative" aria-hidden="true">
            <div className="flex items-center gap-5">
              <div className="relative h-28 w-28 shrink-0">
                <svg viewBox="0 0 100 100" className="-rotate-90 h-full w-full"><circle cx="50" cy="50" r="42" stroke="rgba(255,255,255,.08)" strokeWidth="9" fill="none" /><circle cx="50" cy="50" r="42" stroke="#34d399" strokeWidth="9" strokeLinecap="round" fill="none" strokeDasharray="264" strokeDashoffset="42" /></svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center"><span className="text-3xl font-bold text-white font-display">84</span><span className="text-[10px] text-slate-400">ATS score</span></div>
              </div>
              <div>
                <p className="text-white font-semibold">Aarav Mehta · Full-Stack Developer</p>
                <p className="text-xs text-slate-400 mt-1">Junior · 2.7 yrs · 16 skills found</p>
                <div className="flex gap-1.5 mt-3 flex-wrap">{["React", "Node.js", "MongoDB", "Docker"].map((s) => <span key={s} className="px-2 py-0.5 rounded-md text-[11px] bg-indigo-500/15 border border-indigo-400/25 text-indigo-200">{s}</span>)}</div>
              </div>
            </div>
            <div className="mt-6 space-y-3">
              {[["Formatting & contact", 20, 20], ["Skills coverage", 19, 20], ["Experience & achievements", 15, 20], ["Keywords & impact", 14, 20]].map(([l, v, m]) => (
                <div key={l}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1"><span>{l}</span><span>{v}/{m}</span></div>
                  <div className="h-1.5 rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-indigo-400 to-cyan-400" style={{ width: `${(v / m) * 100}%` }} /></div>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl bg-amber-400/10 border border-amber-400/20 px-3 py-2 text-xs text-amber-100">
              💡 Only 1 of 10 bullets has a number — quantify results to stand out.
            </div>
          </div>
        </section>

        {/* Resilience pipeline */}
        <section className="max-w-6xl mx-auto px-5 pb-24">
          <div className="card p-6 sm:p-10">
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-white">Built so the AI can fail — and you never notice</h2>
            <p className="text-slate-400 mt-3 max-w-2xl">Most AI apps break the moment their model is overloaded. PrepAI treats that as a normal day: every request travels through a fallback chain.</p>
            <div className="mt-10 grid gap-4 md:grid-cols-5 items-start">
              {PIPELINE.map(({ icon: Icon, title, note }, i) => (
                <div key={title} className="relative">
                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 h-full">
                    <div className="h-9 w-9 rounded-xl bg-indigo-500/20 flex items-center justify-center mb-3"><Icon className="text-indigo-200" size={17} /></div>
                    <p className="text-sm font-semibold text-white">{title}</p>
                    <p className="text-xs text-slate-400 mt-1 leading-relaxed">{note}</p>
                  </div>
                  {i < PIPELINE.length - 1 && (
                    <div className="hidden md:block absolute top-1/2 -right-4 w-4 flow-track" style={{ "--flow-distance": "16px" }}><span className="flow-dot" /></div>
                  )}
                </div>
              ))}
            </div>
            <div className="grid sm:grid-cols-3 gap-4 mt-8 text-sm">
              {[["Retries & backoff", "Transient 503s are retried with jitter before giving up."], ["Circuit breaker", "During an outage requests skip Gemini and answer instantly."], ["Cache & de-dup", "Identical requests are served from cache — fewer calls, fewer limits."]].map(([t, d]) => (
                <div key={t} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4"><p className="font-semibold text-white">{t}</p><p className="text-slate-400 text-xs mt-1 leading-relaxed">{d}</p></div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="max-w-6xl mx-auto px-5 pb-24">
          <h2 className="text-2xl sm:text-3xl font-bold font-display text-white mb-8">Everything for the job hunt, in one place</h2>
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="card p-6 hover:-translate-y-1 hover:border-indigo-400/30 transition">
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500/30 to-cyan-400/20 flex items-center justify-center mb-4"><Icon className="text-indigo-200" size={18} /></div>
                <h3 className="font-semibold text-white">{title}</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Steps */}
        <section className="max-w-6xl mx-auto px-5 pb-24">
          <div className="grid md:grid-cols-3 gap-5">
            {[["1", "Upload (or try the demo)", "Drop a PDF or DOCX. Non-resumes are detected before anything is scored."], ["2", "Match it to a job", "Paste a job post and see matched skills, gaps and exactly what to change."], ["3", "Practise and apply", "Rehearse with voice interviews, generate cover letters, track every application."]].map(([n, t, d]) => (
              <div key={n} className="card p-6">
                <span className="h-9 w-9 rounded-full bg-indigo-500/20 text-indigo-200 font-bold flex items-center justify-center">{n}</span>
                <h3 className="font-semibold text-white mt-4">{t}</h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
          <div className="card p-8 sm:p-12 mt-10 text-center bg-gradient-to-br from-indigo-600/20 via-violet-600/10 to-transparent">
            <FiTrendingUp className="mx-auto text-cyan-300" size={28} />
            <h2 className="text-2xl sm:text-3xl font-bold font-display text-white mt-4">Know where you stand in 30 seconds</h2>
            <Link to="/register" className="btn-primary inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl font-semibold mt-6">Create your free account <FiArrowRight /></Link>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-white/5 py-8 text-center text-xs text-slate-500">PrepAI · React, Node.js, MongoDB and Gemini, with a built-in offline engine.</footer>
    </div>
  );
}

export default Landing;
