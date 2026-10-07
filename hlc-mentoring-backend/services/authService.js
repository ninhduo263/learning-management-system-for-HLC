const { randomBytes, timingSafeEqual } = require('node:crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/User');

const MAX_LOGIN_ID_LENGTH = 100;
const MAX_PASSWORD_BYTES = 72;
const DUMMY_PASSWORD_HASH = bcrypt.hashSync(randomBytes(32).toString('hex'), 12);

function isActiveUser(user) {
  const normalized = String(user?.isActive || '').trim().toLowerCase();
  return ['yes', 'co', 'active', 'true'].includes(normalized);
}

function matchesLegacyPassword(candidate, expected) {
  const candidateBytes = Buffer.from(candidate, 'utf8');
  const expectedBytes = Buffer.from(expected, 'utf8');
  return candidateBytes.length === expectedBytes.length
    && timingSafeEqual(candidateBytes, expectedBytes);
}

function createAuthService({
  User = UserModel,
  passwordHasher = bcrypt,
  tokenSigner = jwt,
  jwtSecret,
  legacyPasswordLoginEnabled = false,
  legacyPassword = '',
  legacyPasswordLoginUntil = null,
  now = () => new Date()
} = {}) {
  if (!jwtSecret) throw new Error('jwtSecret is required');

  async function dummyPasswordCompare(password) {
    await passwordHasher.compare(password, DUMMY_PASSWORD_HASH);
  }

  async function authenticateCredentials(rawUserId, password) {
    if (typeof rawUserId !== 'string' || typeof password !== 'string') return null;
    const userId = rawUserId.trim().toUpperCase();
    if (!userId || userId.length > MAX_LOGIN_ID_LENGTH || !password || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
      return null;
    }

    const user = await User.findOne({ userId }).select('+passwordHash');
    if (!user) {
      await dummyPasswordCompare(password);
      return null;
    }

    if (user.passwordHash) {
      const valid = await passwordHasher.compare(password, user.passwordHash);
      return valid && isActiveUser(user) ? user : null;
    }

    const migrationIsOpen = legacyPasswordLoginEnabled
      && legacyPassword
      && legacyPasswordLoginUntil
      && now().getTime() < new Date(legacyPasswordLoginUntil).getTime();
    if (!migrationIsOpen || !isActiveUser(user) || !matchesLegacyPassword(password, legacyPassword)) {
      await dummyPasswordCompare(password);
      return null;
    }

    const migratedHash = await passwordHasher.hash(password, 12);
    const missingHashFilter = {
      _id: user._id,
      $or: [
        { passwordHash: { $exists: false } },
        { passwordHash: null },
        { passwordHash: '' }
      ]
    };
    const migratedUser = await User.findOneAndUpdate(
      missingHashFilter,
      { $set: { passwordHash: migratedHash } },
      { new: true, runValidators: true }
    ).select('+passwordHash');
    if (migratedUser && isActiveUser(migratedUser)) return migratedUser;

    const currentUser = await User.findById(user._id).select('+passwordHash');
    if (!currentUser || !isActiveUser(currentUser) || !currentUser.passwordHash) return null;
    return await passwordHasher.compare(password, currentUser.passwordHash) ? currentUser : null;
  }

  function createToken(user) {
    return tokenSigner.sign(
      { userId: user.userId, role: user.role },
      jwtSecret,
      { expiresIn: '8h' }
    );
  }

  return { authenticateCredentials, createToken };
}

module.exports = {
  createAuthService,
  MAX_LOGIN_ID_LENGTH,
  MAX_PASSWORD_BYTES
};
