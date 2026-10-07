'use strict';

let runtimeMockDate;

function parseMockDate(value) {
  const normalized = String(value || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(normalized)) {
    throw new Error('MOCK_DATE phải có dạng YYYY-MM-DD hoặc ISO datetime');
  }

  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(normalized)
    ? `${normalized}T00:00:00.000Z`
    : normalized);
  if (Number.isNaN(date.getTime())) {
    throw new Error('MOCK_DATE không phải ngày hợp lệ');
  }
  return date;
}

function setRuntimeMockDate(value) {
  if (value !== null && !/^\d{4}-\d{2}-\d{2}$/.test(String(value))) {
    throw new Error('Ngày giả lập phải có dạng YYYY-MM-DD');
  }
  const date = value === null ? null : parseMockDate(value);
  if (date && date.toISOString().slice(0, 10) !== value) {
    throw new Error('Ngày giả lập không hợp lệ');
  }
  runtimeMockDate = date ? date.toISOString().slice(0, 10) : null;
}

function configuredMockDate() {
  if (runtimeMockDate !== undefined) {
    return { date: runtimeMockDate, source: runtimeMockDate ? 'runtime' : 'real' };
  }
  const configuredDate = String(process.env.MOCK_DATE || '').trim();
  if (!configuredDate) return { date: null, source: 'real' };
  return { date: parseMockDate(configuredDate).toISOString().slice(0, 10), source: 'environment' };
}

function getCurrentTime() {
  const { date } = configuredMockDate();
  if (!date) return new Date();

  if (runtimeMockDate === undefined && process.env.MOCK_DATE) {
    return parseMockDate(process.env.MOCK_DATE);
  }
  const [year, month, day] = date.split('-').map(Number);
  const currentTime = new Date();
  currentTime.setUTCFullYear(year, month - 1, day);
  return currentTime;
}

function getMockDateState() {
  const { date, source } = configuredMockDate();
  return { date, enabled: date !== null, source };
}

module.exports = { getCurrentTime, getMockDateState, setRuntimeMockDate };
