const MOCK_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/;
const CLIENT_MOCK_DATE_KEY = 'hlc_mock_date';

function parseMockDate(value: string) {
  const normalized = value.trim();
  if (!MOCK_DATE_PATTERN.test(normalized)) {
    throw new Error('NEXT_PUBLIC_MOCK_DATE phải có dạng YYYY-MM-DD hoặc ISO datetime');
  }

  const date = new Date(
    /^\d{4}-\d{2}-\d{2}$/.test(normalized)
      ? `${normalized}T00:00:00.000Z`
      : normalized
  );
  if (Number.isNaN(date.getTime())) {
    throw new Error('NEXT_PUBLIC_MOCK_DATE không phải ngày hợp lệ');
  }
  return date;
}

export function getCurrentTime() {
  if (typeof window !== 'undefined') {
    const clientMockDate = window.localStorage.getItem(CLIENT_MOCK_DATE_KEY);
    if (clientMockDate === '__REAL__') return new Date();
    if (clientMockDate) return parseMockDate(clientMockDate);
  }

  const configuredDate = process.env.NEXT_PUBLIC_MOCK_DATE?.trim();
  return configuredDate ? parseMockDate(configuredDate) : new Date();
}

export function setClientMockDate(value: string | null) {
  if (typeof window === 'undefined') return;
  if (value === null) {
    window.localStorage.setItem(CLIENT_MOCK_DATE_KEY, '__REAL__');
  } else {
    window.localStorage.setItem(CLIENT_MOCK_DATE_KEY, parseMockDate(value).toISOString());
  }
  window.dispatchEvent(new Event('hlc-mock-date-change'));
}

export function isSameMonth(
  value: string | Date,
  reference = getCurrentTime()
) {
  const date = new Date(value);
  return !Number.isNaN(date.getTime())
    && date.getFullYear() === reference.getFullYear()
    && date.getMonth() === reference.getMonth();
}
