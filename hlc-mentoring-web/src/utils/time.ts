const MOCK_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}(?:T.*)?$/;

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
  const configuredDate = process.env.NEXT_PUBLIC_MOCK_DATE?.trim();
  return configuredDate ? parseMockDate(configuredDate) : new Date();
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
