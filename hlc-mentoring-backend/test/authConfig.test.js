const assert = require('node:assert/strict');
const test = require('node:test');
const { loadAuthConfig } = require('../services/authConfig');

const productionSecret = 'a'.repeat(48);
const testSecret = 'test-only-secret';

test('production config requires a non-placeholder strong JWT secret', () => {
  assert.throws(
    () => loadAuthConfig({ NODE_ENV: 'production' }),
    /JWT_SECRET must be configured/
  );
  assert.throws(
    () => loadAuthConfig({ NODE_ENV: 'production', JWT_SECRET: 'short-secret' }),
    /at least 32 characters/
  );
  assert.throws(
    () => loadAuthConfig({ NODE_ENV: 'production', JWT_SECRET: 'replace-with-a-strong-secret-1234567890' }),
    /non-placeholder/
  );
  assert.equal(
    loadAuthConfig({ NODE_ENV: 'production', JWT_SECRET: productionSecret }).jwtSecret,
    productionSecret
  );
});

test('development config also requires an explicit JWT secret', () => {
  assert.throws(
    () => loadAuthConfig({ NODE_ENV: 'development' }),
    /JWT_SECRET must be configured/
  );
});

test('legacy login is disabled by default and needs a future expiry to enable', () => {
  assert.equal(loadAuthConfig({ NODE_ENV: 'test', JWT_SECRET: testSecret }).legacyPasswordLoginEnabled, false);
  assert.throws(
    () => loadAuthConfig({
      NODE_ENV: 'test',
      JWT_SECRET: testSecret,
      LEGACY_PASSWORD_LOGIN_ENABLED: 'true',
      LEGACY_DEFAULT_PASSWORD: 'Temporary-Password-1'
    }),
    /LEGACY_PASSWORD_LOGIN_UNTIL/
  );
  assert.throws(
    () => loadAuthConfig({
      NODE_ENV: 'test',
      JWT_SECRET: testSecret,
      LEGACY_PASSWORD_LOGIN_ENABLED: 'true',
      LEGACY_DEFAULT_PASSWORD: 'Temporary-Password-1',
      LEGACY_PASSWORD_LOGIN_UNTIL: '2026-01-01T00:00:00Z'
    }),
    /must be in the future/
  );
  const config = loadAuthConfig({
    NODE_ENV: 'test',
    JWT_SECRET: testSecret,
    LEGACY_PASSWORD_LOGIN_ENABLED: 'true',
    LEGACY_DEFAULT_PASSWORD: 'Temporary-Password-1',
    LEGACY_PASSWORD_LOGIN_UNTIL: '2027-01-01T00:00:00Z'
  }, Date.parse('2026-10-06T00:00:00Z'));
  assert.equal(config.legacyPasswordLoginEnabled, true);
});

test('configured provisioning passwords follow bcrypt length bounds', () => {
  assert.throws(
    () => loadAuthConfig({ NODE_ENV: 'test', JWT_SECRET: testSecret, DEFAULT_USER_PASSWORD: 'short' }),
    /DEFAULT_USER_PASSWORD/
  );
  assert.throws(
    () => loadAuthConfig({ NODE_ENV: 'test', JWT_SECRET: testSecret, DEFAULT_MENTOR_PASSWORD: 'x'.repeat(73) }),
    /DEFAULT_MENTOR_PASSWORD/
  );
});
