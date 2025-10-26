const express = require("express");
const router = express.Router();
const modulesController = require("../controllers/modulesController");

// POST: Create module
router.post("/", modulesController.createModule);
router.get("/Sync", modulesController.SyncData);
// GET: List modules
router.get("/", modulesController.getModules);

module.exports = router;
