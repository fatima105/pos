// routes/supplierRoutes.js
const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
console.log(supplierController);
router.get('/chart', supplierController.getAccountOfSales);
// CRUD endpoints for supplier
router.get('/', supplierController.getAllSupplier);
router.get('/:id', supplierController.getOneSupplier);
router.delete('/:id', supplierController.deleteSupplier);
router.put('/', supplierController.updateSupplier);
router.post('/', supplierController.addSupplier);

// router.delete('/:id', supplierController.deletesupplier);
module.exports = router;