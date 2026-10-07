'use strict';

function normalizeMonth(month) {
  const match = String(month ?? '').trim().match(/^(?:tháng\s*)?(0?[1-9]|1[0-2])$/i);
  const value = Number(match ? match[1] : month);
  if (!Number.isInteger(value) || value < 1 || value > 12) {
    throw new Error('Tháng ghép cặp phải từ 1 đến 12');
  }
  return value;
}

function normalizeYear(year) {
  const value = Number(year);
  if (!Number.isInteger(value) || value < 2000 || value > 9999) {
    throw new Error('Năm ghép cặp không hợp lệ');
  }
  return value;
}

function participantSuffix(userId, label) {
  const suffix = String(userId ?? '').trim().replace(/\s+/g, '').slice(-5);
  if (!/^\d{5}$/.test(suffix)) {
    throw new Error(`${label} phải có 5 chữ số cuối hợp lệ`);
  }
  return suffix;
}

function generatePairingIds(month, year, mentorId, menteeId) {
  const monthNumber = normalizeMonth(month);
  const yearNumber = normalizeYear(year);
  const quarter = Math.floor((monthNumber - 1) / 3) + 1;
  const mentorSuffix = participantSuffix(mentorId, 'Mentor ID');
  const menteeSuffix = participantSuffix(menteeId, 'Mentee ID');

  return {
    monthlyId: `T${monthNumber}Q${quarter}${yearNumber}O${mentorSuffix}E${menteeSuffix}`,
    quarterlyId: `Q${quarter}${yearNumber}O${mentorSuffix}E${menteeSuffix}`
  };
}

module.exports = {
  generatePairingIds,
  normalizeMonth,
  normalizeYear
};
