import { getCurrentTime } from './time';

interface RecapSchedule {
  status: string;
  endTime: string | Date;
}

interface RecapReview {
  status?: string;
}

export function canWriteMentoringRecap(
  schedule: RecapSchedule,
  recap?: RecapReview | null,
  now = getCurrentTime()
) {
  return recap?.status !== 'APPROVED'
    && ['COMPLETED', 'CONFIRMED'].includes(schedule.status)
    && new Date(schedule.endTime) <= now;
}

export function mentoringRecapDeadline(schedule: RecapSchedule) {
  return new Date(new Date(schedule.endTime).getTime() + 24 * 60 * 60 * 1000);
}
