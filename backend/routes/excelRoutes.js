const express = require('express');
const multer = require('multer');
const path = require('path');
const { protect } = require('../middleware/auth');
const { isDBConnected } = require('../config/db');
const { confirmExcel, exportExcel, previewExcel } = require('../controllers/excelController');

const router = express.Router();
function requireDatabase(req, res, next) {
  if (!isDBConnected()) {
    return res.status(503).json({ success: false, message: 'Database not connected. Import and export require MongoDB.' });
  }
  return next();
}

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 1, parts: 2 },
  fileFilter(req, file, callback) {
    const extension = path.extname(file.originalname).toLowerCase();
    if (!['.xls', '.xlsx'].includes(extension)) {
      const error = new Error('Only .xls and .xlsx files are supported.');
      error.statusCode = 400;
      return callback(error);
    }
    return callback(null, true);
  },
});

router.get('/export/excel', protect, requireDatabase, exportExcel);
router.post('/import/excel/preview', protect, requireDatabase, upload.single('file'), previewExcel);
router.post('/import/excel/confirm', protect, requireDatabase, confirmExcel);

module.exports = router;
