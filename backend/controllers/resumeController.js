const fs = require("fs");
const Resume = require("../models/Resume");
const { extractResumeText } = require("../services/resumeService");
const { generateJSON } = require("../utils/gemini");

/* ===========================
   Upload Resume + AI Analysis
=========================== */

const uploadResume = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const resumeText = await extractResumeText(req.file.path);

    if (!resumeText || resumeText.trim().length < 30) {
      return res.status(400).json({
        success: false,
        message:
          "We couldn't extract enough text from this file. Please upload a text-based PDF or DOCX.",
      });
    }

    const prompt = `
You are an expert ATS Resume Analyzer.

Analyze the following resume and return ONLY valid JSON.

Do not write markdown.
Do not use \`\`\`.
Do not add explanations.

Return exactly in this format:

{
  "summary": "Professional summary",
  "technicalSkills": ["Skill 1", "Skill 2", "Skill 3"],
  "softSkills": ["Skill 1", "Skill 2", "Skill 3"],
  "experienceLevel": "Entry Level",
  "atsScore": 85,
  "scoreBreakdown": {
    "formatting": 18,
    "keywords": 17,
    "skills": 19,
    "projects": 16,
    "education": 15
  },
  "strengths": ["Strength 1", "Strength 2", "Strength 3"],
  "weaknesses": ["Weakness 1", "Weakness 2", "Weakness 3"],
  "suggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3", "Suggestion 4", "Suggestion 5"]
}

Resume:

${resumeText}
`;

    let parsedResponse;

    try {
      parsedResponse = await generateJSON(prompt);
    } catch (err) {
      console.error(err);
      return res.status(502).json({
        success: false,
        message: "The AI service returned an unexpected response. Please try again.",
      });
    }

    const savedResume = await Resume.create({
      user: req.user ? req.user._id : undefined,
      filename: req.file.filename,
      originalName: req.file.originalname,
      resumeText,
      analysis: parsedResponse,
    });

    return res.status(200).json({
      success: true,
      resumeId: savedResume._id,
      filename: savedResume.filename,
      analysis: savedResume.analysis,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: error.message || "Something went wrong while analyzing your resume.",
    });
  }
};

/* ===========================
   Resume History
=========================== */

const getResumeHistory = async (req, res) => {
  try {
    const filter = req.user ? { user: req.user._id } : {};

    const resumes = await Resume.find(filter)
      .select("-resumeText")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      data: resumes,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch resume history.",
    });
  }
};

/* ===========================
   Get Resume By ID
=========================== */

const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    return res.status(200).json({
      success: true,
      data: resume,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch resume.",
    });
  }
};

/* ===========================
   Delete Resume
=========================== */

const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);

    if (!resume) {
      return res.status(404).json({
        success: false,
        message: "Resume not found.",
      });
    }

    await Resume.findByIdAndDelete(req.params.id);

    // best-effort cleanup of the uploaded file
    const filePath = require("path").join(
      __dirname,
      "..",
      "uploads",
      resume.filename
    );
    fs.unlink(filePath, () => {});

    return res.status(200).json({
      success: true,
      message: "Resume deleted successfully.",
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete resume.",
    });
  }
};

module.exports = {
  uploadResume,
  getResumeHistory,
  getResumeById,
  deleteResume,
};
