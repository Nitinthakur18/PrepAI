const fs = require("fs");
const path = require("path");
const Resume = require("../models/Resume");
const { extractResumeText } = require("../services/resumeService");
const ai = require("../services/aiService");
const engine = require("../services/engine");
const { safeErrorMessage } = require("../utils/safeError");

const isOwner = (doc, req) => doc && doc.user?.toString() === req.user._id.toString();
const truthy = (v) => v === true || /^(1|true|yes)$/i.test(String(v || ""));
const removeFile = (p) => p && fs.unlink(p, () => {});

/* ===========================
   Upload Resume + Analysis
   Never fails because of AI: Gemini is used when healthy,
   the built-in Smart Engine otherwise (see services/aiService.js).
=========================== */
const uploadResume = async (req, res) => {
  const filePath = req.file?.path;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    let resumeText;
    try {
      resumeText = await extractResumeText(req.file.path);
    } finally {
      // Privacy: the original file is not needed once the text is extracted.
      removeFile(filePath);
    }

    if (!resumeText || resumeText.trim().length < 30) {
      return res.status(400).json({
        success: false,
        code: "NO_TEXT",
        message:
          "We couldn't extract enough text from this file. It may be a scanned image — please upload a text-based PDF or DOCX.",
      });
    }

    // Local analysis is instant, so we can sanity-check the document BEFORE spending AI quota.
    const local = engine.analyzeResume(resumeText);
    if (!local.validity.isResume && !truthy(req.body?.force)) {
      return res.status(422).json({
        success: false,
        code: "NOT_A_RESUME",
        message:
          "This document doesn't look like a resume (no contact details, standard sections or experience found). Upload your CV, or choose “Analyze anyway”.",
        validity: local.validity,
      });
    }

    const { data: analysis, meta } = await ai.analyzeResume(resumeText, { local });

    const savedResume = await Resume.create({
      user: req.user._id,
      filename: req.file.filename,
      originalName: req.file.originalname,
      resumeText,
      analysis,
    });

    return res.status(200).json({
      success: true,
      resumeId: savedResume._id,
      filename: savedResume.filename,
      originalName: savedResume.originalName,
      analysis: savedResume.analysis,
      meta,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: safeErrorMessage(error, "Something went wrong while analyzing your resume."),
    });
  }
};

/* ===========================
   Demo resume (one click, no file needed)
=========================== */
const analyzeSample = async (req, res) => {
  try {
    const text = engine.sampleResume;
    const { data: analysis, meta } = await ai.analyzeResume(text);
    const saved = await Resume.create({
      user: req.user._id,
      filename: "sample-resume.txt",
      originalName: "Sample Resume (Aarav Mehta).pdf",
      resumeText: text,
      analysis,
    });
    return res.status(200).json({
      success: true,
      resumeId: saved._id,
      filename: saved.filename,
      originalName: saved.originalName,
      analysis: saved.analysis,
      meta,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to analyze the sample resume." });
  }
};

/* ===========================
   Re-run the AI pass (e.g. after Gemini was busy)
=========================== */
const reanalyzeResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!isOwner(resume, req)) {
      return res.status(404).json({ success: false, message: "Resume not found." });
    }
    const { data, meta } = await ai.analyzeResume(resume.resumeText, { force: true });
    const improved = meta.source !== "local";
    // Always refresh deterministic fields; only replace the stored result when AI answered
    // or the previous result had no AI at all (keeps the best version we have).
    const previousWasLocal = resume.analysis?.meta?.source === "local" || !resume.analysis?.meta;
    if (improved || previousWasLocal) {
      resume.analysis = data;
      if (resume.markModified) resume.markModified("analysis");
      await resume.save();
    }
    return res.status(200).json({
      success: true,
      improved,
      analysis: resume.analysis,
      meta,
      message: improved
        ? "Analysis upgraded with Gemini AI."
        : "Gemini is still busy — your Smart Engine analysis is unchanged. Try again in a minute.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to re-analyze resume." });
  }
};

/* ===========================
   Resume History
=========================== */
const getResumeHistory = async (req, res) => {
  try {
    const filter = { user: req.user._id };
    const resumes = await Resume.find(filter).select("-resumeText").sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: resumes });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to fetch resume history." });
  }
};

/* ===========================
   Get Resume By ID
=========================== */
const getResumeById = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    // Same 404 for "missing" and "someone else's" so ownership can't be probed.
    if (!isOwner(resume, req)) {
      return res.status(404).json({ success: false, message: "Resume not found." });
    }
    return res.status(200).json({ success: true, data: resume });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to fetch resume." });
  }
};

/* ===========================
   Compare two resume versions
=========================== */
const compareResumes = async (req, res) => {
  try {
    const { a, b } = req.query;
    if (!a || !b) {
      return res.status(400).json({ success: false, message: "Two resume ids (a, b) are required." });
    }
    const [ra, rb] = await Promise.all([Resume.findById(a), Resume.findById(b)]);
    if (!isOwner(ra, req) || !isOwner(rb, req)) {
      return res.status(404).json({ success: false, message: "Resume not found." });
    }
    const brief = (r) => ({
      id: r._id,
      name: r.originalName || r.filename,
      createdAt: r.createdAt,
      atsScore: r.analysis?.atsScore ?? 0,
      breakdown: r.analysis?.scoreBreakdown || {},
      skills: r.analysis?.technicalSkills || [],
      stats: r.analysis?.stats || {},
      level: r.analysis?.experienceLevel || null,
    });
    const A = brief(ra);
    const B = brief(rb);
    const setA = new Set(A.skills.map((s) => s.toLowerCase()));
    const setB = new Set(B.skills.map((s) => s.toLowerCase()));
    const breakdownDelta = {};
    for (const k of new Set([...Object.keys(A.breakdown), ...Object.keys(B.breakdown)])) {
      breakdownDelta[k] = (B.breakdown[k] || 0) - (A.breakdown[k] || 0);
    }
    return res.status(200).json({
      success: true,
      data: {
        a: A,
        b: B,
        delta: {
          score: B.atsScore - A.atsScore,
          breakdown: breakdownDelta,
          skillsAdded: B.skills.filter((s) => !setA.has(s.toLowerCase())),
          skillsRemoved: A.skills.filter((s) => !setB.has(s.toLowerCase())),
          quantified: (B.stats.quantified || 0) - (A.stats.quantified || 0),
          words: (B.stats.wordCount || 0) - (A.stats.wordCount || 0),
        },
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to compare resumes." });
  }
};

/* ===========================
   Delete Resume
=========================== */
const deleteResume = async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!isOwner(resume, req)) {
      return res.status(404).json({ success: false, message: "Resume not found." });
    }
    await Resume.findByIdAndDelete(req.params.id);
    // best-effort cleanup (legacy uploads may still be on disk)
    if (resume.filename) fs.unlink(path.join(__dirname, "..", "uploads", resume.filename), () => {});
    return res.status(200).json({ success: true, message: "Resume deleted successfully." });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, message: "Failed to delete resume." });
  }
};

module.exports = {
  uploadResume,
  analyzeSample,
  reanalyzeResume,
  getResumeHistory,
  getResumeById,
  compareResumes,
  deleteResume,
};
