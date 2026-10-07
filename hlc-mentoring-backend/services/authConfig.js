function loadAuthConfig(env = process.env, now = Date.now()) {
  const nodeEnv = String(env.NODE_ENV || 'development').trim().toLowerCase();
  const isProduction = nodeEnv === 'production';
  const jwtSecret = String(env.JWT_SECRET || '').trim();

  if (!jwtSecret) {
    throw new Error('JWT_SECRET must be configured before starting the backend');
  }
  if (isProduction && (
    jwtSecret.length < 32
    || /replace|change.?me|development|example/i.test(jwtSecret)
  )) {
    throw new Error('JWT_SECRET must be a non-placeholder secret with at least 32 characters in production');
  }

  const legacyPasswordLoginEnabled = String(env.LEGACY_PASSWORD_LOGIN_ENABLED || '').trim().toLowerCase() === 'true';
  const legacyPassword = String(env.LEGACY_DEFAULT_PASSWORD || '');
  const legacyPasswordLoginUntilValue = String(env.LEGACY_PASSWORD_LOGIN_UNTIL || '').trim();
  const legacyPasswordLoginUntil = legacyPasswordLoginUntilValue
    ? new Date(legacyPasswordLoginUntilValue)
    : null;

  if (legacyPasswordLoginEnabled) {
    if (!legacyPassword || Buffer.byteLength(legacyPassword, 'utf8') < 8 || Buffer.byteLength(legacyPassword, 'utf8') > 72) {
      throw new Error('LEGACY_DEFAULT_PASSWORD is required and must be between 8 and 72 bytes when legacy login is enabled');
    }
    if (!legacyPasswordLoginUntil || Number.isNaN(legacyPasswordLoginUntil.getTime())) {
      throw new Error('LEGACY_PASSWORD_LOGIN_UNTIL must be a valid timestamp when legacy login is enabled');
    }
    if (legacyPasswordLoginUntil.getTime() <= now) {
      throw new Error('LEGACY_PASSWORD_LOGIN_UNTIL must be in the future when legacy login is enabled');
    }
  }

  const trustProxyHops = env.TRUST_PROXY_HOPS === undefined || env.TRUST_PROXY_HOPS === ''
    ? 0
    : Number(env.TRUST_PROXY_HOPS);
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0) {
    throw new Error('TRUST_PROXY_HOPS must be a non-negative integer');
  }

  for (const [name, password] of [
    ['DEFAULT_USER_PASSWORD', String(env.DEFAULT_USER_PASSWORD || '')],
    ['DEFAULT_MENTOR_PASSWORD', String(env.DEFAULT_MENTOR_PASSWORD || '')]
  ]) {
    if (password && (Buffer.byteLength(password, 'utf8') < 8 || Buffer.byteLength(password, 'utf8') > 72)) {
      throw new Error(`${name} must be between 8 and 72 bytes`);
    }
  }

  return {
    jwtSecret,
    isProduction,
    legacyPasswordLoginEnabled,
    legacyPassword,
    legacyPasswordLoginUntil,
    defaultUserPassword: String(env.DEFAULT_USER_PASSWORD || ''),
    defaultMentorPassword: String(env.DEFAULT_MENTOR_PASSWORD || ''),
    trustProxyHops
  };
}

module.exports = { loadAuthConfig };
