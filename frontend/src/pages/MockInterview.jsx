import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  FiMic,
  FiArrowRight,
  FiSend,
  FiCheckCircle,
  FiRotateCcw,
} from "react-icons/fi";
import Button from "../components/Button";
import ScoreGauge from "../components/ScoreGauge";
import {
  startMockInterview,
  submitAnswer,
  finishMockInterview,
} from "../services/interviewService";

const STAGE = {
  SETUP: "setup",
  IN_PROGRESS: "in-progress",
  REPORT: "report",
};

function MockInterview() {
  const [stage, setStage] = useState(STAGE.SETUP);
  const [role, setRole] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const [interviewId, setInterviewId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [report, setReport] = useState(null);

  const handleStart = async () => {
    if (!role.trim()) {
      toast.error("Please enter a target job role.");
      return;
    }
    try {
      setLoading(true);
      const resumeId = localStorage.getItem("resumeId") || undefined;
      const res = await startMockInterview({
        role,
        jobDescription,
        resumeId,
        count: 6,
      });
      setInterviewId(res.data.interviewId);
      setQuestions(res.data.questions);
      setCurrent(0);
      setFeedback(null);
      setAnswer("");
      setStage(STAGE.IN_PROGRESS);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to start interview.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answer.trim()) {
      toast.error("Please write an answer before submitting.");
      return;
    }
    try {
      setSubmitting(true);
      const res = await submitAnswer({
        interviewId,
        questionIndex: current,
        answer,
      });
      setFeedback({ score: res.data.score, feedback: res.data.feedback });
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to evaluate answer.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNext = async () => {
    if (current + 1 < questions.length) {
      setCurrent((c) => c + 1);
      setAnswer("");
      setFeedback(null);
    } else {
      try {
        setLoading(true);
        const res = await finishMockInterview({ interviewId });
        setReport(res.data.data);
        setStage(STAGE.REPORT);
      } catch (err) {
        toast.error(err.response?.data?.message || "Failed to finish interview.");
      } finally {
        setLoading(false);
      }
    }
  };

  const resetAll = () => {
    setStage(STAGE.SETUP);
    setRole("");
    setJobDescription("");
    setInterviewId(null);
    setQuestions([]);
    setCurrent(0);
    setAnswer("");
    setFeedback(null);
    setReport(null);
  };

  if (stage === STAGE.SETUP) {
    return (
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 text-fuchsia-300 mb-3">
            <FiMic size={20} />
            <span className="uppercase text-xs tracking-widest font-semibold">
              AI Mock Interview
            </span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white font-display">
            Practice Live, Get Scored Instantly
          </h1>
          <p className="text-slate-400 mt-3">
            Answer real interview questions one at a time. Our AI scores each
            response and gives you a final performance report.
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
              placeholder="e.g. Backend Engineer, UX Designer"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-fuchsia-500/60 focus:border-fuchsia-500/50 transition"
            />
          </div>
          <div>
            <label className="text-sm text-slate-300 font-medium mb-2 block">
              Job Description <span className="text-slate-500">(optional)</span>
            </label>
            <textarea
              rows={5}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Paste a job description for more targeted questions..."
              className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-fuchsia-500/60 focus:border-fuchsia-500/50 transition resize-none"
            />
          </div>
          <Button
            onClick={handleStart}
            loading={loading}
            icon={FiArrowRight}
            className="w-full sm:w-auto"
          >
            {loading ? "Preparing Interview..." : "Start Mock Interview"}
          </Button>
        </div>
      </div>
    );
  }

  if (stage === STAGE.IN_PROGRESS) {
    const q = questions[current];
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <span className="text-sm text-slate-400 font-medium">
            Question {current + 1} of {questions.length}
          </span>
          <div className="w-40 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-fuchsia-500 to-indigo-400 transition-all"
              style={{ width: `${((current + 1) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -24 }}
            transition={{ duration: 0.3 }}
            className="card p-6 sm:p-8"
          >
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs bg-white/5 text-slate-400 px-2.5 py-1 rounded-full border border-white/10">
                {q.category}
              </span>
              <span className="text-xs bg-white/5 text-slate-400 px-2.5 py-1 rounded-full border border-white/10">
                {q.difficulty}
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-semibold text-white font-display leading-relaxed">
              {q.question}
            </h2>

            <textarea
              rows={7}
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              disabled={!!feedback}
              placeholder="Type your answer here as if you were speaking to the interviewer..."
              className="w-full mt-6 bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-fuchsia-500/60 focus:border-fuchsia-500/50 transition resize-none disabled:opacity-60"
            />

            {!feedback ? (
              <Button
                onClick={handleSubmitAnswer}
                loading={submitting}
                icon={FiSend}
                className="mt-5"
              >
                {submitting ? "Evaluating..." : "Submit Answer"}
              </Button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6 rounded-2xl border border-fuchsia-500/25 bg-fuchsia-500/10 p-5"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-fuchsia-300">
                    AI Feedback
                  </span>
                  <span className="text-lg font-bold text-white">
                    {feedback.score}/10
                  </span>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {feedback.feedback}
                </p>
                <Button
                  onClick={handleNext}
                  loading={loading}
                  icon={FiArrowRight}
                  className="mt-5"
                >
                  {current + 1 < questions.length
                    ? "Next Question"
                    : "Finish & See Report"}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    );
  }

  // REPORT stage
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="card p-10 text-center bg-gradient-to-br from-fuchsia-600/20 via-indigo-600/10 to-transparent">
        <div className="flex items-center justify-center gap-2 text-fuchsia-300 mb-4">
          <FiCheckCircle size={22} />
          <span className="uppercase text-xs tracking-widest font-semibold">
            Interview Complete
          </span>
        </div>
        <div className="flex justify-center">
          <ScoreGauge
            score={report.overallScore * 10}
            size={190}
            suffix=""
            label={`${report.overallScore} / 10 Overall`}
          />
        </div>
        <p className="text-slate-300 mt-6 max-w-xl mx-auto leading-relaxed">
          {report.summary}
        </p>
      </div>

      <div className="space-y-4">
        {report.questions.map((q, i) => (
          <div key={i} className="card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <p className="text-white font-medium">
                <span className="text-fuchsia-400 font-semibold mr-2">
                  Q{i + 1}.
                </span>
                {q.question}
              </p>
              <span className="shrink-0 text-sm font-bold text-white bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                {q.score ?? "—"}/10
              </span>
            </div>
            <p className="text-sm text-slate-400 mt-3 border-t border-white/5 pt-3">
              {q.feedback}
            </p>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <Button onClick={resetAll} icon={FiRotateCcw} variant="outline">
          Start Another Mock Interview
        </Button>
      </div>
    </motion.div>
  );
}

export default MockInterview;
