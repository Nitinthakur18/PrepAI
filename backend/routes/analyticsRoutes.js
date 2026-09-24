const express = require("express");
const router = express.Router();

const { requireAuth } = require("../middleware/auth");
const { getDashboardStats } = require("../controllers/analyticsController");

// Requires auth: previously this endpoint fell back to querying stats
// across ALL users when no token was attached, leaking every user's
// resume/interview data to anonymous callers.
router.get("/dashboard", requireAuth, getDashboardStats);

module.exports = router;
