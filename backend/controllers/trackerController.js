const JobApplication = require("../models/JobApplication");
const Resume = require("../models/Resume");

const STATUSES = JobApplication.STATUSES;
const clip = (v, n) => String(v ?? "").trim().slice(0, n);
const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

async function findOwned(id, userId) {
  try {
    return await JobApplication.findOne({ _id: id, user: userId });
  } catch (_) {
    return null; // invalid ObjectId
  }
}

function pickFields(body) {
  const out = {};
  if (body.company !== undefined) out.company = clip(body.company, 120);
  if (body.title !== undefined) out.title = clip(body.title, 140);
  if (body.url !== undefined) out.url = clip(body.url, 500);
  if (body.location !== undefined) out.location = clip(body.location, 120);
  if (body.salary !== undefined) out.salary = clip(body.salary, 80);
  if (body.jobDescription !== undefined) out.jobDescription = clip(body.jobDescription, 12000);
  if (body.notes !== undefined) out.notes = clip(body.notes, 4000);
  if (body.nextStep !== undefined) out.nextStep = clip(body.nextStep, 200);
  if (body.nextStepAt !== undefined) out.nextStepAt = toDate(body.nextStepAt);
  if (body.appliedAt !== undefined) out.appliedAt = toDate(body.appliedAt);
  if (body.matchScore !== undefined) {
    const n = Number(body.matchScore);
    out.matchScore = Number.isFinite(n) ? Math.max(0, Math.min(100, Math.round(n))) : null;
  }
  return out;
}

const list = async (req, res) => {
  try {
    const items = await JobApplication.find({ user: req.user._id }).select("-jobDescription").sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to load applications." });
  }
};

const getOne = async (req, res) => {
  const item = await findOwned(req.params.id, req.user._id);
  if (!item) return res.status(404).json({ success: false, message: "Application not found." });
  res.status(200).json({ success: true, data: item });
};

const create = async (req, res) => {
  try {
    const fields = pickFields(req.body);
    if (!fields.company || !fields.title) {
      return res.status(400).json({ success: false, message: "Company and job title are required." });
    }
    const status = STATUSES.includes(req.body.status) ? req.body.status : "wishlist";

    let resumeId;
    if (req.body.resumeId) {
      try {
        const r = await Resume.findById(req.body.resumeId);
        if (r && r.user?.toString() === req.user._id.toString()) resumeId = r._id;
      } catch (_) {}
    }

    const item = await JobApplication.create({
      ...fields,
      user: req.user._id,
      status,
      resume: resumeId,
      appliedAt: fields.appliedAt || (status === "applied" ? new Date() : null),
      history: [{ status, at: new Date() }],
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to save application." });
  }
};

const update = async (req, res) => {
  try {
    const item = await findOwned(req.params.id, req.user._id);
    if (!item) return res.status(404).json({ success: false, message: "Application not found." });

    const fields = pickFields(req.body);
    if (fields.company === "" || fields.title === "") {
      return res.status(400).json({ success: false, message: "Company and job title cannot be empty." });
    }
    Object.assign(item, fields);

    if (req.body.status !== undefined) {
      if (!STATUSES.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: "Invalid status." });
      }
      if (item.status !== req.body.status) {
        item.status = req.body.status;
        item.history.push({ status: req.body.status, at: new Date() });
        if (req.body.status === "applied" && !item.appliedAt) item.appliedAt = new Date();
      }
    }
    await item.save();
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update application." });
  }
};

const remove = async (req, res) => {
  try {
    const item = await findOwned(req.params.id, req.user._id);
    if (!item) return res.status(404).json({ success: false, message: "Application not found." });
    await JobApplication.deleteOne({ _id: item._id, user: req.user._id });
    res.status(200).json({ success: true, message: "Deleted." });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete application." });
  }
};

const stats = async (req, res) => {
  try {
    const items = await JobApplication.find({ user: req.user._id }).select("status matchScore nextStep nextStepAt company title createdAt history");
    const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
    items.forEach((i) => { byStatus[i.status] = (byStatus[i.status] || 0) + 1; });
    const applied = items.filter((i) => i.status !== "wishlist").length;
    const interviewed = items.filter((i) => i.status === "interview" || i.status === "offer" || (i.history || []).some((h) => h.status === "interview")).length;
    const scores = items.map((i) => i.matchScore).filter((n) => typeof n === "number");
    const horizon = Date.now() + 14 * 24 * 3600 * 1000;
    const upcoming = items
      .filter((i) => i.nextStepAt && new Date(i.nextStepAt).getTime() >= Date.now() - 24 * 3600 * 1000 && new Date(i.nextStepAt).getTime() <= horizon)
      .sort((a, b) => new Date(a.nextStepAt) - new Date(b.nextStepAt))
      .slice(0, 5)
      .map((i) => ({ id: i._id, company: i.company, title: i.title, nextStep: i.nextStep, nextStepAt: i.nextStepAt }));
    res.status(200).json({
      success: true,
      data: {
        total: items.length,
        byStatus,
        applied,
        responseRate: applied ? Math.round((interviewed / applied) * 100) : 0,
        averageMatch: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
        upcoming,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to load tracker stats." });
  }
};

module.exports = { list, getOne, create, update, remove, stats };
