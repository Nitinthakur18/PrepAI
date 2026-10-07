const Resume = require("../models/Resume");
const Interview = require("../models/Interview");

const avg = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const dayKey = (d) => new Date(d).toISOString().slice(0, 10);

/** Consecutive days (ending today or yesterday) with at least one activity. */
function computeStreak(dates) {
  const days = new Set(dates.map(dayKey));
  let streak = 0;
  const cursor = new Date();
  if (!days.has(dayKey(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return streak;
}

function nextActions({ totalResumes, latest, interviews, hasMatch, averageInterviewScore }) {
  const actions = [];
  if (!totalResumes) {
    actions.push({ id: "upload", title: "Upload your resume", detail: "Get an instant ATS score and personalised fixes.", to: "/upload" });
    return actions;
  }
  const score = latest?.analysis?.atsScore || 0;
  if (score < 75) {
    const tip = latest?.analysis?.suggestions?.[0];
    actions.push({ id: "improve", title: "Raise your ATS score", detail: tip || "Fix the top suggestions in your report, then re-upload to see the change.", to: "/upload" });
  }
  if (!hasMatch) actions.push({ id: "match", title: "Match against a real job", detail: "Paste a job description to see exactly which keywords you are missing.", to: "/jobdescription" });
  if (!interviews) actions.push({ id: "interview", title: "Practise a mock interview", detail: "Timed questions with instant rubric-based feedback.", to: "/mock-interview" });
  else if (averageInterviewScore && averageInterviewScore < 7) actions.push({ id: "retry", title: "Improve your interview score", detail: `Your average is ${averageInterviewScore}/10 — retry the weakest category.`, to: "/mock-interview" });
  actions.push({ id: "tools", title: "Write a tailored cover letter", detail: "Generate a cover letter, LinkedIn summary or stronger bullets from your resume.", to: "/career-tools" });
  return actions.slice(0, 4);
}

const getDashboardStats = async (req, res) => {
  try {
    const filter = { user: req.user._id };

    const resumes = await Resume.find(filter).sort({ createdAt: 1 });
    const interviews = await Interview.find({ ...filter, status: "completed" }).sort({ createdAt: 1 });

    const totalResumes = resumes.length;
    const totalInterviews = interviews.length;

    const atsScores = resumes.map((r) => r.analysis?.atsScore).filter((s) => typeof s === "number");
    const averageAtsScore = atsScores.length ? Math.round(avg(atsScores)) : 0;
    const latestAtsScore = atsScores.length ? atsScores[atsScores.length - 1] : 0;

    const mock = interviews.filter((i) => i.mode === "mock-interview");
    const interviewScores = interviews.map((i) => i.overallScore).filter((s) => typeof s === "number");
    const averageInterviewScore = interviewScores.length ? Math.round(avg(interviewScores) * 10) / 10 : 0;

    const scoreTrend = resumes.map((r) => ({
      date: r.createdAt,
      score: r.analysis?.atsScore || 0,
      filename: r.originalName || r.filename,
    }));

    const latestResume = resumes[resumes.length - 1];
    const scoreBreakdown = latestResume?.analysis?.scoreBreakdown || null;

    const missingSkillCounts = {};
    resumes.forEach((r) => {
      (r.jobMatch?.missingSkills || []).forEach((skill) => {
        missingSkillCounts[skill] = (missingSkillCounts[skill] || 0) + 1;
      });
    });
    const topMissingSkills = Object.entries(missingSkillCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([skill, count]) => ({ skill, count }));

    const recentActivity = [
      ...resumes.map((r) => ({
        type: "resume",
        title: r.originalName || r.filename,
        date: r.createdAt,
        detail: `ATS Score: ${r.analysis?.atsScore ?? "N/A"}%`,
      })),
      ...interviews.map((i) => ({
        type: "interview",
        title: `${i.mode === "mock-interview" ? "Mock Interview" : "Question Bank"} - ${i.role}`,
        date: i.createdAt,
        detail: i.mode === "mock-interview" ? `Score: ${i.overallScore ?? "N/A"}/10` : `${(i.questions || []).length} questions generated`,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

    // ---------- extended insights ----------
    const interviewTrend = mock
      .filter((i) => typeof i.overallScore === "number")
      .map((i) => ({ date: i.createdAt, score: i.overallScore, role: i.role }));

    const cat = {};
    mock.forEach((i) =>
      (i.questions || []).forEach((q) => {
        if (typeof q.score === "number") (cat[q.category || "General"] ||= []).push(q.score);
      })
    );
    const categoryStrengths = Object.entries(cat).map(([category, arr]) => ({
      category,
      score: Math.round(avg(arr) * 10) / 10,
      count: arr.length,
    }));

    // Readiness: resume quality 50% + interview performance 35% + consistency 15%.
    // Without a completed interview the score is capped at 75 (practice unlocks the rest).
    const activity = Math.min(1, (totalResumes + totalInterviews) / 6) * 100;
    const readiness = totalResumes
      ? Math.round(
          interviewScores.length
            ? latestAtsScore * 0.5 + averageInterviewScore * 10 * 0.35 + activity * 0.15
            : latestAtsScore * 0.75
        )
      : 0;

    const streakDays = computeStreak([...resumes.map((r) => r.createdAt), ...interviews.map((i) => i.createdAt)]);

    const aiUsage = { gemini: 0, local: 0 };
    resumes.forEach((r) => {
      const s = r.analysis?.meta?.source;
      if (s === "local") aiUsage.local++;
      else if (s) aiUsage.gemini++;
    });

    const latestAnalysis = latestResume?.analysis
      ? {
          id: latestResume._id,
          name: latestResume.originalName || latestResume.filename,
          suggestions: (latestResume.analysis.suggestions || []).slice(0, 3),
          weaknesses: (latestResume.analysis.weaknesses || []).slice(0, 3),
          skills: (latestResume.analysis.technicalSkills || []).slice(0, 10),
          source: latestResume.analysis.meta?.source || null,
          level: latestResume.analysis.experienceLevel || null,
          roleFit: (latestResume.analysis.roleFit || []).slice(0, 3),
        }
      : null;

    return res.status(200).json({
      success: true,
      data: {
        totalResumes,
        totalInterviews,
        averageAtsScore,
        latestAtsScore,
        averageInterviewScore,
        scoreTrend,
        scoreBreakdown,
        topMissingSkills,
        recentActivity,
        // extended
        readiness: Math.max(0, Math.min(100, readiness)),
        streakDays,
        interviewTrend,
        categoryStrengths,
        aiUsage,
        latestAnalysis,
        nextActions: nextActions({
          totalResumes,
          latest: latestResume,
          interviews: mock.length,
          hasMatch: resumes.some((r) => r.jobMatch),
          averageInterviewScore,
        }),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to load dashboard analytics." });
  }
};

module.exports = { getDashboardStats };
