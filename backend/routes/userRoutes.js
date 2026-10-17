const express = require('express');
const {
  register,
  login,
  me,
  updateMe,
} = require('../controllers/userController');
const { protectUser } = require('../middleware/userAuth');
const { loginLimiter, registerLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post('/register', registerLimiter, register);
router.post('/login', loginLimiter, login);

router.use(protectUser);
router.get('/me', me);
router.put('/me', updateMe);

module.exports = router;
