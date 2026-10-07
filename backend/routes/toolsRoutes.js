const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const c = require("../controllers/toolsController");

router.post("/cover-letter", requireAuth, c.coverLetter);
router.post("/bullets", requireAuth, c.bullets);
router.post("/linkedin", requireAuth, c.linkedin);
router.post("/pitch", requireAuth, c.pitch);
router.post("/roadmap", requireAuth, c.roadmap);

module.exports = router;
