const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expenseController');
router.post('/',expenseController.addexpense);
router.get('/',expenseController.getexpense);
router.get('/:id', expenseController.getSpecific);


module.exports = router;