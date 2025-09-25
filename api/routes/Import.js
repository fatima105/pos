// routes/importRoutes.js
const express = require('express');
const multer = require('multer');
const router = express.Router();
const ImportController = require('../controllers/ImportController');

// configure multer storage
const upload = multer({ dest: 'uploads/' });
router.post("/import", upload.single("importFile"), ImportController.PdfGenerate);
router.post('/importNew', upload.single('importFile'), ImportController.AddImport);

module.exports = router;
