// routes/categoryRoutes.js
const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');

// CRUD endpoints for category
router.get('/', categoryController.getAllcategory);
router.get('/:id', categoryController.getOnecategory);
router.put('/', categoryController.updatecategory);
router.post('/', categoryController.addcategory);

module.exports = router;
