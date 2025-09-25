const express = require('express');
const router = express.Router();
const cashJournalVoucherController = require('../controllers/cashJournalVoucherController');
// ✅ Specific routes first
router.get('/Balance/:id', cashJournalVoucherController.getSpecificBalance);

// ✅ Then general ones
// router.get('/:id', cashpaymentController.getSpecific);
router.post('/', cashJournalVoucherController.addjournalpayment);
router.get('/', cashJournalVoucherController.getjournalpayment);
router.delete('/:id', cashJournalVoucherController.gDeletejournalpayment);
router.get('/:id', cashJournalVoucherController.getspecificjournalpayment);
module.exports = router;