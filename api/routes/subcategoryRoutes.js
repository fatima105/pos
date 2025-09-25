// routes/subcategoryRoutes.js
const express = require('express');
const router = express.Router();
const subcategoryController = require('../controllers/subcategoryController');

// CRUD endpoints for subcategory
router.get('/', subcategoryController.getAllSubCategory);
router.get('/:id', subcategoryController.getOneSubCategory);
router.put('/', subcategoryController.updateSubCategory);
router.post('/', subcategoryController.addSubCategory);
router.get('/GetSub/:id', subcategoryController.getSubCategoriesByCategory);

module.exports = router;
