import { getCurrentTime } from './time';

export interface Quarter {
  year: number;
  quarter: number;
}

export function getQuarter(date = getCurrentTime()): Quarter {
  return {
    year: date.getFullYear(),
    quarter: Math.floor(date.getMonth() / 3) + 1
  };
}

export const getCurrentQuarter = getQuarter;

export function quarterKey({ year, quarter }: Quarter) {
  return year * 4 + quarter;
}

export function parseCycleQuarter(cycleId?: string | null): Quarter | null {
  const value = String(cycleId || '').trim().toUpperCase();
  const match =
    /^(\d{4})-?Q([1-4])$/.exec(value) ||
    /^Q([1-4])[-/]?(\d{4})$/.exec(value);

  if (!match) return null;

  const year = match[1].length === 4 ? Number(match[1]) : Number(match[2]);
  const quarter = match[1].length === 4 ? Number(match[2]) : Number(match[1]);
  return { year, quarter };
}

export function isPastQuarter(
  pairQuarter: Quarter,
  currentQuarter: Quarter
) {
  return quarterKey(pairQuarter) < quarterKey(currentQuarter);
}

export function isOnOrAfterLastQuarterMonthDay(
  date = getCurrentTime(),
  day = 25
) {
  const quarter = getQuarter(date);
  const lastMonthOfQuarter = quarter.quarter * 3 - 1;
  return date.getMonth() === lastMonthOfQuarter && date.getDate() >= day;
}

export function canViewNextQuarter(date = getCurrentTime()) {
  return isOnOrAfterLastQuarterMonthDay(date);
}
