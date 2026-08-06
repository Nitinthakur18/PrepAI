const express = require("express");
const router = express.Router();

const upload = require("../middleware/upload");
const { attachUserIfPresent } = require("../middleware/auth");

const {
  uploadResume,
  getResumeHistory,
  getResumeById,
  deleteResume,
} = require("../controllers/resumeController");

router.post(
  "/upload",
  attachUserIfPresent,
  upload.single("resume"),
  uploadResume
);

router.get("/history", attachUserIfPresent, getResumeHistory);
router.get("/:id", getResumeById);
router.delete("/:id", deleteResume);

module.exports = router;
