const Resume = require("../models/Resume");
const ai = require("../services/aiService");
const engine = require("../services/engine");

const clip = (v, n) => String(v || "").trim().slice(0, n);

/** Resolves a resume that belongs to the requester or sends a 404. */
async function loadOwnedResume(req, res) {
  const { resumeId } = req.body;
  if (!resumeId) {
    res.status(400).json({ success: false, message: "Please select a resume." });
    return null;
  }
  let resume = null;
  try {
    resume = await Resume.findById(resumeId);
  } catch (_) {
    resume = null;
  }
  if (!resume || resume.user?.toString() !== req.user._id.toString()) {
    res.status(404).json({ success: false, message: "Resume not found." });
    return null;
  }
  return resume;
}

const wrap = (fn, errMsg) => async (req, res) => {
  try {
    await fn(req, res);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: errMsg });
  }
};

const coverLetter = wrap(async (req, res) => {
  const resume = await loadOwnedResume(req, res);
  if (!resume) return;
  const tone = ["professional", "enthusiastic", "concise"].includes(req.body.tone) ? req.body.tone : "professional";
  const { data, meta } = await ai.coverLetter({
    resumeText: resume.resumeText,
    jobDescription: clip(req.body.jobDescription, 8000),
    jobTitle: clip(req.body.jobTitle, 120),
    company: clip(req.body.company, 120),
    tone,
  });
  res.status(200).json({ success: true, data, meta });
}, "Failed to generate cover letter.");

const bullets = wrap(async (req, res) => {
  let list = req.body.bullets;
  if (typeof list === "string") list = list.split(/\n+/);
  list = (Array.isArray(list) ? list : []).map((b) => clip(b, 500)).filter((b) => b.length >= 5).slice(0, 12);
  if (!list.length) {
    return res.status(400).json({ success: false, message: "Paste at least one resume bullet (one per line)." });
  }
  const { data, meta } = await ai.improveBullets({ bullets: list, targetRole: clip(req.body.targetRole, 100) });
  res.status(200).json({ success: true, data, meta });
}, "Failed to improve bullets.");

const linkedin = wrap(async (req, res) => {
  const resume = await loadOwnedResume(req, res);
  if (!resume) return;
  const { data, meta } = await ai.linkedin({ resumeText: resume.resumeText, targetRole: clip(req.body.targetRole, 100) });
  res.status(200).json({ success: true, data, meta });
}, "Failed to generate LinkedIn content.");

const pitch = wrap(async (req, res) => {
  const resume = await loadOwnedResume(req, res);
  if (!resume) return;
  const { data, meta } = await ai.pitch({ resumeText: resume.resumeText, targetRole: clip(req.body.targetRole, 100) });
  res.status(200).json({ success: true, data, meta });
}, "Failed to generate pitch.");

// Deterministic (no AI): learning roadmap for missing skills.
const roadmap = wrap(async (req, res) => {
  let missing = Array.isArray(req.body.skills) ? req.body.skills : [];
  missing = missing.map((s) => (typeof s === "string" ? { skill: clip(s, 60) } : { skill: clip(s?.skill, 60), importance: s?.importance })).filter((s) => s.skill).slice(0, 12);
  if (!missing.length) {
    return res.status(400).json({ success: false, message: "Provide at least one skill." });
  }
  const hours = Math.max(2, Math.min(40, parseInt(req.body.hoursPerWeek, 10) || 8));
  res.status(200).json({ success: true, data: engine.buildRoadmap(missing, { hoursPerWeek: hours }) });
}, "Failed to build roadmap.");

module.exports = { coverLetter, bullets, linkedin, pitch, roadmap };
