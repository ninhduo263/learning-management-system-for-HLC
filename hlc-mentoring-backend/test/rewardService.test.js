const assert = require('node:assert/strict');
const test = require('node:test');
const { createRewardService } = require('../services/rewardService');

function createScoreEventModel(overrides = {}) {
  return {
    init: async () => undefined,
    findOneAndUpdate: async () => null,
    findOne: async () => null,
    ...overrides
  };
}

function validEvent(overrides = {}) {
  return {
    userId: 'HLC-MTE-00001',
    cycleId: '2026Q4',
    ruleId: 'SUBMISSION_APPROVED',
    category: 'ACADEMIC',
    sourceType: 'SUBMISSION',
    sourceId: 'submission-123',
    points: 2,
    description: 'Approved submission',
    ...overrides
  };
}

test('default reward seeding preserves existing rule values', async () => {
  const updates = [];
  const service = createRewardService({
    RewardRule: {
      updateOne: async (...args) => updates.push(args)
    },
    ScoreEvent: createScoreEventModel()
  });

  await service.ensureDefaultRewardRules();

  assert.equal(updates.length, 4);
  for (const [filter, update, options] of updates) {
    assert.ok(filter.code);
    assert.deepEqual(Object.keys(update), ['$setOnInsert']);
    assert.equal(update.$setOnInsert.code, filter.code);
    assert.equal(options.upsert, true);
    assert.equal(options.runValidators, true);
  }
});

test('score event is created with an atomic idempotent upsert', async () => {
  const storedEvent = { _id: 'event-1', points: 2 };
  const calls = [];
  let initialized = false;
  const service = createRewardService({
    RewardRule: {},
    ScoreEvent: createScoreEventModel({
      init: async () => { initialized = true; },
      findOneAndUpdate: async (...args) => {
        calls.push(args);
        return storedEvent;
      }
    })
  });

  const result = await service.addSystemScoreEvent(validEvent({
    userId: ' HLC-MTE-00001 ',
    points: '2'
  }));

  assert.equal(result, storedEvent);
  assert.equal(initialized, true);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0][0], {
    userId: 'HLC-MTE-00001',
    cycleId: '2026Q4',
    ruleId: 'SUBMISSION_APPROVED',
    sourceId: 'submission-123'
  });
  assert.equal(calls[0][1].$setOnInsert.points, 2);
  assert.equal(calls[0][2].upsert, true);
  assert.equal(calls[0][2].timestamps, false);
});

test('score event rejects invalid fields before database access', async () => {
  let initCalls = 0;
  const service = createRewardService({
    RewardRule: {},
    ScoreEvent: createScoreEventModel({
      init: async () => { initCalls += 1; }
    })
  });

  await assert.rejects(service.addSystemScoreEvent(validEvent({ sourceId: '' })), /sourceId/);
  await assert.rejects(service.addSystemScoreEvent(validEvent({ sourceType: '' })), /sourceType/);
  await assert.rejects(service.addSystemScoreEvent(validEvent({ points: Number.NaN })), /points/);
  await assert.rejects(service.addSystemScoreEvent(validEvent({ points: Number.POSITIVE_INFINITY })), /points/);
  await assert.rejects(service.addSystemScoreEvent(validEvent({ points: 0 })), /points/);
  assert.equal(initCalls, 0);
});

test('duplicate-key race returns the event written by the competing request', async () => {
  const duplicateError = Object.assign(new Error('duplicate key'), { code: 11000 });
  const existingEvent = { _id: 'event-1' };
  let fallbackQuery;
  const service = createRewardService({
    RewardRule: {},
    ScoreEvent: createScoreEventModel({
      findOneAndUpdate: async () => { throw duplicateError; },
      findOne: async (query) => {
        fallbackQuery = query;
        return existingEvent;
      }
    })
  });

  const result = await service.addSystemScoreEvent(validEvent());

  assert.equal(result, existingEvent);
  assert.deepEqual(fallbackQuery, {
    userId: 'HLC-MTE-00001',
    cycleId: '2026Q4',
    ruleId: 'SUBMISSION_APPROVED',
    sourceId: 'submission-123'
  });
});
