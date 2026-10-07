const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { loginRateLimiter, bootstrapRateLimiter } = require('../middlewares/rateLimit.middleware');
const { authenticate } = require('../middlewares/auth.middleware');

router.post('/login', loginRateLimiter, authController.login);
router.post('/bootstrap-admin', bootstrapRateLimiter, authController.bootstrapAdmin);
router.get('/me', authenticate, authController.getMe);

module.exports = router;

