import { apiJson, downloadFile } from '@/lib/api';
import type { PairRecapStatus, RoleRecapStatus } from '@/services/mentoringApi';

// ---------- Chung ----------

export interface MemberBrief {
  _id: string;
  memberCode: string;
  fullName: string;
  memberType?: 'MENTOR' | 'MENTEE';
}

export interface FileView {
  _id: string;
  fileId: string;
  url: string;
  fileName: string;
  mimeType: string;
  fieldKey?: string;
}

export type PeriodStatus = 'OPEN' | 'CALCULATING' | 'REVIEWING' | 'LOCKED' | 'EXPORTED' | 'PAID';

export interface PeriodView {
  _id: string;
  code: string;
  year: number;
  month: number;
  startDate: string;
  endDate: string;
  status: PeriodStatus;
  pointRate: number;
  baseAllowance: number;
  payoutDate: string | null;
  lockedAt: string | null;
  isLocked: boolean;
}

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  OPEN: 'Đang mở',
  CALCULATING: 'Đang tính',
  REVIEWING: 'Đang rà soát',
  LOCKED: 'Đã chốt',
  EXPORTED: 'Đã xuất file',
  PAID: 'Đã chi trả'
};
export const PERIOD_STATUS_COLOR: Record<PeriodStatus, string> = {
  OPEN: 'blue',
  CALCULATING: 'processing',
  REVIEWING: 'gold',
  LOCKED: 'purple',
  EXPORTED: 'cyan',
  PAID: 'green'
};

const q = (params: Record<string, string | undefined | null>) => {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => { if (value) search.set(key, value); });
  const text = search.toString();
  return text ? `?${text}` : '';
};

export const money = (value?: number | string | null) => `${Math.round(Number(value ?? 0)).toLocaleString('vi-VN')}đ`;
export const points = (value?: number | string | null) => {
  const number = Number(value ?? 0);
  return Number.isInteger(number) ? String(number) : number.toFixed(2);
};
/** dd/MM/yyyy từ YYYY-MM-DD */
export const formatDate = (value?: string | null) => (value ? value.slice(0, 10).split('-').reverse().join('/') : '—');
export const periodLabel = (code?: string | null) => (code ? `Tháng ${code.slice(5, 7)}/${code.slice(0, 4)}` : '—');

// ---------- Điểm phụ cấp ----------

export interface PointTypeBrief { _id: string; code: string; name: string; category: string }

export interface SummaryRow {
  _id: string;
  memberId: string;
  pointsByType: Record<string, number>;
  totalPoints: number;
  pointRate: number;
  baseAllowance: number;
  amount: number;
  status: 'DRAFT' | 'LOCKED' | 'PAID';
  calculatedAt: string;
  member?: MemberBrief & { bankAccount?: string | null; bankName?: string | null; status?: string };
}

export interface PeriodSummary {
  period: PeriodView;
  pointTypes: PointTypeBrief[];
  rows: SummaryRow[];
  totals: { members: number; points: number; amount: number; pendingAdjustments: number };
}

export interface PointEntryView {
  _id: string;
  points: number;
  sourceType: string;
  sourceId: string;
  description: string | null;
  status: 'ACTIVE' | 'VOID';
  voidReason: string | null;
  createdAt: string;
  pointType: { code: string; name: string } | null;
  isManual: boolean;
}

export interface AdjustmentView {
  _id: string;
  periodId: string;
  memberId: string;
  kind: 'MANUAL' | 'APPEAL';
  points: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  member?: MemberBrief;
  pointType: { code: string; name: string } | null;
}

export interface MemberBreakdown {
  period: PeriodView;
  member: MemberBrief;
  summary: SummaryRow | null;
  entries: PointEntryView[];
  adjustments: AdjustmentView[];
}

export interface MyPoints extends MemberBreakdown {
  history: { periodCode: string; totalPoints: number; amount: number; status: string }[];
}

export interface RecalcResult {
  created: number;
  reactivated: number;
  updated: number;
  voided: number;
  unchanged: number;
  members: number;
  awards: { rank: number; sessionCode: string }[];
}

export interface PeriodExportView { _id: string; exportType: string; exportedAt: string; note: string | null; checksum: string | null }

const period = (code: string) => `/points/periods/${encodeURIComponent(code)}`;

