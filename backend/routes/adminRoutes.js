const express = require('express');
const router = express.Router();
const {
  login,
  createAdmin,
  getFamilies,
  getStudents,
  getOccupationMembers,
  getFamilyById,
  updateFamily,
  deleteFamily,
  getVillagesList,
  getVillageOverview,
  getDashboardStats,
  exportFamilies,
  exportFamiliesExcel,
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');
const { loginLimiter } = require('../middleware/rateLimiter');

router.post('/login', loginLimiter, login);

// Everything below requires a valid JWT
router.use(protect);

router.get('/villages', getVillagesList);
router.get('/villages/overview', getVillageOverview);
router.post('/admins', requireRole('superadmin'), createAdmin);
router.get('/dashboard/stats', getDashboardStats);
router.get('/students', getStudents);
router.get('/occupations/:type', getOccupationMembers);
router.get('/families', getFamilies);
router.get('/families/:id', getFamilyById);
router.put('/families/:id', updateFamily);
router.delete('/families/:id', requireRole('superadmin', 'admin'), deleteFamily);
router.get('/export/excel', exportFamiliesExcel);
router.get('/export', exportFamilies);

module.exports = router;
