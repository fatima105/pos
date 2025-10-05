// routes/saleRoutes.js
const express = require('express');
const router = express.Router();
const saleController = require('../controllers/saleController');


router.get('/', saleController.getAllSale);
router.get('/Details', saleController.getAllSaleDetails);
router.get('/SpecificDetails/:id', saleController.getSpecificSaleDetail);
router.get('/Disc', saleController.getSaleReturnDisc);

router.get('/:id', saleController.getOneSale);
router.delete('/:id', saleController.deleteSale);
router.put('/', saleController.updateSale);
router.post('/', saleController.addSale);

// router.delete('/:id', saleController.deletesale);
module.exports = router;

