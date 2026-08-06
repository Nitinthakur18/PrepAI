import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import { FiMessageSquare, FiArrowRight, FiMic } from "react-icons/fi";
import { Link } from "react-router-dom";
import Button from "../components/Button";
import EmptyState from "../components/EmptyState";
import { generateQuestions } from "../services/interviewService";

const difficultyColor = {
  Easy: "bg-emerald-500/15 text-emerald-300 border-emerald-500/25",
  Medium: "bg-amber-500/15 text-amber-300 border-amber-500/25",
  Hard: "bg-red-500/15 text-red-300 border-red-500/25",
};

function Interview() {
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [count, setCount] = useState(10);
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState(null);

  const handleGenerate = async () => {
    if (!role.trim()) {
      toast.error("Please enter a target job role.");
      return;
    }

    try {
      setLoading(true);
      const resumeId = localStorage.getItem("resumeId") || undefined;
      const res = await generateQuestions({
        role,
        jobDescription,
        resumeId,
        count,
      });
      setQuestions(res.data.questions);
      toast.success("Interview questions generated!");
    } catch (err) {
      toast.error(
        err.response?.data?.message || "Failed to generate questions."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center gap-2 text-indigo-300 mb-3">
          <FiMessageSquare size={20} />
          <span className="uppercase text-xs tracking-widest font-semibold">
            AI Interview Question Generator
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white font-display">
          Build a Custom Question Bank
        </h1>
        <p className="text-slate-400 mt-3">
          Tell us the role you're preparing for and we'll generate targeted
          technical, behavioral, and situational questions — personalized
          using your uploaded resume if available.
        </p>
      </div>

      <div className="card p-6 sm:p-8 space-y-5">
        <div>
          <label className="text-sm text-slate-300 font-medium mb-2 block">
            Target Job Role
          </label>
          <input
            type="text"
            value={role}
            onChange={(e) => setRole(e.target.value)}
            placeholder="e.g. Frontend Developer, Data Analyst, Product Manager"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/50 transition"
          />
        </div>

        <div>
          <label className="text-sm text-slate-300 font-medium mb-2 block">
            Job Description <span className="text-slate-500">(optional)</span>
          </label>
          <textarea
            rows={6}
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            placeholder="Paste a job description to tailor the questions further..."
            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-indigo-500/60 focus:border-indigo-500/50 transition resize-none"
          />
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm text-slate-300 font-medium">
            Number of questions
          </label>
          <input
            type="number"
            min={5}
            max={20}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="w-20 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-indigo-500/60"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={handleGenerate}
            loading={loading}
            icon={FiArrowRight}
          >
            {loading ? "Generating..." : "Generate Questions"}
          </Button>
          <Link to="/mock-interview">
            <Button variant="outline" icon={FiMic} className="w-full">
              Try a Live Mock Interview instead
            </Button>
          </Link>
        </div>
      </div>

      <AnimatePresence>
        {questions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            {questions.map((q, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="card p-5 sm:p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-white font-medium leading-relaxed">
                    <span className="text-indigo-400 font-semibold mr-2">
                      Q{i + 1}.
                    </span>
                    {q.question}
                  </p>
                  <span
                    className={`shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full border ${
                      difficultyColor[q.difficulty] ||
                      "bg-white/5 text-slate-300 border-white/10"
                    }`}
                  >
                    {q.difficulty}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs bg-white/5 text-slate-400 px-2.5 py-1 rounded-full border border-white/10">
                    {q.category}
                  </span>
                </div>
                {q.idealAnswerTips && (
                  <p className="text-sm text-slate-400 mt-3 border-t border-white/5 pt-3">
                    💡 {q.idealAnswerTips}
                  </p>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {!questions && !loading && (
        <EmptyState
          icon={FiMessageSquare}
          title="Your questions will appear here"
          description="Enter a role above and generate a personalized interview question bank in seconds."
        />
      )}
    </div>
  );
}

export default Interview;
