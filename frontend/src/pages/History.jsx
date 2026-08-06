import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiFileText,
  FiMic,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiClock,
} from "react-icons/fi";
import EmptyState from "../components/EmptyState";
import { getResumeHistory, deleteResume } from "../services/resumeService";
import {
  getInterviewHistory,
  deleteInterview,
} from "../services/interviewService";

function History() {
  const [tab, setTab] = useState("resumes");
  const [resumes, setResumes] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [rRes, iRes] = await Promise.all([
        getResumeHistory(),
        getInterviewHistory(),
      ]);
      setResumes(rRes.data.data || []);
      setInterviews(iRes.data.data || []);
    } catch {
      toast.error("Failed to fetch history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const handleDeleteResume = async (id) => {
    if (!window.confirm("Delete this resume?")) return;
    try {
      await deleteResume(id);
      setResumes((prev) => prev.filter((r) => r._id !== id));
      toast.success("Resume deleted.");
    } catch {
      toast.error("Failed to delete resume.");
    }
  };

  const handleDeleteInterview = async (id) => {
    if (!window.confirm("Delete this interview session?")) return;
    try {
      await deleteInterview(id);
      setInterviews((prev) => prev.filter((i) => i._id !== id));
      toast.success("Interview deleted.");
    } catch {
      toast.error("Failed to delete interview.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-10 w-10 rounded-full border-4 border-white/10 border-t-indigo-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <div className="card p-1.5 inline-flex gap-1">
          <button
            onClick={() => setTab("resumes")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              tab === "resumes"
                ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FiFileText className="inline mr-2 -mt-0.5" size={16} />
            Resumes ({resumes.length})
          </button>
          <button
            onClick={() => setTab("interviews")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              tab === "interviews"
                ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FiMic className="inline mr-2 -mt-0.5" size={16} />
            Interviews ({interviews.length})
          </button>
        </div>
      </div>

      {tab === "resumes" &&
        (resumes.length === 0 ? (
          <EmptyState
            icon={FiFileText}
            title="No resumes yet"
            description="Upload a resume to start building your history."
            actionLabel="Upload Resume"
            actionTo="/upload"
          />
        ) : (
          <div className="space-y-4">
            {resumes.map((resume, i) => (
              <motion.div
                key={resume._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-500/15 flex items-center justify-center shrink-0">
                      <FiFileText className="text-indigo-300" size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {resume.originalName || resume.filename}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <FiClock size={12} />
                        {new Date(resume.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-sm font-bold text-emerald-300 bg-emerald-500/10 border border-emerald-500/25 px-3 py-1.5 rounded-full">
                      {resume.analysis?.atsScore ?? "N/A"}%
                    </span>
                    <button
                      onClick={() =>
                        setExpanded(expanded === resume._id ? null : resume._id)
                      }
                      className="h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
                    >
                      {expanded === resume._id ? (
                        <FiChevronUp size={16} />
                      ) : (
                        <FiChevronDown size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteResume(resume._id)}
                      className="h-9 w-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-300"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                </div>

                {expanded === resume._id && (
                  <div className="mt-5 pt-5 border-t border-white/5 space-y-3">
                    <p className="text-sm text-slate-300">
                      {resume.analysis?.summary}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {(resume.analysis?.technicalSkills || []).map((s, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 px-2.5 py-1 rounded-full"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ))}

      {tab === "interviews" &&
        (interviews.length === 0 ? (
          <EmptyState
            icon={FiMic}
            title="No interview sessions yet"
            description="Generate a question bank or run a mock interview to start tracking your prep."
            actionLabel="Start Mock Interview"
            actionTo="/mock-interview"
          />
        ) : (
          <div className="space-y-4">
            {interviews.map((interview, i) => (
              <motion.div
                key={interview._id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="card p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 rounded-xl bg-fuchsia-500/15 flex items-center justify-center shrink-0">
                      <FiMic className="text-fuchsia-300" size={18} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">
                        {interview.mode === "mock-interview"
                          ? "Mock Interview"
                          : "Question Bank"}{" "}
                        — {interview.role}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                        <FiClock size={12} />
                        {new Date(interview.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {interview.mode === "mock-interview" && (
                      <span className="text-sm font-bold text-fuchsia-300 bg-fuchsia-500/10 border border-fuchsia-500/25 px-3 py-1.5 rounded-full">
                        {interview.overallScore ?? "N/A"}/10
                      </span>
                    )}
                    <button
                      onClick={() =>
                        setExpanded(
                          expanded === interview._id ? null : interview._id
                        )
                      }
                      className="h-9 w-9 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
                    >
                      {expanded === interview._id ? (
                        <FiChevronUp size={16} />
                      ) : (
                        <FiChevronDown size={16} />
                      )}
                    </button>
                    <button
                      onClick={() => handleDeleteInterview(interview._id)}
                      className="h-9 w-9 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-300"
                    >
                      <FiTrash2 size={15} />
                    </button>
                  </div>
                </div>

                {expanded === interview._id && (
                  <div className="mt-5 pt-5 border-t border-white/5 space-y-3">
                    {interview.summary && (
                      <p className="text-sm text-slate-300">
                        {interview.summary}
                      </p>
                    )}
                    <ul className="space-y-2">
                      {interview.questions.map((q, idx) => (
                        <li
                          key={idx}
                          className="text-sm text-slate-400 flex justify-between gap-3 border-b border-white/5 pb-2 last:border-0"
                        >
                          <span>
                            {idx + 1}. {q.question}
                          </span>
                          {q.score !== null && (
                            <span className="text-slate-300 font-medium shrink-0">
                              {q.score}/10
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        ))}
    </div>
  );
}

export default History;
