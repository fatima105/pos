// routes/customerRoutes.js
const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');

// CRUD endpoints for customer
router.get('/', customerController.getAllCustomer);
router.get('/:id', customerController.getOneCustomer);
router.put('/', customerController.updateCustomer);
router.post('/', customerController.addCustomer);

module.exports = router;