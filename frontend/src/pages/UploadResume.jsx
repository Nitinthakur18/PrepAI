import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiAward,
  FiTrendingUp,
  FiCheckCircle,
  FiAlertTriangle,
  FiArrowRight,
} from "react-icons/fi";
import UploadCard from "../components/UploadCard";
import Button from "../components/Button";
import ScoreGauge from "../components/ScoreGauge";
import { uploadResume } from "../services/resumeService";

function UploadResume() {
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [analysis, setAnalysis] = useState(null);

  const getProgressWidth = (score) => `${(score / 20) * 100}%`;

  const handleUpload = async () => {
    if (!file) {
      toast.error("Please select a resume first.");
      return;
    }

    setLoading(true);
    setProgress(0);
    setAnalysis(null);

    try {
      const res = await uploadResume(file, setProgress);
      localStorage.setItem("resumeId", res.data.resumeId);
      setAnalysis(res.data.analysis);
      toast.success("Analysis completed successfully!");
    } catch (error) {
      toast.error(
        error.response?.data?.message || error.message || "Upload failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-white font-display">
          Analyze Your Resume
        </h1>
        <p className="text-slate-400 mt-3 text-base sm:text-lg">
          Get an instant AI-powered ATS score, skill breakdown, and
          personalized suggestions.
        </p>
      </div>

      <UploadCard
        file={file}
        loading={loading}
        onFileChange={(e) => setFile(e.target.files[0])}
      />

      <div className="flex flex-col items-center gap-3">
        <Button
          disabled={!file || loading}
          onClick={handleUpload}
          loading={loading}
          className="px-10 py-4 text-base"
        >
          {loading ? "Analyzing Resume..." : "✨ Analyze Resume"}
        </Button>
        {loading && (
          <div className="w-64 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {analysis && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-6"
        >
          <div className="card p-8 sm:p-10 bg-gradient-to-br from-indigo-600/25 via-violet-600/10 to-transparent text-center">
            <div className="flex items-center justify-center gap-2 text-indigo-300 mb-4">
              <FiAward size={22} />
              <span className="uppercase text-xs tracking-widest font-semibold">
                ATS Score
              </span>
            </div>
            <div className="flex justify-center">
              <ScoreGauge score={analysis.atsScore} size={180} suffix="" label="/ 100" />
            </div>
            <p className="text-lg mt-4 font-semibold text-white">
              {analysis.atsScore >= 90
                ? "Outstanding 🚀"
                : analysis.atsScore >= 80
                ? "Excellent 🎯"
                : analysis.atsScore >= 70
                ? "Good 👍"
                : "Needs Improvement ⚠️"}
            </p>
            <Button
              variant="outline"
              className="mt-6"
              icon={FiArrowRight}
              onClick={() => navigate("/jobdescription")}
            >
              Match against a job description
            </Button>
          </div>

          <div className="card p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <FiTrendingUp size={20} className="text-indigo-300" />
              <h2 className="text-xl font-bold text-white font-display">
                Score Breakdown
              </h2>
            </div>
            {Object.entries(analysis.scoreBreakdown || {}).map(
              ([key, value]) => (
                <div key={key} className="mb-5 last:mb-0">
                  <div className="flex justify-between mb-2 text-sm">
                    <span className="capitalize font-semibold text-slate-200">
                      {key}
                    </span>
                    <span className="text-slate-400">{value}/20</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-white/10">
                    <div
                      className="h-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-cyan-400 transition-all duration-1000"
                      style={{ width: getProgressWidth(value) }}
                    />
                  </div>
                </div>
              )
            )}
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-6 sm:p-8">
              <h2 className="text-lg font-bold mb-4 text-white font-display">
                📄 Professional Summary
              </h2>
              <p className="text-slate-300 leading-7 text-sm">
                {analysis.summary}
              </p>
            </div>

            <div className="card p-6 sm:p-8">
              <h2 className="text-lg font-bold mb-4 text-white font-display">
                📈 Experience Level
              </h2>
              <span className="inline-block bg-amber-500/15 text-amber-300 border border-amber-500/30 px-4 py-2 rounded-full font-semibold text-sm">
                {analysis.experienceLevel}
              </span>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <h2 className="text-lg font-bold mb-5 text-white font-display">
              💻 Technical Skills
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {analysis.technicalSkills?.map((skill, index) => (
                <span
                  key={index}
                  className="px-3.5 py-1.5 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <h2 className="text-lg font-bold mb-5 text-white font-display">
              🤝 Soft Skills
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {analysis.softSkills?.map((skill, index) => (
                <span
                  key={index}
                  className="px-3.5 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <div className="card p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-5">
                <FiCheckCircle className="text-emerald-400" size={22} />
                <h2 className="text-lg font-bold text-white font-display">
                  Strengths
                </h2>
              </div>
              <ul className="space-y-3">
                {analysis.strengths?.map((item, index) => (
                  <li key={index} className="flex gap-3 text-sm text-slate-300">
                    <span className="text-emerald-400">✔</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="card p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-5">
                <FiAlertTriangle className="text-amber-400" size={22} />
                <h2 className="text-lg font-bold text-white font-display">
                  Weaknesses
                </h2>
              </div>
              <ul className="space-y-3">
                {analysis.weaknesses?.map((item, index) => (
                  <li key={index} className="flex gap-3 text-sm text-slate-300">
                    <span className="text-amber-400">⚠</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="card p-6 sm:p-8">
            <h2 className="text-lg font-bold mb-5 text-white font-display">
              💡 Resume Improvement Suggestions
            </h2>
            <ol className="space-y-3 list-decimal list-inside text-slate-300 text-sm">
              {analysis.suggestions?.map((item, index) => (
                <li key={index} className="leading-6">
                  {item}
                </li>
              ))}
            </ol>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default UploadResume;