export const pointApi = {
  periods: () => apiJson<PeriodView[]>('/points/periods'),
  ensure: (code: string) => apiJson<PeriodView>(`${period(code)}/ensure`, { method: 'POST' }),
  settings: (code: string, body: { pointRate?: number; baseAllowance?: number; payoutDate?: string }) =>
    apiJson<PeriodView>(`${period(code)}/settings`, { method: 'PUT', json: body }),
  recalculate: (code: string) => apiJson<RecalcResult>(`${period(code)}/recalculate`, { method: 'POST' }),
  lock: (code: string) => apiJson<PeriodView>(`${period(code)}/lock`, { method: 'POST' }),
  unlock: (code: string) => apiJson<PeriodView>(`${period(code)}/unlock`, { method: 'POST' }),
  paid: (code: string) => apiJson<PeriodView>(`${period(code)}/paid`, { method: 'POST' }),
  summary: (code: string) => apiJson<PeriodSummary>(`${period(code)}/summary`),
  breakdown: (code: string, memberId: string) => apiJson<MemberBreakdown>(`${period(code)}/members/${memberId}`),
  adjustments: (code: string, status?: string) => apiJson<AdjustmentView[]>(`${period(code)}/adjustments${q({ status })}`),
  createAdjustment: (code: string, body: { memberId: string; points: number; reason: string; pointTypeId?: string }) =>
    apiJson<AdjustmentView>(`${period(code)}/adjustments`, { method: 'POST', json: body }),
  reviewAdjustment: (id: string, body: { status: 'APPROVED' | 'REJECTED'; note?: string; points?: number }) =>
    apiJson<AdjustmentView>(`/points/adjustments/${id}/review`, { method: 'PUT', json: body }),
  cancelAdjustment: (id: string) => apiJson(`/points/adjustments/${id}`, { method: 'DELETE' }),
  exports: (code: string) => apiJson<PeriodExportView[]>(`${period(code)}/exports`),
  exportFile: (code: string, format: 'xlsx' | 'csv') => downloadFile(`${period(code)}/export.${format}`, `hlc-phu-cap-${code}.${format}`),
  mine: (code?: string) => apiJson<MyPoints>(`/points/me${q({ period: code })}`),
  appeal: (code: string, body: { points: number; reason: string; relatedEntryId?: string }) =>
    apiJson<AdjustmentView>(`/points/me/periods/${encodeURIComponent(code)}/appeals`, { method: 'POST', json: body })
};

// ---------- CRUD dùng chung (danh mục) ----------

export function crudApi<T>(resource: string) {
  return {
    many: (condition?: Record<string, unknown>, sort?: Record<string, 1 | -1>) =>
      apiJson<T[]>(`/${resource}/many${q({ condition: condition ? JSON.stringify(condition) : undefined, sort: sort ? JSON.stringify(sort) : undefined })}`),
    create: (body: Partial<T>) => apiJson<T>(`/${resource}`, { method: 'POST', json: body }),
    update: (id: string, body: Partial<T>) => apiJson<T>(`/${resource}/${id}`, { method: 'PUT', json: body }),
    remove: (id: string) => apiJson<T>(`/${resource}/${id}`, { method: 'DELETE' })
  };
}

export interface PointType {
  _id: string;
  code: string;
  name: string;
  category: string;
  description?: string | null;
  isAllowance: boolean;
  sortOrder: number;
  isActive: boolean;
}

export interface PointRule {
  _id: string;
  code: string;
  name: string;
  pointTypeId: string;
  ruleKind: string;
  sourceType: string;
  targetMemberType: 'MENTEE' | 'MENTOR' | 'ALL';
  conditions: Record<string, unknown>;
  points: number;
  exclusiveGroup: string | null;
  priority: number;
  maxPointsPerPeriod: number | null;
  effectiveFrom: string | null;
  effectiveTo: string | null;
  isActive: boolean;
}

export interface Department { _id: string; code: string; name: string; type: string; parentId: string | null; isActive: boolean }
export interface Position { _id: string; code: string; name: string; sortOrder: number; isActive: boolean }
export interface MemberPosition { _id: string; memberId: string; departmentId: string; positionId: string; startDate: string; endDate: string | null; note: string | null }
export interface Member {
  _id: string;
  userId: string | null;
  memberCode: string;
  memberType: 'MENTOR' | 'MENTEE';
  fullName: string;
  dateOfBirth: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  profileUrl: string | null;
  bankAccount: string | null;
  bankName: string | null;
  joinedAt: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  note: string | null;
}

export const pointTypeApi = crudApi<PointType>('point-type');
export const pointRuleApi = crudApi<PointRule>('point-rule');
export const departmentApi = crudApi<Department>('department');
export const positionApi = crudApi<Position>('position');
export const memberPositionApi = crudApi<MemberPosition>('member-position');
export const memberCrudApi = crudApi<Member>('member');

