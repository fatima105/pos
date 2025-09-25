// routes/PurchaseRoutes.js
const express = require('express');
const router = express.Router();
const purchaseController = require('../controllers/purchaseController');

// CRUD endpoints for Purchase
router.get('/', purchaseController.getAllPurchase);
router.get('/Detail', purchaseController.getAllPurchaseDetail);
 router.post('/DetailProduct', purchaseController.getAllPurchaseProduct);
router.get('/Detail/:id', purchaseController.getPurchaseDetailOne);
router.get('/Stock', purchaseController.getAllPurchaseStock);
router.get('/:id', purchaseController.getOnePurchase);
router.delete('/:id', purchaseController.deletePurchase);
router.put('/', purchaseController.updatePurchase);
router.post('/', purchaseController.addPurchase);

// router.delete('/:id', PurchaseController.deletePurchase);
module.exports = router;