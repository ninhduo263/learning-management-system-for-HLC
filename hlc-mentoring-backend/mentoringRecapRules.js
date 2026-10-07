const RECAP_WINDOW_MS = 24 * 60 * 60 * 1000;

function recapSubmissionTime(recap) {
  const value = recap?.submittedAt || recap?.createdAt || recap?.updatedAt;
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(timestamp) ? null : timestamp;
}

function recapDeadline(schedule, _role) {
  const start = schedule?.endTime;
  const timestamp = start ? new Date(start).getTime() : NaN;
  return Number.isNaN(timestamp) ? null : timestamp + RECAP_WINDOW_MS;
}

function roleRecapStatus(schedule, recap, role, now = new Date()) {
  if (!schedule) {
    return recap && !['MISSING', 'PENDING'].includes(recap.status)
      ? (recap.status === 'LATE' ? 'LATE' : 'SUBMITTED')
      : 'PENDING';
  }
  const deadline = recapDeadline(schedule, role);
  const submittedAt = recapSubmissionTime(recap);
  if (recap && !['MISSING', 'PENDING'].includes(recap.status)) {
    return (submittedAt === null && recap.status === 'LATE')
      || (deadline !== null && submittedAt !== null && submittedAt > deadline)
      ? 'LATE'
      : 'SUBMITTED';
  }
  return deadline !== null && now.getTime() > deadline ? 'MISSING' : 'PENDING';
}

function pairRecapStatus(schedule, recaps, now = new Date()) {
  const latestByRole = new Map();
  for (const recap of recaps) {
    if (!['MENTOR', 'MENTEE'].includes(recap.role) || ['MISSING', 'PENDING'].includes(recap.status)) continue;
    const existing = latestByRole.get(recap.role);
    if (!existing || (recapSubmissionTime(recap) || 0) > (recapSubmissionTime(existing) || 0)) {
      latestByRole.set(recap.role, recap);
    }
  }
  const statuses = ['MENTOR', 'MENTEE'].map((role) =>
    roleRecapStatus(schedule, latestByRole.get(role), role, now)
  );
  if (statuses.includes('LATE')) return 'NỘP MUỘN';
  if (statuses.includes('MISSING')) return 'CHƯA XONG';
  if (statuses.every((status) => status === 'SUBMITTED')) return 'ĐÃ NỘP/ĐÃ XONG';
  return 'CHỜ';
}

module.exports = {
  recapSubmissionTime,
  recapDeadline,
  roleRecapStatus,
  pairRecapStatus
};
