const Resume = require("../models/Resume");
const ai = require("../services/aiService");

const matchResume = async (req, res) => {
  try {
    const { resumeId } = req.body;
    const jobDescription = String(req.body.jobDescription || "").trim();

    if (!resumeId || !jobDescription) {
      return res.status(400).json({
        success: false,
        message: "resumeId and jobDescription are required.",
      });
    }
    const resume = await Resume.findById(resumeId);

    if (!resume || resume.user?.toString() !== req.user._id.toString()) {
      return res.status(404).json({ success: false, message: "Resume not found." });
    }

    if (jobDescription.length < 20) {
      return res.status(400).json({
        success: false,
        message: "Please paste a fuller job description (at least a couple of sentences).",
      });
    }
    if (jobDescription.length > 20000) {
      return res.status(400).json({
        success: false,
        message: "That job description is too long (max 20,000 characters).",
      });
    }

    // Deterministic score from the Smart Engine + AI insights when Gemini is healthy.
    const { data: result, meta } = await ai.matchJob(resume.resumeText, jobDescription, {
      resumeSummary: resume.analysis?.summary || "",
    });

    const record = {
      ...result,
      jobTitle: req.body.jobTitle || result.jobTitle || null,
      company: req.body.company || null,
      matchedAt: new Date().toISOString(),
    };
    resume.jobMatch = record;
    resume.matchHistory = [
      {
        at: record.matchedAt,
        jobTitle: record.jobTitle,
        company: record.company,
        atsScore: record.atsScore,
        verdict: record.verdict,
        missingSkills: record.missingSkills.slice(0, 10),
      },
      ...(resume.matchHistory || []),
    ].slice(0, 20);
    await resume.save();

    return res.status(200).json({ success: true, data: record, meta });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

module.exports = { matchResume };
