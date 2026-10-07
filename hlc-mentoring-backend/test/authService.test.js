const assert = require('node:assert/strict');
const test = require('node:test');
const { createAuthService } = require('../services/authService');

function queryResult(value) {
  return { select: async () => value };
}

function createService({ user, findOneAndUpdate, findById, passwordHasher } = {}) {
  const User = {
    findOne: () => queryResult(user || null),
    findOneAndUpdate: findOneAndUpdate || (() => queryResult(null)),
    findById: findById || (() => queryResult(null))
  };
  const tokenSigner = {
    sign: (payload, secret, options) => ({ payload, secret, options })
  };
  return createAuthService({
    User,
    passwordHasher: passwordHasher || {
      compare: async (plain, hash) => plain === hash,
      hash: async (plain) => `hash:${plain}`
    },
    tokenSigner,
    jwtSecret: 'test-secret',
    legacyPasswordLoginEnabled: true,
    legacyPassword: 'Legacy-Password-1',
    legacyPasswordLoginUntil: new Date('2027-01-01T00:00:00Z'),
    now: () => new Date('2026-10-06T00:00:00Z')
  });
}

test('valid credentials use the existing password hash and return active user', async () => {
  const user = {
    userId: 'HLC-MTE-00001',
    role: 'MENTEE',
    isActive: 'yes',
    passwordHash: 'correct-password'
  };
  const service = createService({ user });

  assert.equal(await service.authenticateCredentials('hlc-mte-00001', 'correct-password'), user);
  assert.equal(await service.authenticateCredentials('hlc-mte-00001', 'wrong-password'), null);
  assert.deepEqual(service.createToken(user), {
    payload: { userId: 'HLC-MTE-00001', role: 'MENTEE' },
    secret: 'test-secret',
    options: { expiresIn: '8h' }
  });
});

test('unknown users receive a dummy password comparison', async () => {
  let comparedDummyHash = false;
  const service = createService({
    user: null,
    passwordHasher: {
      compare: async (_plain, hash) => {
        comparedDummyHash = hash !== 'correct-password';
        return false;
      },
      hash: async (plain) => `hash:${plain}`
    }
  });

  assert.equal(await service.authenticateCredentials('unknown-user', 'some-password'), null);
  assert.equal(comparedDummyHash, true);
});

test('legacy password migration atomically writes the new hash', async () => {
  const legacyUser = { _id: 'user-1', userId: 'HLC-MTE-00001', role: 'MENTEE', isActive: 'yes' };
  let updateFilter;
  let updateDocument;
  const migratedUser = { ...legacyUser, passwordHash: 'hash:Legacy-Password-1' };
  const service = createService({
    user: legacyUser,
    findOneAndUpdate: (filter, update) => {
      updateFilter = filter;
      updateDocument = update;
      return queryResult(migratedUser);
    }
  });

  assert.equal(await service.authenticateCredentials('HLC-MTE-00001', 'Legacy-Password-1'), migratedUser);
  assert.equal(updateFilter._id, 'user-1');
  assert.ok(Array.isArray(updateFilter.$or));
  assert.equal(updateDocument.$set.passwordHash, 'hash:Legacy-Password-1');
});

test('legacy migration race rechecks the current password hash', async () => {
  const legacyUser = { _id: 'user-1', userId: 'HLC-MTE-00001', role: 'MENTEE', isActive: 'yes' };
  const changedUser = { ...legacyUser, passwordHash: 'Legacy-Password-1' };
  const service = createService({
    user: legacyUser,
    findOneAndUpdate: () => queryResult(null),
    findById: () => queryResult(changedUser)
  });

  assert.equal(await service.authenticateCredentials('HLC-MTE-00001', 'Legacy-Password-1'), changedUser);
});

test('legacy login is not allowed for inactive users or expired migration', async () => {
  const legacyUser = { _id: 'user-1', userId: 'HLC-MTE-00001', role: 'MENTEE', isActive: 'no' };
  assert.equal(await createService({ user: legacyUser }).authenticateCredentials('HLC-MTE-00001', 'Legacy-Password-1'), null);
  const expiredService = createAuthService({
    User: { findOne: () => queryResult(legacyUser) },
    passwordHasher: { compare: async () => false, hash: async () => 'hash' },
    jwtSecret: 'test-secret',
    legacyPasswordLoginEnabled: true,
    legacyPassword: 'Legacy-Password-1',
    legacyPasswordLoginUntil: new Date('2026-01-01T00:00:00Z'),
    now: () => new Date('2026-10-06T00:00:00Z')
  });
  assert.equal(await expiredService.authenticateCredentials('HLC-MTE-00001', 'Legacy-Password-1'), null);
});

test('invalid credential types and overlong bcrypt passwords are rejected', async () => {
  let queried = false;
  const service = createAuthService({
    User: {
      findOne: () => {
        queried = true;
        return queryResult(null);
      }
    },
    passwordHasher: { compare: async () => false, hash: async () => 'hash' },
    jwtSecret: 'test-secret'
  });

  assert.equal(await service.authenticateCredentials({ $ne: null }, 'password'), null);
  assert.equal(await service.authenticateCredentials('user', 'x'.repeat(73)), null);
  assert.equal(queried, false);
});
