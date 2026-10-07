import { useCallback, useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiMic, FiMicOff, FiVolume2, FiSkipForward, FiSend, FiArrowRight, FiClock, FiRefreshCw,
  FiDownload, FiAward, FiPlay, FiChevronDown, FiTrendingUp,
} from "react-icons/fi";
import Button from "../components/Button";
import ResumeSelect from "../components/ResumeSelect";
import SourceBadge from "../components/SourceBadge";
import ScoreGauge from "../components/ScoreGauge";
import { Chip, Bar, Panel, BulletList } from "../components/ui";
import useResumes from "../hooks/useResumes";
import useSpeech from "../hooks/useSpeech";
import { startMockInterview, submitAnswer, finishMockInterview } from "../services/interviewService";
import { getErrorMessage } from "../services/api";
import { downloadTextFile } from "../utils/pdfReport";

const SESSION_KEY = "prepai_mock_session";
const DIFF_TONE = { Easy: "emerald", Medium: "amber", Hard: "red" };
const CAT_TONE = { Technical: "indigo", Behavioral: "violet", Situational: "cyan", "Role-specific": "amber" };
const RUBRIC_LABELS = { relevance: "Relevance", structure: "Structure", specificity: "Specificity", depth: "Depth", clarity: "Clarity" };
const inputCls =
  "w-full rounded-xl bg-[#0b0f1d] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/60";

