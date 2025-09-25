// routes/saleRoutes.js
const express = require('express');
const router = express.Router();
const saleReturnController = require('../controllers/saleReturnController');



router.post('/', saleReturnController.addReturnSale);


router.get('/', saleReturnController.getSaleReturn);
router.post('/Detail', saleReturnController.getSaleReturnDetail);
module.exports = router;

