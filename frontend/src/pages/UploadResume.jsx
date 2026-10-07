import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FiPlay, FiAlertTriangle, FiRefreshCw, FiCheck } from "react-icons/fi";
import UploadCard from "../components/UploadCard";
import { validateResumeFile } from "../utils/validateFile";
import AnalysisReport from "../components/AnalysisReport";
import Button from "../components/Button";
import { uploadResume, analyzeSampleResume, reanalyzeResume } from "../services/resumeService";
import { getErrorMessage } from "../services/api";

const STAGES = [
  "Uploading your file",
  "Reading text and layout",
  "Detecting sections, skills and contact info",
  "Scoring against ATS rules",
  "Writing insights",
];

function Progress({ stage, pct }) {
  return (
    <div className="card max-w-xl mx-auto p-8" role="status" aria-live="polite">
      <div className="h-2 rounded-full bg-white/5 overflow-hidden mb-6">
        <div className="h-full bg-gradient-to-r from-indigo-400 to-cyan-400 transition-all duration-700" style={{ width: `${Math.min(100, ((stage + 1) / STAGES.length) * 100)}%` }} />
      </div>
      <ul className="space-y-3">
        {STAGES.map((s, i) => (
          <li key={s} className={`flex items-center gap-3 text-sm ${i <= stage ? "text-white" : "text-slate-600"}`}>
            {i < stage ? (
              <FiCheck className="text-emerald-400" />
            ) : i === stage ? (
              <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-indigo-300 animate-spin" />
            ) : (
              <span className="h-4 w-4 rounded-full border border-white/10" />
            )}
            {s}
            {i === 0 && pct != null && pct < 100 && <span className="text-xs text-slate-500">{pct}%</span>}
          </li>
        ))}
      </ul>
      <p className="text-xs text-slate-500 mt-6">
        If Gemini is busy we automatically retry and fall back to PrepAI&apos;s built-in Smart Engine — your analysis will not fail.
      </p>
    </div>
  );
}

function UploadResume() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [stage, setStage] = useState(0);
  const [pct, setPct] = useState(null);
  const [result, setResult] = useState(null);
  const [notResume, setNotResume] = useState(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => clearInterval(timer.current), []);

  const startStages = () => {
    setStage(0);
    clearInterval(timer.current);
    timer.current = setInterval(() => setStage((s) => Math.min(s + 1, STAGES.length - 1)), 1600);
  };

  const finish = (data) => {
    clearInterval(timer.current);
    localStorage.setItem("prepai_resume_id", data.resumeId);
    setResult({ ...data });
    setLoading(false);
    setPct(null);
    if (data.meta?.source === "local") toast("Analysis ready — powered by the Smart Engine (Gemini is busy).", { icon: "⚙️" });
    else toast.success("Resume analyzed!");
  };

  const fail = (err) => {
    clearInterval(timer.current);
    setLoading(false);
    setPct(null);
    const data = err.response?.data;
    if (data?.code === "NOT_A_RESUME") {
      setNotResume(data.message);
      return;
    }
    toast.error(getErrorMessage(err, "Could not analyze that file."));
  };

  const run = async (f, force = false) => {
    setResult(null);
    setNotResume(null);
    setLoading(true);
    setPct(0);
    startStages();
    try {
      const res = await uploadResume(f, (p) => setPct(p), { force });
      finish(res.data);
    } catch (err) {
      fail(err);
    }
  };

  const onFile = (f) => {
    const problem = validateResumeFile(f);
    if (problem) {
      toast.error(problem);
      return;
    }
    setFile(f);
    run(f);
  };

  const runSample = async () => {
    setFile(null);
    setResult(null);
    setNotResume(null);
    setLoading(true);
    setPct(null);
    startStages();
    try {
      const res = await analyzeSampleResume();
      finish(res.data);
    } catch (err) {
      fail(err);
    }
  };

  const enhance = async () => {
    if (!result?.resumeId) return;
    setReanalyzing(true);
    try {
      const res = await reanalyzeResume(result.resumeId);
      setResult((r) => ({ ...r, analysis: res.data.analysis, meta: res.data.meta?.source === "local" && !res.data.improved ? r.meta : res.data.meta }));
      if (res.data.improved) toast.success(res.data.message);
      else toast(res.data.message, { icon: "⏳" });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setReanalyzing(false);
    }
  };

  const reset = () => {
    setResult(null);
    setFile(null);
    setNotResume(null);
  };

  return (
    <div className="space-y-8">
      {!result && !loading && (
        <>
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-bold font-display text-white">
              Get your resume <span className="text-gradient">ATS-ready</span> in seconds
            </h2>
            <p className="text-slate-400 mt-3">
              Section-by-section analysis, 18 ATS checks, skill extraction and role-fit — all explained, and always available.
            </p>
          </div>
          <UploadCard file={file} loading={loading} onFile={onFile} />
          <div className="text-center">
            <p className="text-sm text-slate-500 mb-3">No resume handy?</p>
            <Button variant="ghost" icon={FiPlay} onClick={runSample}>Try with a demo resume</Button>
          </div>
        </>
      )}

      {notResume && (
        <div className="card max-w-xl mx-auto p-6 border-amber-400/30">
          <div className="flex gap-3">
            <FiAlertTriangle className="text-amber-300 shrink-0 mt-0.5" size={22} />
            <div>
              <h3 className="font-semibold text-white">This doesn&apos;t look like a resume</h3>
              <p className="text-sm text-slate-400 mt-1">{notResume}</p>
              <div className="flex gap-3 mt-4">
                <Button variant="ghost" onClick={reset}>Choose another file</Button>
                <Button variant="outline" onClick={() => file && run(file, true)}>Analyze anyway</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && <Progress stage={stage} pct={pct} />}

      {result && (
        <>
          <div className="flex justify-end no-print">
            <Button variant="ghost" icon={FiRefreshCw} onClick={reset}>Analyze another resume</Button>
          </div>
          <AnalysisReport
            analysis={result.analysis}
            meta={result.meta}
            resumeId={result.resumeId}
            name={result.originalName || file?.name}
            onReanalyze={enhance}
            reanalyzing={reanalyzing}
          />
        </>
      )}
    </div>
  );
}

export default UploadResume;
