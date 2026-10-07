import { useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { FiMail, FiEdit3, FiLinkedin, FiMic, FiDownload, FiArrowRight } from "react-icons/fi";
import Button from "../components/Button";
import ResumeSelect from "../components/ResumeSelect";
import SourceBadge from "../components/SourceBadge";
import CopyButton from "../components/CopyButton";
import { Chip, Tabs, Panel, Bar } from "../components/ui";
import useResumes from "../hooks/useResumes";
import { generateCoverLetter, improveBullets, generateLinkedIn, generatePitch } from "../services/toolsService";
import { getErrorMessage } from "../services/api";
import { downloadTextFile } from "../utils/pdfReport";

const inputCls =
  "w-full rounded-xl bg-[#0b0f1d] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/60";

function useTool(fn) {
  const [busy, setBusy] = useState(false);
  const [out, setOut] = useState(null);
  const run = async (payload, fallbackMsg) => {
    setBusy(true);
    try {
      const res = await fn(payload);
      setOut({ data: res.data.data, meta: res.data.meta });
    } catch (err) {
      toast.error(getErrorMessage(err, fallbackMsg));
    } finally {
      setBusy(false);
    }
  };
  return { busy, out, run };
}

function CoverLetterTab({ resumeId, preset }) {
  const [title, setTitle] = useState(preset.jobTitle || "");
  const [company, setCompany] = useState(preset.company || "");
  const [jd, setJd] = useState(preset.jobDescription || "");
  const [tone, setTone] = useState("professional");
  const { busy, out, run } = useTool(generateCoverLetter);
  const [text, setText] = useState("");

  const go = async () => {
    if (!resumeId) return toast.error("Choose a resume first.");
    await run({ resumeId, jobTitle: title, company, jobDescription: jd, tone }, "Could not write the cover letter.");
  };
  const shown = out ? (text || out.data.letter) : "";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Details" icon={FiMail}>
        <div className="grid sm:grid-cols-2 gap-3">
          <input className={inputCls} placeholder="Job title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Job title" />
          <input className={inputCls} placeholder="Company" value={company} onChange={(e) => setCompany(e.target.value)} aria-label="Company" />
        </div>
        <textarea className={`${inputCls} mt-3 resize-y`} rows={8} placeholder="Paste the job description (optional, but it makes the letter far more specific)" value={jd} maxLength={8000} onChange={(e) => setJd(e.target.value)} aria-label="Job description" />
        <div className="flex flex-wrap gap-2 mt-3">
          {["professional", "enthusiastic", "concise"].map((t) => (
            <button key={t} onClick={() => setTone(t)} className={`px-3 py-1.5 rounded-lg text-xs border capitalize ${tone === t ? "bg-indigo-500/20 border-indigo-400/40 text-white" : "bg-white/5 border-white/10 text-slate-400"}`}>{t}</button>
          ))}
        </div>
        <Button className="mt-5 w-full" loading={busy} onClick={go} icon={FiArrowRight}>Write cover letter</Button>
      </Panel>
      <Panel title="Your letter" right={out && <div className="flex items-center gap-2"><SourceBadge meta={out.meta} /><CopyButton text={shown} /><button onClick={() => downloadTextFile(shown, "cover-letter.txt")} className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300" aria-label="Download"><FiDownload size={14} /></button></div>}>
        {out ? (
          <>
            <p className="text-xs text-slate-500 mb-2">Subject: <span className="text-slate-300">{out.data.subject}</span></p>
            <textarea className={`${inputCls} leading-relaxed`} rows={18} value={shown} onChange={(e) => setText(e.target.value)} aria-label="Cover letter text (editable)" />
            <p className="text-xs text-slate-500 mt-2">{out.data.wordCount} words · edit freely before sending</p>
          </>
        ) : <p className="text-sm text-slate-500">Your tailored letter will appear here. It only uses facts from your resume.</p>}
      </Panel>
    </div>
  );
}

function BulletsTab() {
  const [text, setText] = useState("Responsible for testing the website\nWorked on bug fixes in the legacy codebase\nHelped team with deployments");
  const [role, setRole] = useState("");
  const { busy, out, run } = useTool(improveBullets);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Paste your bullets" icon={FiEdit3}>
        <textarea className={`${inputCls} resize-y`} rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder="One bullet per line" aria-label="Resume bullets" />
        <input className={`${inputCls} mt-3`} placeholder="Target role (optional)" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Target role" />
        <Button className="mt-5 w-full" loading={busy} icon={FiArrowRight} onClick={() => run({ bullets: text, targetRole: role }, "Could not improve those bullets.")}>Improve bullets</Button>
        <p className="text-xs text-slate-500 mt-3">We never invent numbers — you&apos;ll see [placeholders] to fill with your real results.</p>
      </Panel>
      <Panel title="Stronger versions" right={out && <SourceBadge meta={out.meta} />}>
        {out ? (
          <div className="space-y-4">
            {out.data.items.map((b, i) => (
              <div key={i} className="rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-sm">
                <p className="text-rose-200/70 line-through decoration-rose-400/40">{b.original}</p>
                <div className="flex items-start justify-between gap-3 mt-2">
                  <p className="text-emerald-200 leading-relaxed">{b.improved}</p>
                  <CopyButton text={b.improved} />
                </div>
                <div className="mt-3"><Bar value={b.scoreAfter} label="Bullet strength" right={`${b.scoreBefore} → ${b.scoreAfter}`} tone="indigo" /></div>
                {b.notes?.length > 0 && <ul className="mt-2 text-xs text-slate-400 list-disc list-inside space-y-0.5">{b.notes.map((n, j) => <li key={j}>{n}</li>)}</ul>}
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-slate-500">Weak openers become strong verbs and every bullet gets a strength score.</p>}
      </Panel>
    </div>
  );
}

function LinkedInTab({ resumeId }) {
  const [role, setRole] = useState("");
  const { busy, out, run } = useTool(generateLinkedIn);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title="Target" icon={FiLinkedin}>
        <input className={inputCls} placeholder="Target role (optional)" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Target role" />
        <Button className="mt-5 w-full" loading={busy} icon={FiArrowRight} onClick={() => resumeId ? run({ resumeId, targetRole: role }, "Could not generate LinkedIn copy.") : toast.error("Choose a resume first.")}>Generate profile copy</Button>
      </Panel>
      <div className="space-y-6">
        <Panel title="Headline options" right={out && <SourceBadge meta={out.meta} />}>
          {out ? (
            <div className="space-y-3">
              {out.data.headlines.map((h, i) => (
                <div key={i} className="flex justify-between gap-3 items-start rounded-2xl bg-white/[0.03] border border-white/5 p-4 text-sm text-slate-200"><span>{h}</span><CopyButton text={h} /></div>
              ))}
            </div>
          ) : <p className="text-sm text-slate-500">Three headline options (max ~120 characters).</p>}
        </Panel>
        {out && (
          <Panel title="About section" right={<CopyButton text={out.data.about} />}>
            <p className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{out.data.about}</p>
            {out.data.skills?.length > 0 && <div className="flex flex-wrap gap-1.5 mt-4">{out.data.skills.map((s) => <Chip key={s}>{s}</Chip>)}</div>}
          </Panel>
        )}
      </div>
    </div>
  );
}

function PitchTab({ resumeId }) {
  const [role, setRole] = useState("");
  const { busy, out, run } = useTool(generatePitch);
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Panel title={'"Tell me about yourself"'} icon={FiMic}>
        <input className={inputCls} placeholder="Role you're interviewing for (optional)" value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" />
        <Button className="mt-5 w-full" loading={busy} icon={FiArrowRight} onClick={() => resumeId ? run({ resumeId, targetRole: role }, "Could not write the pitch.") : toast.error("Choose a resume first.")}>Write my 60-second pitch</Button>
      </Panel>
      <Panel title="Your pitch" right={out && <div className="flex items-center gap-2"><SourceBadge meta={out.meta} /><CopyButton text={out.data.script} /></div>}>
        {out ? (
          <>
            <p className="text-slate-200 leading-relaxed">{out.data.script}</p>
            <p className="text-xs text-slate-500 mt-3">{out.data.wordCount} words · roughly {Math.round(out.data.wordCount / 2.3)} seconds spoken</p>
            <ul className="mt-4 text-xs text-slate-400 list-disc list-inside space-y-1">{out.data.tips.map((t, i) => <li key={i}>{t}</li>)}</ul>
          </>
        ) : <p className="text-sm text-slate-500">A spoken-style answer in present → past → future order, built from your resume.</p>}
      </Panel>
    </div>
  );
}

function CareerTools() {
  const location = useLocation();
  const preset = location.state || {};
  const [tab, setTab] = useState(preset.tab || "cover");
  const { resumes, loading, selectedId, setSelectedId } = useResumes();

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">Career <span className="text-gradient">toolkit</span></h2>
        <p className="text-slate-400 mt-2">Everything you write for an application, generated from your own resume — and available even when Gemini is busy.</p>
      </div>
      {tab !== "bullets" && (
        <div className="max-w-xl"><ResumeSelect resumes={resumes} loading={loading} selectedId={selectedId} onChange={setSelectedId} /></div>
      )}
      <Tabs active={tab} onChange={setTab} tabs={[
        { id: "cover", label: "Cover letter" },
        { id: "bullets", label: "Bullet improver" },
        { id: "linkedin", label: "LinkedIn" },
        { id: "pitch", label: "Interview pitch" },
      ]} />
      {tab === "cover" && <CoverLetterTab resumeId={selectedId} preset={preset} />}
      {tab === "bullets" && <BulletsTab />}
      {tab === "linkedin" && <LinkedInTab resumeId={selectedId} />}
      {tab === "pitch" && <PitchTab resumeId={selectedId} />}
    </div>
  );
}

export default CareerTools;
