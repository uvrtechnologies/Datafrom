const express = require('express');
const router = express.Router();
const {
  login,
  getFamilies,
  getFamilyById,
  updateFamily,
  deleteFamily,
  getDashboardStats,
  exportFamilies,
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, login);

// Everything below requires a valid JWT
router.use(protect);

router.get('/dashboard/stats', getDashboardStats);
router.get('/families', getFamilies);
router.get('/families/:id', getFamilyById);
router.put('/families/:id', updateFamily);
router.delete('/families/:id', requireRole('superadmin', 'admin'), deleteFamily);
router.get('/export', exportFamilies);

module.exports = router;
