const express = require("express");
const router = express.Router();
const assignController = require("../controllers/assignController");

// POST: Assign module to user
router.post("/", assignController.assignModule);

// GET: Get user's assigned modules
router.get("/user/:userId", assignController.getUserModules);

module.exports = router;
