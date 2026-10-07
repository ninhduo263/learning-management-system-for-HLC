import { getCurrentTime } from './time';

interface RecapSchedule {
  status: string;
  endTime: string | Date;
  confirmedAt?: string | Date | null;
  createdAt?: string | Date;
}

interface RecapReview {
  status?: string;
  submittedAt?: string | Date | null;
  createdAt?: string | Date;
}

export type MentoringRecapProgressStatus = 'PENDING' | 'SUBMITTED' | 'MISSING' | 'LATE';

const RECAP_WINDOW_MS = 24 * 60 * 60 * 1000;

export function getMentoringRecapProgressStatus(
  schedule: RecapSchedule,
  recap: RecapReview | null | undefined,
  _role: 'MENTOR' | 'MENTEE',
  now = getCurrentTime()
): MentoringRecapProgressStatus {
  const start = schedule.endTime;
  const startTime = start ? new Date(start).getTime() : NaN;
  const deadline = Number.isNaN(startTime) ? null : startTime + RECAP_WINDOW_MS;
  const recapIsSubmitted = recap && !['MISSING', 'PENDING'].includes(recap.status || '');
  if (recapIsSubmitted) {
    const submittedAtValue = recap.submittedAt || recap.createdAt;
    const submittedAt = submittedAtValue ? new Date(submittedAtValue).getTime() : NaN;
    return (recap.status === 'LATE' && Number.isNaN(submittedAt))
      || (deadline !== null && !Number.isNaN(submittedAt) && submittedAt > deadline)
      ? 'LATE'
      : 'SUBMITTED';
  }
  return deadline !== null && now.getTime() > deadline ? 'MISSING' : 'PENDING';
}

export function mentoringRecapDeadline(schedule: RecapSchedule) {
  const start = schedule.endTime;
  if (!start) return null;
  const timestamp = new Date(start).getTime();
  return Number.isNaN(timestamp) ? null : new Date(timestamp + RECAP_WINDOW_MS);
}

export function mentoringRecapDeadlineSource() {
  return 'kết thúc buổi + 24 giờ';
}

export function mentoringRecapProgressLabel(status: MentoringRecapProgressStatus) {
  return {
    PENDING: 'Chờ',
    SUBMITTED: 'Đã nộp',
    MISSING: 'Chưa xong',
    LATE: 'Nộp muộn'
  }[status];
}

export function mentoringRecapProgressColor(status: MentoringRecapProgressStatus) {
  return {
    PENDING: 'gold',
    SUBMITTED: 'green',
    MISSING: 'red',
    LATE: 'gold'
  }[status];
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
