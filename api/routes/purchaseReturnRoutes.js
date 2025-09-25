const express = require('express');
const router = express.Router(); 
const purchaseReturnController = require('../controllers/purchaseReturnController');

// Correct API route bindings
router.post('/add', purchaseReturnController.addPurchaseReturn);
router.get('/all', purchaseReturnController.getAllPurchaseReturns);
router.get('/details', purchaseReturnController.getAllPurchaseReturnDetails);
router.get('/count', purchaseReturnController.getcountdashboard);
router.post('/specificdetails', purchaseReturnController.getAllPurchaseReturnSpecificDetails);
module.exports = router;
