'use strict';

function parseMockDate(value) {
  const normalized = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(normalized)) {
    throw new Error('MOCK_DATE phải có dạng YYYY-MM-DD hoặc ISO datetime');
  }

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? `${normalized}T00:00:00.000Z`
      : normalized
  );
  if (Number.isNaN(date.getTime())) {
    throw new Error('MOCK_DATE không phải ngày hợp lệ');
  }
  return date;
}

function getCurrentTime() {
  const configuredDate = String(process.env.MOCK_DATE || '').trim();
  return configuredDate ? parseMockDate(configuredDate) : new Date();
}

module.exports = { getCurrentTime };
