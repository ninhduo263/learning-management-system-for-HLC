const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { createAuthService } = require('../services/authService');
const { loadAuthConfig } = require('../services/authConfig');

const authConfig = loadAuthConfig();
const authService = createAuthService({
  legacyDefaultPassword: authConfig.legacyDefaultPassword,
  jwtSecret: authConfig.jwtSecret,
  legacyPasswordLoginUntil: authConfig.legacyPasswordLoginUntil
});

function normalizeEnvValue(value) {
  const normalized = String(value || '').trim();
  return normalized.replace(/^(['"])(.*)\1$/, '$2').trim();
}

const BOOTSTRAP_ADMIN_KEY = normalizeEnvValue(process.env.BOOTSTRAP_ADMIN_KEY);

function isActiveUser(user) {
  const normalized = String(user?.isActive || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return ['yes', 'co', 'active', 'true'].includes(normalized);
}

const login = async (req, res) => {
  try {
    const { userId, password } = req.body || {};
    if (
      typeof userId !== 'string'
      || typeof password !== 'string'
      || !userId.trim()
      || !password
      || userId.trim().length > 100
      || Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập mã thành viên và mật khẩu' });
    }
    const user = await authService.authenticateCredentials(userId, password);
    if (!user) return res.status(401).json({ success: false, message: 'Mã thành viên hoặc mật khẩu không đúng' });

    return res.json({
      success: true,
      token: authService.createToken(user),
      user: { userId: user.userId, fullName: user.fullName, role: user.role, mentorId: user.mentorId }
    });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const bootstrapAdmin = async (req, res) => {
  try {
    const providedBootstrapKey = normalizeEnvValue(req.get('x-bootstrap-key'));
    if (!BOOTSTRAP_ADMIN_KEY || providedBootstrapKey !== BOOTSTRAP_ADMIN_KEY) {
      return res.status(403).json({ success: false, message: 'Bootstrap key không hợp lệ' });
    }
    const existingAdmin = await User.exists({ role: 'ADMIN' });
    if (existingAdmin) return res.status(409).json({ success: false, message: 'Admin đã tồn tại' });
    const { userId, fullName, password } = req.body;
    if (
      typeof userId !== 'string'
      || typeof fullName !== 'string'
      || typeof password !== 'string'
      || !userId.trim()
      || !fullName.trim()
      || Buffer.byteLength(password, 'utf8') < 8
      || Buffer.byteLength(password, 'utf8') > 72
    ) {
      return res.status(400).json({ success: false, message: 'Cần userId, họ tên và mật khẩu từ 8 đến 72 byte' });
    }
    const user = await User.create({
      userId: userId.trim().toUpperCase(),
      fullName,
      role: 'ADMIN',
      passwordHash: await bcrypt.hash(password, 12)
    });
    res.status(201).json({ success: true, data: { userId: user.userId, fullName: user.fullName, role: user.role } });
  } catch (error) {
    if (error.code === 11000) return res.status(400).json({ success: false, message: 'Mã thành viên đã tồn tại' });
    console.error('Lỗi tạo admin đầu tiên:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

const getMe = async (req, res) => {
  try {
    const user = await User.findOne({ userId: req.user.userId }).select('userId fullName role mentorId team position isActive');
    if (!isActiveUser(user)) return res.status(401).json({ success: false, message: 'Tài khoản không còn hoạt động' });
    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
};

module.exports = {
  login,
  bootstrapAdmin,
  getMe,
  isActiveUser
};

