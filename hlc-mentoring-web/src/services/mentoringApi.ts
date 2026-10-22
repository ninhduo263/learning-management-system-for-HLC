import { apiFetch, apiJson, downloadFile } from '@/lib/api';

export type RoleRecapStatus = 'NO_SCHEDULE' | 'PENDING' | 'SUBMITTED' | 'LATE' | 'MISSING';
export type PairRecapStatus = 'CANCELLED' | 'NO_SCHEDULE' | 'PENDING' | 'DONE' | 'LATE' | 'MISSING';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MemberView {
  _id: string;
  memberCode: string;
  memberType: 'MENTOR' | 'MENTEE';
  fullName: string;
  phone: string | null;
  email: string | null;
  profileUrl: string | null;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface RecapView {
  _id: string;
  role: 'MENTOR' | 'MENTEE';
  memberCode: string;
  content: string;
  firstSubmittedAt: string;
  lastSubmittedAt: string;
  isLate: boolean;
  reviewStatus: ReviewStatus;
  reviewNote: string | null;
  reviewedAt: string | null;
  media: { fileId: string | null; url: string; fileName: string | null; mimeType: string | null }[];
}

export interface ScheduleView {
  startAt: string;
  endAt: string;
  firstStartAt: string;
  location: string | null;
  meetingLink: string | null;
  note: string | null;
  submittedAt: string | null;
  submittedBy: string | null;
}

export interface SessionView {
  _id: string;
  /** Mã mentoring tháng, ví dụ T10Q42026O00012E00034 */
  code: string;
  quarterCode: string;
  year: number;
  month: number;
  monthIndex: number;
  status: 'ACTIVE' | 'CANCELLED';
  pair: { _id: string; code: string; status: string; source: string };
  mentor: MemberView | null;
  mentee: MemberView | null;
  schedule: ScheduleView | null;
  recapDeadlineAt: string | null;
  recaps: { mentor: RecapView | null; mentee: RecapView | null };
  recapStatus: { mentor: RoleRecapStatus; mentee: RoleRecapStatus; pair: PairRecapStatus; source: 'SYSTEM' | 'IMPORTED' };
}

export interface MySessionView extends SessionView {
  myRole: 'MENTOR' | 'MENTEE';
  canEditSchedule: boolean;
  canWriteRecap: boolean;
}

export interface QuarterView {
  _id: string;
  code: string;
  year: number;
  quarter: number;
  startDate: string;
  endDate: string;
  preferenceOpenAt: string;
  pairingOpenAt: string;
  visibleAt: string;
  isLocked: boolean;
  months: number[];
  canPair: boolean;
  canChoosePreference: boolean;
  isVisibleToMember: boolean;
  hasEnded: boolean;
}

export interface QuarterBoard {
  quarter: QuarterView;
  sessions: SessionView[];
  preferences: { _id: string; menteeCode: string; mentorCodes: string[]; message: string | null; submittedAt: string }[];
}

export interface MyMentoring {
  member: MemberView;
  now: string;
  quarters: QuarterView[];
  sessions: MySessionView[];
  preference: null | {
    quarterCode: string;
    opensAt: string;
    closesAt: string;
    canChoose: boolean;
    mine: null | { mentorCodes: string[]; message: string | null; submittedAt: string };
  };
}

export interface QuarterReport {
  quarter: { code: string; year: number; quarter: number; months: number[]; hasEnded: boolean; isLocked: boolean };
  hasImportedStatus: boolean;
  rows: {
    key: string;
    serial: number | null;
    pairCode: string;
    role: 'MENTOR' | 'MENTEE';
    member: MemberView | null;
    months: Record<string, null | { sessionId: string; code: string; status: RoleRecapStatus; pairStatus: PairRecapStatus }>;
  }[];
}

export interface MyQuarterReport {
  key: string;
  pairCode: string;
  quarterCode: string;
  year: number;
  quarter: number;
  role: 'MENTOR' | 'MENTEE';
  me: MemberView;
  mentor: MemberView | null;
  mentee: MemberView | null;
  months: {
    month: number;
    session: null | { _id: string; code: string; schedule: ScheduleView | null; status: RoleRecapStatus; recap: RecapView | null };
  }[];
}

export interface ScheduleInput {
  startAt: string;
  endAt: string;
  location?: string;
  meetingLink?: string;
  note?: string;
  /** Bắt buộc khi admin ghi đè */
  reason?: string;
}

export interface ScheduleLogView {
  _id: string;
  sessionId: string;
  sessionCode: string | null;
  action: 'CREATE' | 'UPDATE' | 'ADMIN_OVERRIDE' | 'CANCEL';
  oldStartAt: string | null;
  oldEndAt: string | null;
  newStartAt: string | null;
  newEndAt: string | null;
  reason: string | null;
  createdAt: string;
  actor: { _id: string; username: string; fullname: string | null } | null;
}

export interface ScheduleImportResult {
  valid: boolean;
  applied: boolean;
  errors: { row: number; message: string }[];
  changes: { row: number; sessionCode: string; mentor: string; mentee: string; oldStartAt: string | null; startAt: string; endAt: string; reason: string }[];
}

export const mentoringApi = {
  // admin
  ensureQuarter: (code: string) => apiJson<QuarterView>('/mentoring/quarters/ensure', { method: 'POST', json: { code } }),
  board: (code: string) => apiJson<QuarterBoard>(`/mentoring/quarters/${encodeURIComponent(code)}/board`),
  setLock: (code: string, isLocked: boolean) =>
    apiJson<QuarterView>(`/mentoring/quarters/${encodeURIComponent(code)}/lock`, { method: 'PUT', json: { isLocked } }),
  createPair: (code: string, body: { mentorCode: string; menteeCode: string; month: number }) =>
    apiJson<{ syncedMonths: number[] }>(`/mentoring/quarters/${encodeURIComponent(code)}/pairs`, { method: 'POST', json: body }),
  importPairs: (code: string, file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiJson<{ pairsRead: number; createdPairs: number; updatedPairs: number; failed: number; errors: { row: number; message: string }[] }>(
      `/mentoring/quarters/${encodeURIComponent(code)}/import`,
      { method: 'POST', body: form }
    );
  },
  updatePair: (sessionId: string, body: { mentorCode: string; menteeCode: string }) =>
    apiJson<{ changed: boolean; movedSessions: number }>(`/mentoring/sessions/${sessionId}/pair`, { method: 'PUT', json: body }),
  deleteFrom: (sessionId: string) =>
    apiJson<{ deletedMonths: number[]; deleted: Record<string, number>; voidedPointEntries: number }>(`/mentoring/sessions/${sessionId}`, { method: 'DELETE' }),
  overrideSchedule: (sessionId: string, body: ScheduleInput) =>
    apiJson<SessionView>(`/mentoring/sessions/${sessionId}/schedule/override`, { method: 'PUT', json: body }),
  reviewRecap: (recapId: string, status: 'APPROVED' | 'REJECTED', note?: string) =>
    apiJson<SessionView>(`/mentoring/recaps/${recapId}/review`, { method: 'PUT', json: { status, note } }),
  members: (type: 'MENTOR' | 'MENTEE', includeInactive = true) =>
    apiJson<MemberView[]>(`/mentoring/members?type=${type}&includeInactive=${includeInactive}`),
  reports: () => apiJson<QuarterReport[]>('/mentoring/reports/quarters'),
  exportReport: (report: QuarterReport) =>
    downloadFile(
      `/mentoring/reports/quarters/${report.quarter.code}/export.xlsx`,
      `hlc-mentoring-Q${report.quarter.quarter}-${report.quarter.year}.xlsx`
    ),
  scheduleLogs: (params: { quarter?: string; sessionId?: string; onlyOverride?: boolean }) =>
    apiJson<ScheduleLogView[]>(`/mentoring/schedule-logs?${new URLSearchParams(Object.entries(params).filter(([, value]) => value !== undefined && value !== '').map(([key, value]) => [key, String(value)])).toString()}`),
  exportSchedules: (code: string) => downloadFile(`/mentoring/quarters/${encodeURIComponent(code)}/schedules/export.xlsx`, `hlc-lich-mentoring-${code}.xlsx`),
  importSchedules: (code: string, file: File, dryRun: boolean) => {
    const form = new FormData();
    form.append('file', file);
    return apiJson<ScheduleImportResult>(`/mentoring/quarters/${encodeURIComponent(code)}/schedules/import?dryRun=${dryRun}`, { method: 'POST', body: form });
  },
  // mentor / mentee
  mine: () => apiJson<MyMentoring>('/mentoring/me'),
  myReport: () => apiJson<MyQuarterReport[]>('/mentoring/me/report'),
  mentors: () => apiJson<MemberView[]>('/mentoring/mentors'),
  savePreference: (body: { quarterCode: string; mentorCodes: string[]; message?: string }) =>
    apiJson('/mentoring/me/preference', { method: 'PUT', json: body }),
  submitSchedule: (sessionId: string, body: ScheduleInput) =>
    apiJson<SessionView>(`/mentoring/sessions/${sessionId}/schedule`, { method: 'PUT', json: body }),
  submitRecap: (sessionId: string, body: { content: string; fileIds: string[] }) =>
    apiJson<SessionView>(`/mentoring/sessions/${sessionId}/recap`, { method: 'PUT', json: body })
};

export const memberApi = {
  importFile: (file: File) => {
    const form = new FormData();
    form.append('file', file);
    return apiJson<{ created: number; updated: number; failed: number; errors: { sheet: string; row: number; message: string }[] }>(
      '/member/import-file',
      { method: 'POST', body: form }
    );
  },
  generateAccounts: (defaultPassword?: string) =>
    apiJson<{ created: { memberCode: string; username: string }[]; linked: { memberCode: string }[]; skipped: { memberCode: string; reason: string }[] }>(
      '/member/accounts/generate',
      { method: 'POST', json: defaultPassword ? { defaultPassword } : {} }
    )
};

/** Upload 1 file lên backend (POST /file) */
export async function uploadFile(file: File) {
  const form = new FormData();
  form.append('file', file);
  form.append('scope', 'Public');
  return apiJson<{ file: { _id: string; name: string; mimetype: string }; url: string }>('/file', { method: 'POST', body: form });
}

// ---------- Hiển thị trạng thái ----------

export const ROLE_STATUS_LABEL: Record<RoleRecapStatus, string> = {
  NO_SCHEDULE: 'Chưa có lịch',
  PENDING: 'Chờ',
  SUBMITTED: 'Đã nộp',
  LATE: 'Nộp muộn',
  MISSING: 'Chưa xong'
};
export const ROLE_STATUS_COLOR: Record<RoleRecapStatus, string> = {
  NO_SCHEDULE: 'default',
  PENDING: 'gold',
  SUBMITTED: 'green',
  LATE: 'orange',
  MISSING: 'red'
};
export const PAIR_STATUS_LABEL: Record<PairRecapStatus, string> = {
  CANCELLED: 'Đã hủy',
  NO_SCHEDULE: 'Chưa có lịch',
  PENDING: 'Chờ',
  DONE: 'Đã xong',
  LATE: 'Nộp muộn',
  MISSING: 'Chưa xong'
};
export const PAIR_STATUS_COLOR: Record<PairRecapStatus, string> = {
  CANCELLED: 'default',
  NO_SCHEDULE: 'default',
  PENDING: 'gold',
  DONE: 'green',
  LATE: 'orange',
  MISSING: 'red'
};
export const REVIEW_STATUS_LABEL: Record<ReviewStatus, string> = {
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối'
};

const dateTimeFormat = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

/** dd/MM/yyyy HH:mm theo giờ Việt Nam */
export function formatDateTime(value?: string | null) {
  if (!value) return '—';
  const parts = Object.fromEntries(dateTimeFormat.formatToParts(new Date(value)).map((part) => [part.type, part.value]));
  return `${parts.day}/${parts.month}/${parts.year} ${parts.hour}:${parts.minute}`;
}

/** Giá trị cho <input type="datetime-local"> theo giờ máy người dùng */
export function toDateTimeLocal(value?: string | Date | null) {
  if (!value) return '';
  const date = new Date(value);
  const pad = (number: number) => String(number).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** datetime-local -> ISO (kèm múi giờ của máy) */
export const fromDateTimeLocal = (value: string) => new Date(value).toISOString();

export { apiFetch };
