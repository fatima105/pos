const express = require('express');
const router = express.Router();
const cashpaymentController = require('../controllers/cashpaymentController');
// ✅ Specific routes first
router.get('/Pay/:id', cashpaymentController.getSpecificPayable);

// ✅ Then general ones
router.get('/:id', cashpaymentController.getSpecific);
router.post('/', cashpaymentController.addcashpayment);
router.get('/', cashpaymentController.getcashpayment);


module.exports = router;