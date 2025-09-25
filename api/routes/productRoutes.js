// routes/productRoutes.js
const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// CRUD endpoints for product
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getOneProduct);
router.get('/Sku/:SKU', productController.getOneSku);
router.put('/', productController.updateProduct);
router.post('/', productController.addProduct);
router.delete('/:id', productController.deleteProduct);
module.exports = router;