export const POINT_CATEGORY_LABEL: Record<string, string> = {
  MENTORING: 'Mentoring',
  POSITION: 'Chức vụ',
  LEARNING: 'Học tập',
  FUND: 'HLC Fund',
  BONUS: 'Cộng thêm',
  PENALTY: 'Trừ điểm',
  OTHER: 'Khác'
};
export const SOURCE_TYPE_LABEL: Record<string, string> = {
  MENTORING_RECAP: 'Recap mentoring',
  MENTORING_AWARD: 'Giải cặp mentoring',
  MEMBER_POSITION: 'Chức vụ',
  SUBMISSION: 'Bài nộp học tập',
  FUND_MONTHLY: 'Đóng quỹ tháng',
  POINT_ADJUSTMENT: 'Điều chỉnh tay'
};

// ---------- HLC Fund ----------

export type FundStatus = 'PENDING' | 'DONE' | 'NOT_DONE';
export const FUND_STATUS_LABEL: Record<FundStatus, string> = { PENDING: 'Chờ duyệt', DONE: 'Đã duyệt', NOT_DONE: 'Không hợp lệ' };
export const FUND_STATUS_COLOR: Record<FundStatus, string> = { PENDING: 'gold', DONE: 'green', NOT_DONE: 'red' };

export interface ContributionView {
  _id: string;
  memberId: string;
  periodId: string;
  contributionDate: string;
  amount: number;
  note: string | null;
  submittedAt: string;
  status: FundStatus;
  reviewedAt: string | null;
  reviewNote: string | null;
  files: FileView[];
  member?: MemberBrief;
}

export interface MyFund {
  period: PeriodView;
  target: { minApprovedAmount: number; points: number };
  approvedAmount: number;
  pendingAmount: number;
  reached: boolean;
  isEligible: boolean;
  contributions: ContributionView[];
}

export interface FundStats {
  period: PeriodView;
  target: { minApprovedAmount: number; points: number };
  totals: { contributions: number; pending: number; approvedAmount: number; mentees: number; reached: number; notContributed: number };
  byDate: { date: string; total: number; pending: number; done: number; notDone: number; amount: number }[];
  members: { member: MemberBrief; approved: number; pending: number; rejected: number; count: number; reached: boolean }[];
}

export interface ContributionInput { contributionDate: string; amount: number; note?: string; fileIds: string[] }

export const fundApi = {
  mine: (code?: string) => apiJson<MyFund>(`/fund/me${q({ period: code })}`),
  submit: (body: ContributionInput) => apiJson<ContributionView>('/fund/me/contributions', { method: 'POST', json: body }),
  update: (id: string, body: ContributionInput) => apiJson<ContributionView>(`/fund/me/contributions/${id}`, { method: 'PUT', json: body }),
  remove: (id: string) => apiJson(`/fund/me/contributions/${id}`, { method: 'DELETE' }),
  list: (params: { period?: string; date?: string; status?: string; memberId?: string }) => apiJson<ContributionView[]>(`/fund/contributions${q(params)}`),
  review: (id: string, status: 'DONE' | 'NOT_DONE', note?: string) =>
    apiJson<{ updated: number }>(`/fund/contributions/${id}/review`, { method: 'PUT', json: { status, note } }),
  bulkReview: (ids: string[], status: 'DONE' | 'NOT_DONE', note?: string) =>
    apiJson<{ updated: number }>('/fund/contributions/review', { method: 'PUT', json: { ids, status, note } }),
  stats: (code: string) => apiJson<FundStats>(`/fund/stats/${encodeURIComponent(code)}`)
};

// ---------- Học tập ----------

export type CycleType = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'ONCE';
export type FieldType = 'TEXT' | 'LONG_TEXT' | 'URL' | 'YOUTUBE_URL' | 'IMAGE' | 'FILE' | 'SELECT' | 'MULTI_SELECT' | 'NUMBER' | 'DATE' | 'LIBRARY_ITEM';
export type SubmissionReview = 'NOT_REQUIRED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export const CYCLE_LABEL: Record<CycleType, string> = { DAILY: 'Hằng ngày', WEEKLY: 'Hằng tuần', MONTHLY: 'Hằng tháng', ONCE: 'Một lần' };
export const FIELD_TYPE_LABEL: Record<FieldType, string> = {
  TEXT: 'Chữ ngắn',
  LONG_TEXT: 'Đoạn văn',
  URL: 'Đường link',
  YOUTUBE_URL: 'Link YouTube',
  IMAGE: 'Ảnh',
  FILE: 'File',
  SELECT: 'Chọn 1',
  MULTI_SELECT: 'Chọn nhiều',
  NUMBER: 'Số',
  DATE: 'Ngày',
  LIBRARY_ITEM: 'Sách/tài liệu trong thư viện'
};
export const SUBMISSION_STATUS_LABEL: Record<SubmissionReview, string> = {
  NOT_REQUIRED: 'Đã ghi nhận',
  PENDING: 'Chờ duyệt',
  APPROVED: 'Đã duyệt',
  REJECTED: 'Bị từ chối'
};
export const SUBMISSION_STATUS_COLOR: Record<SubmissionReview, string> = { NOT_REQUIRED: 'blue', PENDING: 'gold', APPROVED: 'green', REJECTED: 'red' };

