import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FiTarget, FiArrowRight, FiUploadCloud } from "react-icons/fi";
import Button from "../components/Button";
import { matchJobDescription } from "../services/resumeService";

function JobDescription() {
  const navigate = useNavigate();

  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAnalyze = async () => {
    const resumeId = localStorage.getItem("resumeId");

    if (!resumeId) {
      toast.error("Please upload your resume first.");
      navigate("/upload");
      return;
    }

    if (!jobDescription.trim()) {
      toast.error("Please enter a job description.");
      return;
    }

    try {
      setLoading(true);
      const res = await matchJobDescription(resumeId, jobDescription);
      localStorage.setItem("atsResult", JSON.stringify(res.data.data));
      toast.success("Match analysis ready!");
      navigate("/ats");
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-indigo-300 mb-3">
          <FiTarget size={20} />
          <span className="uppercase text-xs tracking-widest font-semibold">
            Job Match
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white font-display">
          Paste the Job Description
        </h1>
        <p className="text-slate-400 mt-3">
          We'll compare it against your most recently uploaded resume and
          calculate keyword coverage.
        </p>
      </div>

      <div className="card p-6 sm:p-8">
        <textarea
          rows={14}
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="Paste the complete job description here..."
          className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm text-slate-200 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/50 transition resize-none"
        />

        <div className="flex flex-col sm:flex-row gap-3 mt-6">
          <Button
            onClick={handleAnalyze}
            disabled={loading}
            loading={loading}
            icon={FiArrowRight}
          >
            {loading ? "Analyzing..." : "Analyze Match"}
          </Button>
          <Button
            variant="ghost"
            icon={FiUploadCloud}
            onClick={() => navigate("/upload")}
          >
            Upload a different resume
          </Button>
        </div>
      </div>
    </div>
  );
}

export default JobDescription;
