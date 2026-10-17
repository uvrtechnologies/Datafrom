const express = require('express');
const router = express.Router();
const { protect, requireRole } = require('../middleware/auth');
const backupController = require('../controllers/backupController');

// External scheduler entry point (no JWT — authenticated with BACKUP_CRON_SECRET).
router.post('/cron', backupController.cronGuard, backupController.triggerBackup);

// Admin status / manual trigger.
router.get('/status', protect, backupController.getStatus);
router.get('/history', protect, backupController.getHistory);
router.post('/run', protect, requireRole('superadmin', 'admin'), backupController.triggerBackup);

module.exports = router;
