const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const {
  generateQuestions,
  startMockInterview,
  submitAnswer,
  finishMockInterview,
  getInterviewHistory,
  getInterviewById,
  deleteInterview,
} = require("../controllers/interviewController");

// All interview routes require a logged-in user; ownership is enforced
// against req.user in the controller for every read/write on a specific
// interview (answer submission and finishing included).
router.post("/questions", requireAuth, generateQuestions);
router.post("/mock/start", requireAuth, startMockInterview);
router.post("/mock/answer", requireAuth, submitAnswer);
router.post("/mock/finish", requireAuth, finishMockInterview);
router.get("/history", requireAuth, getInterviewHistory);
router.get("/:id", requireAuth, getInterviewById);
router.delete("/:id", requireAuth, deleteInterview);

module.exports = router;
