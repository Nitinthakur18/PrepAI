import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiTarget, FiFileText } from "react-icons/fi";
import Button from "../components/Button";
import ResumeSelect from "../components/ResumeSelect";
import { Panel } from "../components/ui";
import useResumes from "../hooks/useResumes";
import { matchJobDescription } from "../services/resumeService";
import { getErrorMessage } from "../services/api";
import { SAMPLE_JD } from "../utils/sampleJD";

const MAX = 20000;
const inputCls =
  "w-full rounded-xl bg-[#0b0f1d] border border-white/10 px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-400/60";

function JobDescription() {
  const navigate = useNavigate();
  const location = useLocation();
  const { resumes, loading, selectedId, setSelectedId, selected } = useResumes();
  const [jd, setJd] = useState(location.state?.jobDescription || "");
  const [title, setTitle] = useState(location.state?.jobTitle || "");
  const [company, setCompany] = useState(location.state?.company || "");
  const [busy, setBusy] = useState(false);

  const words = jd.trim() ? jd.trim().split(/\s+/).length : 0;

  const analyze = async () => {
    if (!selectedId) return toast.error("Choose a resume first.");
    if (jd.trim().length < 40) return toast.error("Paste a fuller job description (a few lines at least).");
    setBusy(true);
    try {
      const res = await matchJobDescription(selectedId, jd.trim(), { jobTitle: title.trim(), company: company.trim() });
      sessionStorage.setItem(
        "prepai_match",
        JSON.stringify({
          result: res.data.data,
          meta: res.data.meta,
          resumeId: selectedId,
          resumeName: selected?.originalName || selected?.filename || "Resume",
          jobDescription: jd.trim(),
        })
      );
      navigate("/ats");
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not run the match."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold text-white font-display">
          How well do you match <span className="text-gradient">this job?</span>
        </h2>
        <p className="text-slate-400 mt-2">
          Paste a job description. We weight required vs. preferred skills, check experience and education
          requirements, and show exactly what to fix.
        </p>
      </div>

      <Panel title="1 · Choose resume" icon={FiFileText}>
        <ResumeSelect resumes={resumes} loading={loading} selectedId={selectedId} onChange={setSelectedId} />
      </Panel>

      <Panel
        title="2 · Job description"
        icon={FiTarget}
        right={
          <button type="button" onClick={() => { setJd(SAMPLE_JD); setTitle("Full Stack Developer"); }} className="text-xs text-indigo-300 hover:text-indigo-200 underline">
            Use a sample job
          </button>
        }
      >
        <div className="grid sm:grid-cols-2 gap-3 mb-3">
          <input className={inputCls} placeholder="Job title (optional)" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} aria-label="Job title" />
          <input className={inputCls} placeholder="Company (optional)" value={company} maxLength={120} onChange={(e) => setCompany(e.target.value)} aria-label="Company" />
        </div>
        <textarea
          value={jd}
          maxLength={MAX}
          onChange={(e) => setJd(e.target.value)}
          rows={14}
          placeholder="Paste the full job description here — responsibilities, requirements and nice-to-haves all help."
          className={`${inputCls} resize-y leading-relaxed`}
          aria-label="Job description"
        />
        <div className="flex items-center justify-between mt-3 text-xs text-slate-500">
          <span>{words} words</span>
          <span>{jd.length.toLocaleString()} / {MAX.toLocaleString()}</span>
        </div>
      </Panel>

      <div className="flex justify-end">
        <Button onClick={analyze} loading={busy} disabled={!selectedId} icon={FiTarget} className="px-8">
          Analyze match
        </Button>
      </div>
    </div>
  );
}

export default JobDescription;