const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const scoreTone = (s) => (s >= 7.5 ? "text-emerald-300" : s >= 5 ? "text-amber-300" : "text-rose-300");

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function MockInterview() {
  const location = useLocation();
  const { resumes, loading: resumesLoading, selectedId, setSelectedId } = useResumes();
  const speech = useSpeech();

  const [phase, setPhase] = useState("setup"); // setup | running | report
  const [role, setRole] = useState(location.state?.role || "");
  const [jd, setJd] = useState(location.state?.jobDescription || "");
  const [count, setCount] = useState(location.state?.count || 6);
  const [useResume, setUseResume] = useState(true);
  const [busy, setBusy] = useState(false);

  const [session, setSession] = useState(null); // { interviewId, role, questions }
  const [idx, setIdx] = useState(0);
  const [answer, setAnswer] = useState("");
  const [interim, setInterim] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [results, setResults] = useState({}); // idx -> { answer, score, ... } | { skipped: true }
  const [report, setReport] = useState(null);
  const [saved, setSaved] = useState(() => loadSession());

  const q = session?.questions?.[idx];
  const total = session?.questions?.length || 0;
  const running = phase === "running";

  // Per-question timer (stops when feedback is shown).
  useEffect(() => {
    if (!running || feedback) return undefined;
    const id = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(id);
  }, [running, feedback, idx]);

  const persist = useCallback((s, i, r) => {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ session: s, idx: i, results: r, at: Date.now() }));
  }, []);

  const resetQuestion = () => {
    setAnswer("");
    setInterim("");
    setElapsed(0);
    setFeedback(null);
    speech.stop();
    speech.cancelSpeak();
  };

  const start = async () => {
    if (!role.trim()) return toast.error("Enter the role you're interviewing for.");
    setBusy(true);
    try {
      const res = await startMockInterview({
        role: role.trim(),
        jobDescription: jd.trim(),
        count,
        resumeId: useResume && selectedId ? selectedId : undefined,
      });
      const s = { interviewId: res.data.interviewId, role: role.trim(), questions: res.data.questions, meta: res.data.meta };
      setSession(s);
      setIdx(0);
      setResults({});
      resetQuestion();
      setPhase("running");
      persist(s, 0, {});
      setSaved(null);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not start the interview."));
    } finally {
      setBusy(false);
    }
  };

  const resume = () => {
    if (!saved) return;
    setSession(saved.session);
    setIdx(saved.idx);
    setResults(saved.results || {});
    resetQuestion();
    setPhase("running");
    setSaved(null);
  };

  const discard = () => {
    localStorage.removeItem(SESSION_KEY);
    setSaved(null);
  };

  const toggleMic = () => {
    if (speech.listening) {
      speech.stop();
      setInterim("");
      return;
    }
    speech.dictate((finalText, interimText) => {
      if (finalText) setAnswer((a) => `${a}${a && !a.endsWith(" ") ? " " : ""}${finalText.trim()}`);
      setInterim(interimText);
    });
  };

  const finish = async () => {
    setBusy(true);
    try {
      const res = await finishMockInterview({ interviewId: session.interviewId });
      setReport(res.data.data);
      setPhase("report");
      localStorage.removeItem(SESSION_KEY);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not build the report."));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    const text = answer.trim();
    if (text.length < 5) return toast.error("Write (or speak) an answer first — or skip this question.");
    speech.stop();
    setBusy(true);
    try {
      const res = await submitAnswer({ interviewId: session.interviewId, questionIndex: idx, answer: text, durationSec: elapsed });
      const fb = res.data;
      setFeedback(fb);
      const next = { ...results, [idx]: { answer: text, durationSec: elapsed, ...fb } };
      setResults(next);
      persist(session, idx, next);
    } catch (err) {
      toast.error(`${getErrorMessage(err, "Could not score that answer.")} Your answer is kept — try again.`);
    } finally {
      setBusy(false);
    }
  };

  const skip = () => {
    const next = { ...results, [idx]: { skipped: true } };
    setResults(next);
    advance(next);
  };

  const advance = (r = results) => {
    if (idx < total - 1) {
      const n = idx + 1;
      setIdx(n);
      resetQuestion();
      persist(session, n, r);
    } else {
      finish();
    }
  };

  const downloadReport = () => {
    if (!report) return;
    const lines = [
      `PrepAI mock interview — ${report.role}`,
      `Overall score: ${report.overallScore}/10`,
      "",
      report.summary,
      "",
      ...(report.report?.nextSteps || []).map((s) => `• ${s}`),
      "",
      ...report.questions.map((x, i) => `Q${i + 1} [${x.category}] ${x.question}\nYour answer: ${x.answer || "(skipped)"}\nScore: ${x.score ?? "n/a"}/10\nFeedback: ${x.feedback || "-"}\n`),
    ];
    downloadTextFile(lines.join("\n"), "prepai-mock-interview.txt");
  };

  const restart = () => {
    setPhase("setup");
    setSession(null);
    setReport(null);
    setResults({});
    resetQuestion();
  };

  /* --------------------------------- setup --------------------------------- */
  if (phase === "setup") {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
            AI <span className="text-gradient">mock interview</span>
          </h2>
          <p className="text-slate-400 mt-2">
            One question at a time with a timer. Answer by typing or speaking, then get a rubric-based score, strengths,
            improvements and a model answer.
          </p>
        </div>

        {saved && (
          <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <FiClock className="text-indigo-300 shrink-0" />
            <p className="text-sm text-indigo-100 flex-1">
              You have an unfinished interview for <b>{saved.session.role}</b> (question {saved.idx + 1} of {saved.session.questions.length}).
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" className="!py-2" onClick={discard}>Discard</Button>
              <Button className="!py-2" icon={FiPlay} onClick={resume}>Continue</Button>
            </div>
          </div>
        )}

        <Panel title="Interview setup" icon={FiMic}>
          <div className="grid md:grid-cols-[1fr,auto] gap-3">
            <input className={inputCls} placeholder="Role, e.g. Frontend Developer" value={role} maxLength={120} onChange={(e) => setRole(e.target.value)} aria-label="Role" />
            <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={`${inputCls} md:w-44`} aria-label="Number of questions">
              {[4, 6, 8, 10].map((n) => <option key={n} value={n}>{n} questions</option>)}
            </select>
          </div>
          <textarea className={`${inputCls} mt-3 resize-y`} rows={4} placeholder="Job description (optional)" value={jd} maxLength={8000} onChange={(e) => setJd(e.target.value)} aria-label="Job description" />
          {resumes.length > 0 && (
            <div className="mt-4 grid md:grid-cols-[auto,1fr] gap-4 items-end">
              <label className="flex items-center gap-2 text-sm text-slate-300 pb-3">
                <input type="checkbox" checked={useResume} onChange={(e) => setUseResume(e.target.checked)} className="accent-indigo-500" />
                Personalise with my resume
              </label>
              {useResume && <ResumeSelect resumes={resumes} loading={resumesLoading} selectedId={selectedId} onChange={setSelectedId} label="" />}
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-3 mt-5">
            <p className="text-xs text-slate-500">
              {speech.supported.stt ? "🎙️ Voice answers are supported in this browser." : "Voice input isn't supported in this browser — typing works everywhere."}
            </p>
            <Button onClick={start} loading={busy} icon={FiPlay}>Start interview</Button>
          </div>
        </Panel>
      </div>
    );
  }

  /* --------------------------------- report -------------------------------- */
  if (phase === "report" && report) {
    const rep = report.report || {};
    const answeredCount = report.questions.filter((x) => typeof x.score === "number").length;
    return (
      <div className="space-y-6">
        <div className="card p-6 sm:p-8 grid gap-8 lg:grid-cols-[auto,1fr] items-center">
          <div className="mx-auto">
            <ScoreGauge score={Math.round((report.overallScore || 0) * 10)} size={180} label={`${report.overallScore}/10 overall`} />
          </div>
          <div>
            <div className="flex flex-wrap gap-2 items-center mb-3">
              <Chip tone="indigo">{report.role}</Chip>
              <Chip>{answeredCount}/{report.questions.length} answered</Chip>
              <SourceBadge meta={rep.meta} />
            </div>
            <h2 className="text-2xl font-bold text-white font-display flex items-center gap-2"><FiAward className="text-amber-300" /> Interview report</h2>
            <p className="text-slate-300 mt-3 leading-relaxed">{report.summary}</p>
            <div className="flex flex-wrap gap-3 mt-5">
              <Button icon={FiRefreshCw} onClick={restart}>Practise again</Button>
              <Button variant="ghost" icon={FiDownload} onClick={downloadReport}>Download</Button>
              <Link to="/history" className="inline-flex items-center px-5 py-3 rounded-2xl text-sm bg-white/5 border border-white/10 text-slate-200 hover:bg-white/10">View history</Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Performance by category">
            <div className="space-y-4">
              {(rep.categoryScores || []).map((c) => (
                <Bar key={c.category} value={c.score} max={10} label={`${c.category} (${c.count})`} right={`${c.score}/10`} />
              ))}
              {!(rep.categoryScores || []).length && <p className="text-sm text-slate-500">No answered questions to score.</p>}
            </div>
          </Panel>
          <div className="space-y-6">
            <Panel title="Strengths"><BulletList items={rep.strengths || []} tone="emerald" /></Panel>
            <Panel title="Work on next" icon={FiTrendingUp}><BulletList items={[...(rep.improvements || []), ...(rep.nextSteps || [])].slice(0, 6)} tone="indigo" /></Panel>
          </div>
        </div>

        <Panel title="Question-by-question review">
          <div className="space-y-3">
            {report.questions.map((x, i) => (
              <details key={i} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 group">
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                  <div>
                    <div className="flex gap-2 mb-1.5"><Chip tone={CAT_TONE[x.category] || "slate"}>{x.category}</Chip><Chip tone={DIFF_TONE[x.difficulty] || "slate"}>{x.difficulty}</Chip></div>
                    <p className="text-sm text-white">{x.question}</p>
                  </div>
                  <span className="flex items-center gap-2 shrink-0">
                    <b className={`text-lg ${typeof x.score === "number" ? scoreTone(x.score) : "text-slate-500"}`}>{typeof x.score === "number" ? x.score : "—"}</b>
                    <FiChevronDown className="text-slate-500 group-open:rotate-180 transition" />
                  </span>
                </summary>
                <div className="mt-4 pt-4 border-t border-white/5 space-y-3 text-sm">
                  <div><p className="text-xs text-slate-500 mb-1">Your answer</p><p className="text-slate-300 whitespace-pre-wrap">{x.answer || "(skipped)"}</p></div>
                  {x.feedback && <div><p className="text-xs text-slate-500 mb-1">Feedback</p><p className="text-slate-300">{x.feedback}</p></div>}
                  {x.modelAnswer && <div><p className="text-xs text-slate-500 mb-1">Model answer</p><p className="text-emerald-200/90">{x.modelAnswer}</p></div>}
                </div>
              </details>
            ))}
          </div>
        </Panel>
      </div>
    );
  }

  /* --------------------------------- running ------------------------------- */
  if (!q) return null;
  const words = answer.trim() ? answer.trim().split(/\s+/).length : 0;
  const pace = elapsed > 150 ? "text-amber-300" : "text-slate-400";

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <div>
        <div className="flex items-center justify-between text-sm text-slate-400 mb-2">
          <span>Question {idx + 1} of {total}</span>
          <span className="flex items-center gap-3"><SourceBadge meta={session.meta} /><span className={`flex items-center gap-1.5 tabular-nums ${pace}`}><FiClock size={14} /> {fmt(elapsed)}</span></span>
        </div>
        <div className="h-1.5 rounded-full bg-white/5 overflow-hidden"><div className="h-full bg-gradient-to-r from-indigo-400 to-cyan-400 transition-all" style={{ width: `${((idx + (feedback ? 1 : 0)) / total) * 100}%` }} /></div>
      </div>

      <div className="card p-6 sm:p-8">
        <div className="flex gap-2 mb-4"><Chip tone={CAT_TONE[q.category] || "slate"}>{q.category}</Chip><Chip tone={DIFF_TONE[q.difficulty] || "slate"}>{q.difficulty}</Chip></div>
        <h2 className="text-xl sm:text-2xl font-semibold text-white font-display leading-snug">{q.question}</h2>
        {speech.supported.tts && (
          <button onClick={() => (speech.speaking ? speech.cancelSpeak() : speech.speak(q.question))} className="mt-4 inline-flex items-center gap-2 text-xs text-cyan-300 hover:text-cyan-200">
            <FiVolume2 /> {speech.speaking ? "Stop reading" : "Read question aloud"}
          </button>
        )}
      </div>

      {!feedback ? (
        <div className="card p-6">
          <textarea
            value={answer + (interim ? ` ${interim}` : "")}
            onChange={(e) => { setAnswer(e.target.value); setInterim(""); }}
            onKeyDown={(e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submit(); }}
            rows={9}
            maxLength={5000}
            placeholder="Type your answer, or press the microphone and speak it…  (Ctrl+Enter to submit)"
            className={`${inputCls} resize-y leading-relaxed`}
            aria-label="Your answer"
            disabled={busy}
          />
          <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
            <span>{words} words · aim for ~80–150</span>
            {speech.error && <span className="text-amber-300">{speech.error}</span>}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 mt-4">
            <div className="flex gap-2">
              {speech.supported.stt && (
                <Button variant={speech.listening ? "danger" : "ghost"} icon={speech.listening ? FiMicOff : FiMic} onClick={toggleMic} className="!py-2.5">
                  {speech.listening ? "Stop" : "Speak"}
                </Button>
              )}
              <Button variant="ghost" icon={FiSkipForward} onClick={skip} disabled={busy} className="!py-2.5">Skip</Button>
            </div>
            <Button icon={FiSend} loading={busy} onClick={submit}>Submit answer</Button>
          </div>
        </div>
      ) : (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-slate-500">Your score</p>
              <p className={`text-5xl font-bold font-display ${scoreTone(feedback.score)}`}>{feedback.score}<span className="text-xl text-slate-500">/10</span></p>
            </div>
            <SourceBadge meta={feedback.meta} />
          </div>
          <p className="text-slate-200 leading-relaxed">{feedback.feedback}</p>
          {feedback.rubric && (
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3">
              {Object.entries(feedback.rubric).map(([k, v]) => <Bar key={k} value={v} max={10} label={RUBRIC_LABELS[k] || k} right={`${v}/10`} />)}
            </div>
          )}
          <div className="grid sm:grid-cols-2 gap-5">
            {feedback.strengths?.length > 0 && <div><p className="text-xs text-emerald-300 mb-2 font-semibold">What worked</p><BulletList items={feedback.strengths} tone="emerald" /></div>}
            {feedback.improvements?.length > 0 && <div><p className="text-xs text-amber-300 mb-2 font-semibold">To improve</p><BulletList items={feedback.improvements} tone="amber" /></div>}
          </div>
          {feedback.modelAnswer && (
            <details className="rounded-2xl bg-white/[0.03] border border-white/5 p-4">
              <summary className="cursor-pointer text-sm text-indigo-200">See a model answer / structure</summary>
              <p className="text-sm text-slate-300 mt-3 leading-relaxed">{feedback.modelAnswer}</p>
            </details>
          )}
          <div className="flex justify-end">
            <Button icon={FiArrowRight} loading={busy} onClick={() => advance()}>{idx < total - 1 ? "Next question" : "Finish & see report"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MockInterview;
