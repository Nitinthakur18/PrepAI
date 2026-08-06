const express = require("express");
const router = express.Router();

const { attachUserIfPresent } = require("../middleware/auth");
const { getDashboardStats } = require("../controllers/analyticsController");

router.get("/dashboard", attachUserIfPresent, getDashboardStats);

module.exports = router;
