const ACTIVE_USER_QUERY = { $in: [/^yes$/i, /^có$/i, /^co$/i, /^active$/i, /^true$/i] };
const mentorUserFilter = { role: 'MENTOR', isActive: ACTIVE_USER_QUERY, userId: /^HLC-MTO-\d+$/i };

function formatBirthDatePassword(value) {
  if (!value) return null;
  let date;
  if (value instanceof Date) {
    date = value;
  } else if (typeof value === 'string') {
    const text = value.trim();
    const vietnameseDate = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(text);
    date = vietnameseDate
      ? new Date(Date.UTC(
        Number(vietnameseDate[3]),
        Number(vietnameseDate[2]) - 1,
        Number(vietnameseDate[1])
      ))
      : new Date(text);
  } else if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial dates can remain in legacy/imported records.
    date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  } else {
    date = new Date(value);
  }
  if (Number.isNaN(date.getTime())) return null;
  const hasTimeComponent = date.getUTCHours() !== 0
    || date.getUTCMinutes() !== 0
    || date.getUTCSeconds() !== 0;
  const calendarDate = hasTimeComponent
    ? new Date(date.getTime() + (7 * 60 * 60 * 1000))
    : date;
  if (typeof value === 'string') {
    const vietnameseDate = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(value.trim());
    if (vietnameseDate && (calendarDate.getUTCFullYear() !== Number(vietnameseDate[3])
      || calendarDate.getUTCMonth() !== Number(vietnameseDate[2]) - 1
      || calendarDate.getUTCDate() !== Number(vietnameseDate[1]))) {
      return null;
    }
  }
  const pad = (number) => String(number).padStart(2, '0');
  return `${pad(calendarDate.getUTCDate())}${pad(calendarDate.getUTCMonth() + 1)}${calendarDate.getUTCFullYear()}`;
}

module.exports = {
  ACTIVE_USER_QUERY,
  mentorUserFilter,
  formatBirthDatePassword
};

