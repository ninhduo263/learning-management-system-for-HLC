import { getCurrentTime } from './time';

export interface TimelineCycle {
  code?: string;
  startDate?: string | Date;
}

function previousQuarterFinalMonth(cycle: TimelineCycle) {
  const start = new Date(cycle.startDate || '');
  if (Number.isNaN(start.getTime())) return null;
  const month = start.getUTCMonth();
  return {
    year: month === 0 ? start.getUTCFullYear() - 1 : start.getUTCFullYear(),
    month: month === 0 ? 11 : month - 1
  };
}

function timelineDate(cycle: TimelineCycle, day: number) {
  const previous = previousQuarterFinalMonth(cycle);
  return previous ? new Date(Date.UTC(previous.year, previous.month, day)) : null;
}

export function getMentoringTimeline(
  cycle: TimelineCycle | null | undefined,
  now = getCurrentTime()
) {
  if (!cycle) return null;
  const preferenceOpensAt = timelineDate(cycle, 5);
  const pairingOpensAt = timelineDate(cycle, 10);
  const pairingVisibleAt = timelineDate(cycle, 25);
  if (!preferenceOpensAt || !pairingOpensAt || !pairingVisibleAt) return null;

  return {
    preferenceOpensAt,
    pairingOpensAt,
    pairingVisibleAt,
    canMenteeChoose: now >= preferenceOpensAt && now < pairingOpensAt,
    canAdminPair: now >= pairingOpensAt,
    canViewPairing: now >= pairingVisibleAt
  };
}
