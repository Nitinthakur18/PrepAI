const express = require("express");
const router = express.Router();

const { matchResume } = require("../controllers/matchController");

router.post("/match", matchResume);

module.exports = router;