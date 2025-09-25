const express = require('express');
const router = express.Router();
const cashreceivedController = require('../controllers/cashreceivedController');
// ✅ Specific routes first
router.get('/Rec/:id',cashreceivedController.getSpecificReceieveable);
// router.get('/Pay/:id', cashreceivedController.getSpecificReceieveable);

// ✅ Then general ones
router.get('/:id', cashreceivedController.getSpecific);
router.post('/', cashreceivedController.addreceivedpayment);
router.get('/', cashreceivedController.getreceivedcashpayment);


module.exports = router;