export interface ModuleField {
  _id: string;
  key: string;
  label: string;
  fieldType: FieldType;
  isRequired: boolean;
  isUnique: boolean;
  options: string[] | null;
  validation: Record<string, number> | null;
}

export interface ModuleCriterion { _id: string; name: string; description: string | null; maxScore: number; weight: number }

export interface LearningModule {
  _id: string;
  code: string;
  name: string;
  description: string | null;
  departmentId: string | null;
  targetMemberType: 'MENTEE' | 'MENTOR' | 'ALL';
  cycleType: CycleType;
  minSubmissionsPerCycle: number;
  maxSubmissionsPerCycle: number | null;
  libraryType: 'BOOK' | 'DOCUMENT' | null;
  requireReview: boolean;
  enableScoring: boolean;
  maxScore: number;
  isActive: boolean;
  sortOrder: number;
  fields: ModuleField[];
  criteria: ModuleCriterion[];
  pendingReviews?: number;
}

export interface SubmissionView {
  _id: string;
  moduleId: string;
  memberId: string;
  periodId: string;
  cycleKey: string;
  data: Record<string, unknown>;
  submittedAt: string;
  reviewStatus: SubmissionReview;
  reviewedAt: string | null;
  feedback: string | null;
  totalScore: number | null;
  files: FileView[];
  scores: { criterionId: string; score: number; comment: string | null }[];
  libraryItem: { _id: string; title: string; author: string | null } | null;
  member?: MemberBrief;
}

export interface MyLearningModule extends LearningModule {
  currentCycle: { cycleKey: string; submitted: number; min: number; max: number | null; canSubmit: boolean };
  submissions: SubmissionView[];
}

export interface LibraryItem {
  _id: string;
  libraryType: 'BOOK' | 'DOCUMENT';
  title: string;
  author: string | null;
  category: string | null;
  description: string | null;
  coverUrl: string | null;
  fileUrl: string | null;
  externalUrl: string | null;
  isActive: boolean;
}

export interface ModuleConfigInput {
  name: string;
  description?: string;
  departmentId?: string;
  targetMemberType?: 'MENTEE' | 'MENTOR' | 'ALL';
  cycleType: CycleType;
  minSubmissionsPerCycle?: number;
  maxSubmissionsPerCycle?: number | null;
  libraryType?: 'BOOK' | 'DOCUMENT' | null;
  requireReview?: boolean;
  enableScoring?: boolean;
  maxScore?: number;
  isActive?: boolean;
  fields: Partial<ModuleField>[];
  criteria?: Partial<ModuleCriterion>[];
}

export interface ModuleProgress {
  cycleKey: string;
  min: number;
  max: number | null;
  totals: { members: number; reached: number };
  members: { member: MemberBrief; submitted: number; approved: number; reached: boolean }[];
}

export const learningApi = {
  mine: () => apiJson<{ member: MemberBrief; modules: MyLearningModule[] }>('/learning/me'),
  submit: (moduleId: string, data: Record<string, unknown>, submissionId?: string) =>
    apiJson<SubmissionView>(
      submissionId ? `/learning/modules/${moduleId}/submissions/${submissionId}` : `/learning/modules/${moduleId}/submissions`,
      { method: submissionId ? 'PUT' : 'POST', json: { data } }
    ),
  removeSubmission: (id: string) => apiJson(`/learning/submissions/${id}`, { method: 'DELETE' }),
  library: (type?: string) => apiJson<LibraryItem[]>(`/learning/library${q({ type })}`),
  libraryAll: (type?: string) => apiJson<LibraryItem[]>(`/learning/library/all${q({ type })}`),
  saveLibraryItem: (body: Partial<LibraryItem>, id?: string) =>
    apiJson<LibraryItem>(id ? `/learning/library/${id}` : '/learning/library', { method: id ? 'PUT' : 'POST', json: body }),
  removeLibraryItem: (id: string) => apiJson<{ deleted: boolean; deactivated: boolean }>(`/learning/library/${id}`, { method: 'DELETE' }),
  modules: () => apiJson<LearningModule[]>('/learning/modules'),
  createModule: (body: ModuleConfigInput) => apiJson<LearningModule>('/learning/modules', { method: 'POST', json: body }),
  updateModule: (id: string, body: ModuleConfigInput) => apiJson<LearningModule>(`/learning/modules/${id}`, { method: 'PUT', json: body }),
  submissions: (moduleId: string, params: { status?: string; cycleKey?: string; period?: string }) =>
    apiJson<SubmissionView[]>(`/learning/modules/${moduleId}/submissions${q(params)}`),
  progress: (moduleId: string, cycleKey?: string) => apiJson<ModuleProgress>(`/learning/modules/${moduleId}/progress${q({ cycleKey })}`),
  review: (id: string, body: { status: 'APPROVED' | 'REJECTED'; feedback?: string; scores?: { criterionId: string; score: number }[]; totalScore?: number }) =>
    apiJson<SubmissionView>(`/learning/submissions/${id}/review`, { method: 'PUT', json: body })
};

