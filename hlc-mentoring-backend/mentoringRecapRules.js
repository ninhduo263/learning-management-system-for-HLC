const RECAP_WINDOW_MS = 24 * 60 * 60 * 1000;

function recapSubmissionTime(recap) {
  const value = recap?.submittedAt || recap?.createdAt || recap?.updatedAt;
  const timestamp = value ? new Date(value).getTime() : NaN;
  return Number.isNaN(timestamp) ? null : timestamp;
}

function recapDeadline(schedule, role) {
  const start = role === 'MENTEE'
    ? schedule?.endTime
    : (schedule?.confirmedAt || schedule?.createdAt);
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
    return (recap.status === 'LATE' && submittedAt === null)
      || (deadline !== null && submittedAt !== null && submittedAt > deadline)
      ? 'LATE'
      : 'SUBMITTED';
  }
  return deadline !== null && now.getTime() > deadline ? 'MISSING' : 'PENDING';
}

function pairRecapStatus(schedule, recaps, now = new Date()) {
  const deadline = recapDeadline(schedule, 'MENTOR');
  const latestByRole = new Map();
  for (const recap of recaps) {
    if (!['MENTOR', 'MENTEE'].includes(recap.role) || ['MISSING', 'PENDING'].includes(recap.status)) continue;
    const existing = latestByRole.get(recap.role);
    if (!existing || (recapSubmissionTime(recap) || 0) > (recapSubmissionTime(existing) || 0)) {
      latestByRole.set(recap.role, recap);
    }
  }
  const hasLate = [...latestByRole.values()].some((recap) => {
    const submittedAt = recapSubmissionTime(recap);
    return (recap.status === 'LATE' && submittedAt === null)
      || (deadline !== null && submittedAt !== null && submittedAt > deadline);
  });
  if (hasLate) return 'NỘP MUỘN';
  if (latestByRole.size < 2) {
    return deadline !== null && now.getTime() > deadline ? 'CHƯA XONG' : 'CHỜ';
  }
  return 'ĐÃ NỘP/ĐÃ XONG';
}

module.exports = {
  recapSubmissionTime,
  recapDeadline,
  roleRecapStatus,
  pairRecapStatus
};
