// routes/unitRoutes.js
const express = require('express');
const router = express.Router();
const unitController = require('../controllers/unitController');

// CRUD endpoints for Unit
router.get('/', unitController.getAllUnits);
router.get('/:id', unitController.getOneUnit);
router.put('/', unitController.updateUnit);
router.post('/', unitController.addUnit);

module.exports = router;
