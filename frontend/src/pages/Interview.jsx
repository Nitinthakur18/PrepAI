import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiMic, FiChevronDown, FiPlay, FiDownload, FiCopy } from "react-icons/fi";
import Button from "../components/Button";
import ResumeSelect from "../components/ResumeSelect";
import SourceBadge from "../components/SourceBadge";
import { Chip, Panel } from "../components/ui";
import useResumes from "../hooks/useResumes";
import { generateQuestions } from "../services/interviewService";
import { getErrorMessage } from "../services/api";
import { downloadTextFile } from "../utils/pdfReport";

const DIFF_TONE = { Easy: "emerald", Medium: "amber", Hard: "red" };
const CAT_TONE = { Technical: "indigo", Behavioral: "violet", Situational: "cyan", "Role-specific": "amber" };
const inputCls =
  "w-full rounded-xl bg-[#0b0f1d] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/60";

function Interview() {
  const location = useLocation();
  const navigate = useNavigate();
  const { resumes, loading, selectedId, setSelectedId } = useResumes();
  const [role, setRole] = useState(location.state?.role || "");
  const [jd, setJd] = useState(location.state?.jobDescription || "");
  const [count, setCount] = useState(10);
  const [useResume, setUseResume] = useState(true);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("All");
  const [open, setOpen] = useState({});

  const categories = useMemo(() => ["All", ...new Set((data?.questions || []).map((q) => q.category))], [data]);
  const shown = (data?.questions || []).filter((q) => filter === "All" || q.category === filter);

  const generate = async () => {
    if (!role.trim()) return toast.error("Enter the role you're preparing for.");
    setBusy(true);
    try {
      const res = await generateQuestions({
        role: role.trim(),
        jobDescription: jd.trim(),
        count,
        resumeId: useResume && selectedId ? selectedId : undefined,
      });
      setData(res.data);
      setFilter("All");
      setOpen({});
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not generate questions."));
    } finally {
      setBusy(false);
    }
  };

  const asText = () =>
    (data?.questions || [])
      .map((q, i) => `${i + 1}. [${q.category} · ${q.difficulty}] ${q.question}${q.idealAnswerTips ? `\n   Tip: ${q.idealAnswerTips}` : ""}`)
      .join("\n\n");

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
          Interview <span className="text-gradient">question bank</span>
        </h2>
        <p className="text-slate-400 mt-2">Role-specific questions personalised to your resume and the job — with tips on what a strong answer covers.</p>
      </div>

      <Panel title="Set up" icon={FiMic}>
        <div className="grid md:grid-cols-[1fr,auto] gap-3">
          <input className={inputCls} placeholder="Target role, e.g. Full Stack Developer" value={role} maxLength={120} onChange={(e) => setRole(e.target.value)} aria-label="Target role" />
          <select value={count} onChange={(e) => setCount(Number(e.target.value))} className={`${inputCls} md:w-44`} aria-label="Number of questions">
            {[5, 8, 10, 15, 20].map((n) => <option key={n} value={n}>{n} questions</option>)}
          </select>
        </div>
        <textarea className={`${inputCls} mt-3 resize-y`} rows={4} placeholder="Paste the job description (optional — makes questions much more relevant)" value={jd} maxLength={8000} onChange={(e) => setJd(e.target.value)} aria-label="Job description" />
        {resumes.length > 0 && (
          <div className="mt-4 grid md:grid-cols-[auto,1fr] gap-4 items-end">
            <label className="flex items-center gap-2 text-sm text-slate-300 pb-3">
              <input type="checkbox" checked={useResume} onChange={(e) => setUseResume(e.target.checked)} className="accent-indigo-500" />
              Personalise with my resume
            </label>
            {useResume && <ResumeSelect resumes={resumes} loading={loading} selectedId={selectedId} onChange={setSelectedId} label="" />}
          </div>
        )}
        <div className="flex flex-wrap gap-3 justify-end mt-5">
          <Button onClick={generate} loading={busy} icon={FiPlay}>Generate questions</Button>
        </div>
      </Panel>

      {busy && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-2xl bg-white/5 animate-pulse" />)}
        </div>
      )}

      {data && !busy && (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2 items-center">
              {categories.map((c) => (
                <button key={c} onClick={() => setFilter(c)} className={`px-3 py-1.5 rounded-lg text-xs border transition ${filter === c ? "bg-indigo-500/20 border-indigo-400/40 text-white" : "bg-white/5 border-white/10 text-slate-400 hover:text-white"}`}>
                  {c}
                </button>
              ))}
              <SourceBadge meta={data.meta} />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" icon={FiCopy} className="!py-2" onClick={() => navigator.clipboard.writeText(asText()).then(() => toast.success("Copied all questions"))}>Copy all</Button>
              <Button variant="ghost" icon={FiDownload} className="!py-2" onClick={() => downloadTextFile(asText(), `interview-questions-${role.replace(/\s+/g, "-")}.txt`)}>Download</Button>
              <Button icon={FiMic} className="!py-2" onClick={() => navigate("/mock-interview", { state: { role, jobDescription: jd, count: Math.min(8, count), autostart: false } })}>Mock interview</Button>
            </div>
          </div>

          <div className="space-y-3">
            {shown.map((q, i) => {
              const key = `${q.category}-${i}-${q.question.slice(0, 20)}`;
              const isOpen = !!open[key];
              return (
                <div key={key} className="card p-5">
                  <button className="w-full flex items-start justify-between gap-4 text-left" onClick={() => setOpen((o) => ({ ...o, [key]: !o[key] }))} aria-expanded={isOpen}>
                    <div>
                      <div className="flex gap-2 mb-2">
                        <Chip tone={CAT_TONE[q.category] || "slate"}>{q.category}</Chip>
                        <Chip tone={DIFF_TONE[q.difficulty] || "slate"}>{q.difficulty}</Chip>
                      </div>
                      <p className="text-white font-medium leading-relaxed">{q.question}</p>
                    </div>
                    <FiChevronDown className={`shrink-0 mt-1 text-slate-400 transition ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <div className="mt-4 pt-4 border-t border-white/5 text-sm text-slate-300 leading-relaxed">
                      <p className="text-xs text-slate-500 mb-1">What a strong answer covers</p>
                      {q.idealAnswerTips || "Answer directly, give a concrete example from your experience, and finish with the result."}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

export default Interview;
