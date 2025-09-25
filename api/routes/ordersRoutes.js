// routes/ordersRoutes.js
const express = require('express');
const router = express.Router();
const ordersController = require('../controllers/ordersController');

// CRUD endpoints for orders
router.post('/', ordersController.addOrders);
router.post('/InsertDraft', ordersController.insertDraftOrders);
router.post('/GetOneDraft', ordersController.GetOneDraftsBySession);
router.put('/Update', ordersController.UpdateDraft);
router.post('/OrderCheck', ordersController.checkStock);
router.get('/GetAll', ordersController.GetAllDrafts);
router.delete('/Delete', ordersController.Delete);
router.get('/', ordersController.getDiscount);
router.delete('/DeleteALL', ordersController.DeleteAll);
router.post('/PurchaseStock', ordersController.AddPurchaseStock);
module.exports = router;

