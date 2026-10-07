const { rateLimit } = require('express-rate-limit');

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => res.status(429).json({
    success: false,
    message: 'Quá nhiều lần đăng nhập không thành công. Vui lòng thử lại sau 15 phút.'
  })
});

const bootstrapRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (_req, res) => res.status(429).json({
    success: false,
    message: 'Quá nhiều lần bootstrap thất bại. Vui lòng thử lại sau 15 phút.'
  })
});

module.exports = { loginRateLimiter, bootstrapRateLimiter };

