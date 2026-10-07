const express = require("express");
const router = express.Router();
const { requireAuth } = require("../middleware/auth");
const c = require("../controllers/trackerController");

router.get("/stats", requireAuth, c.stats);
router.get("/", requireAuth, c.list);
router.post("/", requireAuth, c.create);
router.get("/:id", requireAuth, c.getOne);
router.put("/:id", requireAuth, c.update);
router.delete("/:id", requireAuth, c.remove);

module.exports = router;
