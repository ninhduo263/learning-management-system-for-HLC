export interface Quarter {
  year: number;
  quarter: number;
}

export function getQuarter(date = new Date()): Quarter {
  return {
    year: date.getFullYear(),
    quarter: Math.floor(date.getMonth() / 3) + 1
  };
}

export function quarterKey({ year, quarter }: Quarter) {
  return year * 4 + quarter;
}

export function parseCycleQuarter(cycleId?: string | null): Quarter | null {
  const match = /^(\d{4})Q([1-4])$/i.exec(String(cycleId || '').trim());
  return match ? { year: Number(match[1]), quarter: Number(match[2]) } : null;
}

export function isOnOrAfterLastQuarterMonthDay(
  date = new Date(),
  day = 25
) {
  const quarter = getQuarter(date);
  const lastMonthOfQuarter = quarter.quarter * 3 - 1;
  return date.getMonth() === lastMonthOfQuarter && date.getDate() >= day;
}

export function canViewNextQuarter(date = new Date()) {
  return isOnOrAfterLastQuarterMonthDay(date);
}