// ---------- Quyền ----------

export type AdminScope = 'FUND' | 'MENTORING' | 'POINT' | 'LEARNING_MODULE';
export const SCOPE_LABEL: Record<AdminScope, string> = {
  FUND: 'Duyệt HLC Fund',
  MENTORING: 'Quản lý mentoring',
  POINT: 'Điểm phụ cấp',
  LEARNING_MODULE: 'Quản lý module học tập'
};

export interface MyAccess { systemRole: string; isSuperAdmin: boolean; scopes: AdminScope[]; moduleIds: string[] }
export interface PermissionView {
  _id: string;
  userId: string;
  scope: AdminScope;
  moduleId: string | null;
  note: string | null;
  createdAt: string;
  user: { _id: string; username: string; fullname: string | null; systemRole: string } | null;
  member: MemberBrief | null;
  module: { _id: string; code: string; name: string } | null;
}

export const accessApi = {
  mine: () => apiJson<MyAccess>('/access/me'),
  list: () => apiJson<PermissionView[]>('/access/permissions'),
  grant: (body: { account: string; scope: AdminScope; moduleId?: string; note?: string }) =>
    apiJson<PermissionView>('/access/permissions', { method: 'POST', json: body }),
  revoke: (id: string) => apiJson(`/access/permissions/${id}`, { method: 'DELETE' })
};

// ---------- Dashboard ----------

export interface DashboardPair {
  sessionId: string;
  code: string;
  status: PairRecapStatus;
  scheduledStartAt: string | null;
  mentor?: MemberBrief;
  mentee?: MemberBrief;
  rank?: number;
}

export interface AdminDashboard {
  period: PeriodView;
  members: { total: number; mentees: number; mentors: number };
  mentoring: { sessions: number; statusCount: Partial<Record<PairRecapStatus, number>>; doneRate: number; bestPairs: DashboardPair[]; inactivePairs: DashboardPair[] };
  learning: { module: { _id: string; code: string; name: string; cycleType: CycleType }; submissions: number; approved: number; pending: number; rejected: number; submitters: number; averageScore: number | null }[];
  fund: { totals: FundStats['totals']; target: FundStats['target']; byDate: FundStats['byDate'] };
  points: {
    totals: PeriodSummary['totals'];
    topMembers: { member: MemberBrief; totalPoints: number; amount: number }[];
    needImprovement: { member: MemberBrief; totalPoints: number; amount: number }[];
  };
  trend: { period: string; totalPoints: number; totalAmount: number; fundAmount: number; submissions: number; mentoringSessions: number; mentoringDone: number }[];
}

export interface MyDashboard {
  period: PeriodView;
  member: MemberBrief;
  mentoring: { sessionId: string; code: string; scheduledStartAt: string | null; recapDeadlineAt: string | null; status: PairRecapStatus; myStatus: RoleRecapStatus; partner?: MemberBrief; awardRank: number | null }[];
  points: { totalPoints: number; amount: number; entries: PointEntryView[]; history: MyPoints['history'] };
  fund: { target: MyFund['target']; approvedAmount: number; pendingAmount: number; reached: boolean; isEligible: boolean };
  learning: { module: { _id: string; code: string; name: string; cycleType: CycleType }; currentCycle: MyLearningModule['currentCycle']; pending: number; lastScore: number | null }[];
}

export const dashboardApi = {
  admin: (code?: string) => apiJson<AdminDashboard>(`/dashboard/admin${q({ period: code })}`),
  mine: (code?: string) => apiJson<MyDashboard>(`/dashboard/me${q({ period: code })}`)
};
