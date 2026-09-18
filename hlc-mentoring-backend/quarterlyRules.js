'use strict';

function quarterOf(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Ngày không hợp lệ');
  return Math.floor(date.getUTCMonth() / 3) + 1;
}

function quarterCode(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error('Ngày không hợp lệ');
  return `${date.getUTCFullYear()}Q${quarterOf(date)}`;
}

function quarterDates(year, quarter) {
  const y = Number(year);
  const q = Number(quarter);
  if (!Number.isInteger(y) || !Number.isInteger(q) || q < 1 || q > 4) {
    throw new Error('Quý phải là Q1, Q2, Q3 hoặc Q4');
  }
  return { startDate: new Date(Date.UTC(y, (q - 1) * 3, 1)), endDate: new Date(Date.UTC(y, q * 3, 0, 23, 59, 59, 999)) };
}

function validateQuarter(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) throw new Error('Khoảng thời gian không hợp lệ');
  const code = quarterCode(start);
  const dates = quarterDates(start.getUTCFullYear(), quarterOf(start));
  const sameDay = (a, b) => a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate();
  if (!sameDay(start, dates.startDate) || !sameDay(end, dates.endDate)) {
    throw new Error('Kỳ mentoring phải bao phủ trọn một quý');
  }
  return { code, startDate: dates.startDate, endDate: dates.endDate };
}

function monthlyMentoringCode(cycleCode, month) {
  const match = /^(\d{4})-?Q([1-4])$/i.exec(String(cycleCode || '').trim());
  const monthNumber = Number(month);
  if (!match || !Number.isInteger(monthNumber) || monthNumber < 1 || monthNumber > 3) {
    throw new Error('Mã quý hoặc tháng mentoring không hợp lệ');
  }

  return `${match[1]}Q${match[2]}M${monthNumber}`;
}

function previousQuarterFinalMonth(cycle) {
  const start = new Date(cycle && cycle.startDate);
  if (Number.isNaN(start.getTime())) throw new Error('Ngày bắt đầu quý không hợp lệ');
  return { year: start.getUTCMonth() === 0 ? start.getUTCFullYear() - 1 : start.getUTCFullYear(), month: start.getUTCMonth() === 0 ? 11 : start.getUTCMonth() - 1 };
}

function quarterPreferenceDeadline(cycle) {
  const previous = previousQuarterFinalMonth(cycle);
  return new Date(Date.UTC(previous.year, previous.month, 5, 23, 59, 59, 999));
}

function pairingStartDate(cycle) {
  const previous = previousQuarterFinalMonth(cycle);
  return new Date(Date.UTC(previous.year, previous.month, 10));
}

function isCycleLocked(cycle) {
  return cycle && ['LOCKED', 'EXPORTED', 'PAID'].includes(String(cycle.status).toUpperCase());
}

function canEditSchedule(schedule, actor, now = new Date()) {
  if (!schedule || ['CANCELLED', 'COMPLETED'].includes(schedule.status)) return false;
  if (new Date(schedule.startTime) <= new Date(now)) return false;
  if (actor && actor.role === 'ADMIN') return true;
  return Boolean(actor && [schedule.mentorId, schedule.menteeId, schedule.proposedBy].includes(actor.userId));
}

function recapStatus(recaps, expectedRoles = ['MENTOR', 'MENTEE']) {
  const list = Array.isArray(recaps) ? recaps : [];
  const submittedRoles = new Set(list.filter((r) => ['SUBMITTED', 'APPROVED'].includes(r.status)).map((r) => r.role));
  if (!list.length) return 'MISSING';
  if (expectedRoles.some((role) => !submittedRoles.has(role))) return 'PENDING';
  if (list.every((r) => r.status === 'APPROVED')) return 'APPROVED';
  return 'SUBMITTED';
}

function timingPoints(_startTime, submittedAt, rule = {}) {
  if (!submittedAt) return 0;
  const day = new Date(submittedAt).getDate();
  if (day <= 7) return Number(rule.firstWeekPoints ?? 2);
  if (day <= 13) return Number(rule.firstThirteenDaysPoints ?? 1);
  return 0;
}

function topThreeAwards(rows, points = [5, 3, 2]) {
  return (Array.isArray(rows) ? rows : []).slice(0, 3).map((row, index) => ({
    rank: index + 1, userId: row.userId, points: Number(points[index] || 0), score: row.score ?? row.totalScore ?? 0
  }));
}

module.exports = {
  quarterOf, quarterCode, quarterDates, validateQuarter, monthlyMentoringCode,
  quarterPreferenceDeadline, pairingStartDate,
  isCycleLocked, canEditSchedule, recapStatus, timingPoints, topThreeAwards
};
