// routes/PurchaseRoutes.js
const express = require('express');
const router = express.Router();
const Reports = require('../controllers/ReportsController');

// CRUD endpoints for Purchase

router.post('/', Reports.getAllSupplierLedger);
router.post('/Cash', Reports.getCashFlowSimple);
router.post('/Expense', Reports.getLedgerReport);

// router.delete('/delete',Reports.deleteInvalidRows);
router.get('/lowstockproduct', Reports.getLowStockReport);
router.post('/CustomerLedgerTest', Reports.getCustomerHeadCode);
router.get('/PayableReport', Reports.payableReport);
router.get('/ReceivableReport', Reports.receivableReport);
router.post('/ProfitLossReport', Reports.ProfitLossReport);
router.post('/Sales',Reports.getSalesReport);

router.post('/income-statements', Reports.incomeStatements);
module.exports = router;