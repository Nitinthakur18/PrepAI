const Resume = require("../models/Resume");
const Interview = require("../models/Interview");

const getDashboardStats = async (req, res) => {
  try {
    const filter = { user: req.user._id };

    const resumes = await Resume.find(filter).sort({ createdAt: 1 });
    const interviews = await Interview.find({
      ...filter,
      status: "completed",
    }).sort({ createdAt: 1 });

    const totalResumes = resumes.length;
    const totalInterviews = interviews.length;

    const atsScores = resumes
      .map((r) => r.analysis?.atsScore)
      .filter((s) => typeof s === "number");

    const averageAtsScore = atsScores.length
      ? Math.round(
          atsScores.reduce((a, b) => a + b, 0) / atsScores.length
        )
      : 0;

    const latestAtsScore = atsScores.length
      ? atsScores[atsScores.length - 1]
      : 0;

    const interviewScores = interviews
      .map((i) => i.overallScore)
      .filter((s) => typeof s === "number");

    const averageInterviewScore = interviewScores.length
      ? Math.round(
          (interviewScores.reduce((a, b) => a + b, 0) /
            interviewScores.length) *
            10
        ) / 10
      : 0;

    // Score trend over time (for line chart)
    const scoreTrend = resumes.map((r) => ({
      date: r.createdAt,
      score: r.analysis?.atsScore || 0,
      filename: r.originalName || r.filename,
    }));

    // Aggregate score breakdown (radar chart) from most recent resume
    const latestResume = resumes[resumes.length - 1];
    const scoreBreakdown = latestResume?.analysis?.scoreBreakdown || null;

    // Most frequently missing skills across job matches
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

    // Recent activity feed
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
        detail:
          i.mode === "mock-interview"
            ? `Score: ${i.overallScore ?? "N/A"}/10`
            : `${i.questions.length} questions generated`,
      })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 8);

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
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Failed to load dashboard analytics.",
    });
  }
};

module.exports = { getDashboardStats };
