const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const { matchResume } = require("../controllers/matchController");

router.post("/match", requireAuth, matchResume);

module.exports = router;