import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FiTarget } from "react-icons/fi";
import ScoreGauge from "../components/ScoreGauge";
import EmptyState from "../components/EmptyState";

function ATSScore() {
  const [result, setResult] = useState(null);

  useEffect(() => {
    const data = localStorage.getItem("atsResult");
    if (data) setResult(JSON.parse(data));
  }, []);

  if (!result) {
    return (
      <EmptyState
        icon={FiTarget}
        title="No ATS result found yet"
        description="Upload a resume and match it against a job description to see your ATS match score here."
        actionLabel="Match a Job Description"
        actionTo="/jobdescription"
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="max-w-5xl mx-auto space-y-8"
    >
      <div className="card p-10 text-center bg-gradient-to-br from-indigo-600/25 via-violet-600/10 to-transparent">
        <h1 className="text-sm uppercase tracking-widest text-indigo-300 font-semibold mb-6">
          Job Description Match Score
        </h1>
        <div className="flex justify-center">
          <ScoreGauge score={result.atsScore} size={200} />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-8 border-emerald-500/20">
          <h2 className="text-lg font-bold mb-5 text-emerald-300 font-display">
            ✅ Matched Skills
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {result.matchedSkills?.length ? (
              result.matchedSkills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-emerald-500/15 text-emerald-300 border border-emerald-500/25 px-3.5 py-1.5 rounded-full text-sm font-medium"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-slate-500 text-sm">No matches found.</p>
            )}
          </div>
        </div>

        <div className="card p-8 border-red-500/20">
          <h2 className="text-lg font-bold mb-5 text-red-300 font-display">
            ❌ Missing Skills
          </h2>
          <div className="flex flex-wrap gap-2.5">
            {result.missingSkills?.length ? (
              result.missingSkills.map((skill, index) => (
                <span
                  key={index}
                  className="bg-red-500/15 text-red-300 border border-red-500/25 px-3.5 py-1.5 rounded-full text-sm font-medium"
                >
                  {skill}
                </span>
              ))
            ) : (
              <p className="text-slate-500 text-sm">None — great coverage!</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="card p-6 text-center">
          <h3 className="text-sm text-slate-400">Matched Keywords</h3>
          <p className="text-4xl font-bold mt-3 text-white font-display">
            {result.matchedKeywords}
          </p>
        </div>
        <div className="card p-6 text-center">
          <h3 className="text-sm text-slate-400">Total Keywords</h3>
          <p className="text-4xl font-bold mt-3 text-white font-display">
            {result.totalKeywords}
          </p>
        </div>
        <div className="card p-6 text-center">
          <h3 className="text-sm text-slate-400">Coverage</h3>
          <p className="text-4xl font-bold mt-3 text-white font-display">
            {result.coverage}%
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default ATSScore;
