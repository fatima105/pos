// routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// CRUD endpoints for transaction
router.get('/', transactionController.getAllTransactions);
router.get('/Detail', transactionController.getAllTransactionsDetail);
router.get('/:id', transactionController.getOneTransaction);
router.put('/', transactionController.updateTransaction);
router.post('/', transactionController.addTransaction);
router.delete('/:id', transactionController.deleteTransaction);
module.exports = router;