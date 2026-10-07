const assert = require('node:assert/strict');
const test = require('node:test');
const {
  pairRecapStatus,
  recapDeadline,
  roleRecapStatus
} = require('../mentoringRecapRules');

const date = (value) => new Date(value);

test('mentor and mentee recap deadlines both use the end of the session', () => {
  const schedule = {
    endTime: date('2026-10-06T12:00:00.000Z'),
    confirmedAt: date('2026-10-05T08:00:00.000Z'),
    createdAt: date('2026-10-04T08:00:00.000Z')
  };

  assert.equal(recapDeadline(schedule, 'MENTEE'), date('2026-10-07T12:00:00.000Z').getTime());
  assert.equal(recapDeadline(schedule, 'MENTOR'), date('2026-10-07T12:00:00.000Z').getTime());
});

test('mentor deadline does not depend on confirmation or schedule creation time', () => {
  const schedule = {
    endTime: date('2026-10-06T12:00:00.000Z'),
    createdAt: date('2026-10-01T08:00:00.000Z')
  };

  assert.equal(recapDeadline(schedule, 'MENTOR'), date('2026-10-07T12:00:00.000Z').getTime());
  assert.equal(
    roleRecapStatus(schedule, null, 'MENTOR', date('2026-10-10T12:00:00.000Z')),
    'MISSING'
  );
});

test('pair status uses the shared session-end deadline for both roles', () => {
  const schedule = {
    endTime: date('2026-10-05T08:00:00.000Z'),
    confirmedAt: date('2026-10-06T08:00:00.000Z')
  };

  assert.equal(
    pairRecapStatus(schedule, [], date('2026-10-07T09:00:00.000Z')),
    'CHƯA XONG'
  );
});

test('mentor recap submitted within the shared deadline is not late', () => {
  const schedule = {
    endTime: date('2026-10-06T12:00:00.000Z'),
    confirmedAt: date('2026-10-05T08:00:00.000Z')
  };
  const recaps = [{
    role: 'MENTOR',
    status: 'SUBMITTED',
    submittedAt: date('2026-10-06T09:00:00.000Z')
  }];

  assert.equal(
    pairRecapStatus(schedule, recaps, date('2026-10-06T10:00:00.000Z')),
    'CHỜ'
  );
});

test('pair status is complete when both recaps are submitted within the shared deadline', () => {
  const schedule = {
    endTime: date('2026-10-06T12:00:00.000Z'),
    confirmedAt: date('2026-10-05T08:00:00.000Z')
  };
  const recaps = [
    { role: 'MENTOR', status: 'SUBMITTED', submittedAt: date('2026-10-06T07:00:00.000Z') },
    { role: 'MENTEE', status: 'SUBMITTED', submittedAt: date('2026-10-07T11:00:00.000Z') }
  ];

  assert.equal(
    pairRecapStatus(schedule, recaps, date('2026-10-07T12:00:00.000Z')),
    'ĐÃ NỘP/ĐÃ XONG'
  );
});

test('historical late label does not override submission time under the shared deadline', () => {
  const schedule = {
    endTime: date('2026-10-06T12:00:00.000Z'),
    confirmedAt: date('2026-10-05T08:00:00.000Z')
  };
  const recap = {
    role: 'MENTOR',
    status: 'LATE',
    submittedAt: date('2026-10-07T11:00:00.000Z')
  };

  assert.equal(roleRecapStatus(schedule, recap, 'MENTOR', date('2026-10-07T12:00:00.000Z')), 'SUBMITTED');
});
