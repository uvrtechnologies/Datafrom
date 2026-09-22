const express = require('express');
const router = express.Router();
const { submitFamily } = require('../controllers/familyController');
const { publicApiLimiter } = require('../middleware/rateLimiter');

router.post('/submit', publicApiLimiter, submitFamily);

module.exports = router;
