const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const { validateFileSignature } = require("../middleware/upload");
const { requireAuth } = require("../middleware/auth");

const {
  uploadResume,
  analyzeSample,
  reanalyzeResume,
  getResumeHistory,
  getResumeById,
  compareResumes,
  deleteResume,
} = require("../controllers/resumeController");

// All resume routes require a logged-in user: resumes are personal data,
// and ownership is enforced against req.user in the controller.
router.post("/upload", requireAuth, upload.single("resume"), validateFileSignature, uploadResume);
router.post("/sample", requireAuth, analyzeSample);

router.get("/history", requireAuth, getResumeHistory);
router.get("/compare", requireAuth, compareResumes);
router.post("/:id/reanalyze", requireAuth, reanalyzeResume);
router.get("/:id", requireAuth, getResumeById);
router.delete("/:id", requireAuth, deleteResume);

module.exports = router;
