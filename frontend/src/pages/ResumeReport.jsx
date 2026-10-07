import { useCallback, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import toast from "react-hot-toast";
import AnalysisReport from "../components/AnalysisReport";
import ErrorState from "../components/ErrorState";
import Skeleton from "../components/Skeleton";
import { getResumeById, reanalyzeResume } from "../services/resumeService";
import { getErrorMessage } from "../services/api";

function ResumeReport() {
  const { id } = useParams();
  const [resume, setResume] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getResumeById(id);
      setResume(res.data.data);
      localStorage.setItem("prepai_resume_id", id);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const enhance = async () => {
    setBusy(true);
    try {
      const res = await reanalyzeResume(id);
      setResume((r) => ({ ...r, analysis: res.data.analysis }));
      toast(res.data.message, { icon: res.data.improved ? "✨" : "⏳" });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <Skeleton className="h-96 w-full" />;
  if (error) {
    return (
      <ErrorState
        title={error.response?.status === 404 ? "Resume not found" : "Couldn't load this report"}
        description={getErrorMessage(error)}
        onRetry={error.response?.status === 404 ? undefined : load}
      />
    );
  }
  return (
    <div className="space-y-4">
      <Link to="/history" className="text-sm text-slate-400 hover:text-white">← Back to history</Link>
      <AnalysisReport
        analysis={resume.analysis}
        resumeId={resume._id}
        name={resume.originalName || resume.filename}
        onReanalyze={enhance}
        reanalyzing={busy}
      />
    </div>
  );
}

export default ResumeReport;
