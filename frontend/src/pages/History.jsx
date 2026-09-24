import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiFileText,
  FiMic,
  FiTrash2,
  FiChevronDown,
  FiChevronUp,
  FiClock,
  FiSearch,
} from "react-icons/fi";
import EmptyState from "../components/EmptyState";
import ErrorState from "../components/ErrorState";
import ConfirmDialog from "../components/ConfirmDialog";
import { getResumeHistory, deleteResume } from "../services/resumeService";
import {
  getInterviewHistory,
  deleteInterview,
} from "../services/interviewService";

const SORT_OPTIONS = [
  { value: "date-desc", label: "Newest first" },
  { value: "date-asc", label: "Oldest first" },
  { value: "score-desc", label: "Highest score" },
  { value: "score-asc", label: "Lowest score" },
];

function History() {
  const [tab, setTab] = useState("resumes");
  const [resumes, setResumes] = useState([]);
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
  const [pendingDelete, setPendingDelete] = useState(null); // { type, id, label }

  const fetchAll = async () => {
    setLoading(true);
    setError(false);
    try {
      const [rRes, iRes] = await Promise.all([
        getResumeHistory(),
        getInterviewHistory(),
      ]);
      setResumes(rRes.data.data || []);
      setInterviews(iRes.data.data || []);
    } catch {
      setError(true);
      toast.error("Failed to fetch history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const scoreOf = {
    resume: (r) => r.analysis?.atsScore ?? -1,
    interview: (i) => i.overallScore ?? -1,
  };

  const sortAndFilter = (items, type, matchText) => {
    const q = search.trim().toLowerCase();
    const filtered = q
      ? items.filter((item) => matchText(item).toLowerCase().includes(q))
      : items;

    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "date-desc") return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === "date-asc") return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortBy === "score-desc") return scoreOf[type](b) - scoreOf[type](a);
      if (sortBy === "score-asc") return scoreOf[type](a) - scoreOf[type](b);
      return 0;
    });

    return sorted;
  };

  const filteredResumes = useMemo(
    () =>
      sortAndFilter(resumes, "resume", (r) => r.originalName || r.filename || ""),
    [resumes, search, sortBy]
  );

  const filteredInterviews = useMemo(
    () =>
      sortAndFilter(
        interviews,
        "interview",
        (i) => `${i.role || ""} ${i.mode || ""}`
      ),
    [interviews, search, sortBy]
  );

  const requestDeleteResume = (id, label) =>
    setPendingDelete({ type: "resume", id, label });
  const requestDeleteInterview = (id, label) =>
    setPendingDelete({ type: "interview", id, label });

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    try {
      if (type === "resume") {
        await deleteResume(id);
        setResumes((prev) => prev.filter((r) => r._id !== id));
        toast.success("Resume deleted.");
      } else {
        await deleteInterview(id);
        setInterviews((prev) => prev.filter((i) => i._id !== id));
        toast.success("Interview deleted.");
      }
    } catch {
      toast.error(`Failed to delete ${type}.`);
    } finally {
      setPendingDelete(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="h-10 w-10 rounded-full border-4 border-white/10 border-t-indigo-400 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <ErrorState
          title="Couldn't load your history"
          description="We ran into a problem fetching your resumes and interviews. Check your connection and try again."
          onRetry={fetchAll}
        />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <ConfirmDialog
        open={!!pendingDelete}
        title={`Delete this ${pendingDelete?.type === "resume" ? "resume" : "interview session"}?`}
        description={
          pendingDelete?.label
            ? `"${pendingDelete.label}" will be permanently removed. This can't be undone.`
            : "This can't be undone."
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(null)}
      />

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="card p-1.5 inline-flex gap-1 w-fit">
          <button
            onClick={() => setTab("resumes")}
            className={`px-5 py-2.5 rounded-xl text-sm font-semibold transition ${
              tab === "resumes"
                ? "bg-gradient-to-r from-indigo-500 to-cyan-400 text-white"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <FiFileText className="inline mr-2 -mt-0.5" size={16} />
            Resumes ({filteredResumes.length})
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
            Interviews ({filteredInterviews.length})
          </button>
        </div>

        {(resumes.length > 0 || interviews.length > 0) && (
          <div className="flex flex-1 flex-col sm:flex-row gap-3 sm:justify-end">
            <div className="relative flex-1 sm:max-w-[220px]">
              <FiSearch
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"
                size={15}
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={tab === "resumes" ? "Search resumes..." : "Search by role..."}
                aria-label="Search history"
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/50 transition"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              aria-label="Sort history"
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/50 transition"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-[#0b0f1d]">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}
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
        ) : filteredResumes.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title="No matches"
            description={`No resumes match "${search}". Try a different search term.`}
          />
        ) : (
          <div className="space-y-4">
            {filteredResumes.map((resume, i) => (
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
                      aria-label={
                        expanded === resume._id
                          ? "Collapse resume details"
                          : "Expand resume details"
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
                      onClick={() =>
                        requestDeleteResume(
                          resume._id,
                          resume.originalName || resume.filename
                        )
                      }
                      aria-label="Delete resume"
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
        ) : filteredInterviews.length === 0 ? (
          <EmptyState
            icon={FiSearch}
            title="No matches"
            description={`No interviews match "${search}". Try a different search term.`}
          />
        ) : (
          <div className="space-y-4">
            {filteredInterviews.map((interview, i) => (
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
                      aria-label={
                        expanded === interview._id
                          ? "Collapse interview details"
                          : "Expand interview details"
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
                      onClick={() =>
                        requestDeleteInterview(
                          interview._id,
                          `${interview.mode === "mock-interview" ? "Mock Interview" : "Question Bank"} — ${interview.role}`
                        )
                      }
                      aria-label="Delete interview"
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
