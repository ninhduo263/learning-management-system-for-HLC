import { getCurrentTime } from './time';

interface RecapSchedule {
  status: string;
  endTime: string | Date;
}

export function canWriteMentoringRecap(
  schedule: RecapSchedule,
  now = getCurrentTime()
) {
  return ['COMPLETED', 'CONFIRMED'].includes(schedule.status)
    && new Date(schedule.endTime) <= now;
}

export function mentoringRecapDeadline(schedule: RecapSchedule) {
  return new Date(new Date(schedule.endTime).getTime() + 24 * 60 * 60 * 1000);
}
