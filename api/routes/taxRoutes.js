// routes/TaxRoutes.js
const express = require('express');
const router = express.Router();
const taxController = require('../controllers/taxController');

// CRUD endpoints for Tax
router.get('/', taxController.getAllTaxs);
router.get('/:id', taxController.getOneTax);
router.put('/', taxController.updateTax);
router.post('/', taxController.addTax);
router.delete('/:id', taxController.deleteTax);
module.exports = router;
