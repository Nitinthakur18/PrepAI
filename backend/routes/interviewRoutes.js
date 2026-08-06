const express = require("express");
const router = express.Router();

const { attachUserIfPresent } = require("../middleware/auth");
const {
  generateQuestions,
  startMockInterview,
  submitAnswer,
  finishMockInterview,
  getInterviewHistory,
  getInterviewById,
  deleteInterview,
} = require("../controllers/interviewController");

router.post("/questions", attachUserIfPresent, generateQuestions);
router.post("/mock/start", attachUserIfPresent, startMockInterview);
router.post("/mock/answer", submitAnswer);
router.post("/mock/finish", finishMockInterview);
router.get("/history", attachUserIfPresent, getInterviewHistory);
router.get("/:id", getInterviewById);
router.delete("/:id", deleteInterview);

module.exports = router;
