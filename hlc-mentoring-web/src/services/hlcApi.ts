import { apiJson, downloadFile } from '@/lib/api';
import type { PairRecapStatus, RoleRecapStatus } from '@/services/mentoringApi';

// ---------- Chung ----------

export interface MemberBrief {
  _id: string;
  memberCode: string;
  fullName: string;
  /** EXTERNAL = thầy cô ngoài danh sách MTO */
  memberType?: 'MENTOR' | 'MENTEE' | 'EXTERNAL';
  organization?: string | null;
  /** Số điện thoại (bấm mở Zalo). null + phoneHidden: chủ số đã ẩn hoặc người xem không có quyền xem số thầy cô */
  phone?: string | null;
  phoneHidden?: boolean;
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
  /** Ngày chi thực tế (Xác nhận đã chi) */
  paidDate?: string | null;
  /** Mã bảng tổng hợp: PC-YYYY-MM */
  sheetCode?: string;
}

export interface PeriodLog { _id: string; action: string; field: string | null; oldValue: string | null; newValue: string | null; reason: string | null; changedByName: string; createdAt: string }
export const PERIOD_LOG_LABEL: Record<string, string> = { SETTINGS: 'Sửa cấu hình', LOCK: 'Chốt kỳ', UNLOCK: 'Mở khóa', PAID: 'Đã chi', EXPORT: 'Xuất file', CARRY_OVER: 'Bù chênh lệch' };
export const PERIOD_FIELD_LABEL: Record<string, string> = { pointRate: 'Đơn giá/điểm', baseAllowance: 'Phụ cấp cơ bản', payoutDate: 'Ngày chi trả' };

export const PERIOD_STATUS_LABEL: Record<PeriodStatus, string> = {
  OPEN: 'Đang tích lũy',
  CALCULATING: 'Đang tính',
  REVIEWING: 'Đang rà soát',
  LOCKED: 'Đã chốt · đang chờ chi',
  EXPORTED: 'Đã chốt · đang chờ chi',
  PAID: 'Đã chi'
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
  adjustmentAmount?: number;
  status: 'DRAFT' | 'LOCKED' | 'PAID';
  calculatedAt: string;
  member?: MemberBrief & { bankAccount?: string | null; bankName?: string | null; status?: string; position?: string | null; hasBankAccount?: boolean };
}

export interface PeriodSummary {
  /** false = người xem không có quyền xem số tài khoản */
  bankVisible?: boolean;
  /** Khoản chi đã ghi sổ quỹ (null nếu chưa xác nhận đã chi) */
  payout?: PayoutExpense | null;
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
  awards: { rank: number; sessionCode: string; recapScore: number }[];
  /** Recap của cặp "Đã xong" chưa được chấm (tính 0 điểm khi xếp giải) */
  unscoredRecaps: number;
}

export interface PeriodExportView { _id: string; exportType: string; exportedAt: string; note: string | null; checksum: string | null }

const period = (code: string) => `/points/periods/${encodeURIComponent(code)}`;

export const pointApi = {
  periods: () => apiJson<PeriodView[]>('/points/periods'),
  ensure: (code: string) => apiJson<PeriodView>(`${period(code)}/ensure`, { method: 'POST' }),
  settings: (code: string, body: { pointRate?: number; baseAllowance?: number; payoutDate?: string | null; reason?: string }) =>
    apiJson<PeriodView>(`${period(code)}/settings`, { method: 'PUT', json: body }),
  recalculate: (code: string) => apiJson<RecalcResult>(`${period(code)}/recalculate`, { method: 'POST' }),
  lock: (code: string) => apiJson<PeriodView>(`${period(code)}/lock`, { method: 'POST' }),
  unlock: (code: string, reason: string) => apiJson<PeriodView>(`${period(code)}/unlock`, { method: 'POST', json: { reason } }),
  logs: (code: string) => apiJson<PeriodLog[]>(`${period(code)}/logs`),
  carryOver: (code: string, body: { memberId: string; amount?: number; points?: number; reason: string }) =>
    apiJson<{ targetSheet: string }>(`${period(code)}/carry-over`, { method: 'POST', json: body }),
  /** Xác nhận đã chi: ghi ngày chi thực tế và sinh 1 khoản chi trong sổ quỹ */
  paid: (code: string, paidDate?: string) =>
    apiJson<PeriodView & { expense: PayoutExpense | null; created: boolean; difference: number }>(`${period(code)}/paid`, { method: 'POST', json: { paidDate } }),
  summary: (code: string) => apiJson<PeriodSummary>(`${period(code)}/summary`),
  breakdown: (code: string, memberId: string) => apiJson<MemberBreakdown>(`${period(code)}/members/${memberId}`),
  adjustments: (code: string, status?: string) => apiJson<AdjustmentView[]>(`${period(code)}/adjustments${q({ status })}`),
  createAdjustment: (code: string, body: { memberId: string; points: number; reason: string; pointTypeId?: string }) =>
    apiJson<AdjustmentView>(`${period(code)}/adjustments`, { method: 'POST', json: body }),
  reviewAdjustment: (id: string, body: { status: 'APPROVED' | 'REJECTED'; note?: string; points?: number }) =>
    apiJson<AdjustmentView>(`/points/adjustments/${id}/review`, { method: 'PUT', json: body }),
  cancelAdjustment: (id: string) => apiJson(`/points/adjustments/${id}`, { method: 'DELETE' }),
  exports: (code: string) => apiJson<PeriodExportView[]>(`${period(code)}/exports`),
  exportFile: (code: string, format: 'xlsx' | 'csv', locked = true) => downloadFile(`${period(code)}/export.${format}`, `PC-${code}${locked ? '' : '-tam-tinh'}.${format}`),
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
  /** Ẩn số điện thoại (và Zalo) với người ngoài cặp và nhóm; mặc định false */
  hidePhone?: boolean;
  phoneHidden?: boolean;
  email: string | null;
  profileUrl: string | null;
  bankAccount: string | null;
  bankName: string | null;
  address: string | null;
  hometown: string | null;
  /** Số CCCD (đã che trong danh sách) */
  nationalId?: string | null;
  /** Mã tỉnh, thành phố (danh mục 34 tỉnh) */
  hometownCode: string | null;
  addressCode: string | null;
  major: string | null;
  occupation: string | null;
  /** Nhóm ngành nghề (danh mục 38 nhóm, chọn nhiều) */
  majorCodes?: string[] | null;
  occupationCodes?: string[] | null;
  /** Mã ngân hàng trong danh mục */
  bankCode?: string | null;
  joinedAt: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  note: string | null;
}

/** Hồ sơ còn quê quán / địa chỉ cũ chưa quy đổi được về danh mục tỉnh */
export const provinceNeedsReview = (member: Partial<Member>) =>
  (Boolean(member.hometown?.trim()) && !member.hometownCode) || (Boolean(member.address?.trim()) && !member.addressCode);

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
  POINT_ADJUSTMENT: 'Điều chỉnh tay',
  GROUP_COMPLETION: 'Thưởng nhóm hoàn tất'
};

// ---------- HLC Fund ----------

export type FundStatus = 'PENDING' | 'DONE' | 'NOT_DONE';
/**
 * Khoản đóng góp TÌNH NGUYỆN: không dùng "đã xong / chưa xong" và không tô đỏ / cam. Chỉ 2 trạng thái hiển thị:
 * Đã ghi nhận (nền xanh lá) và Đang chờ xác nhận (nền vàng). NOT_DONE (minh chứng chưa hợp lệ, trả lại để bổ sung)
 * hiện chữ trung tính "Chưa ghi nhận" ở chi tiết khoản; ở bảng tổng hợp coi như chưa có khoản (dấu gạch ngang).
 * Hiển thị bằng <FundStatusTag> (luôn có chữ + biểu tượng, không chỉ dựa vào màu).
 */
export const FUND_STATUS_LABEL: Record<FundStatus, string> = { PENDING: 'Đang chờ xác nhận', DONE: 'Đã ghi nhận', NOT_DONE: 'Chưa ghi nhận' };
export const FUND_STATUS_COLOR: Record<FundStatus, string> = { PENDING: 'gold', DONE: 'green', NOT_DONE: 'default' };

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
  contributorId?: string | null;
  cycleType?: FundCycle;
  coverUntil?: string | null;
  isProxy?: boolean;
  proxyByName?: string | null;
  payerKind?: PayerKind;
}

export type FundCycle = 'ONCE' | 'WEEKLY' | 'MONTHLY';
export const FUND_CYCLE_LABEL: Record<FundCycle, string> = { ONCE: 'Một lần', WEEKLY: 'Theo tuần', MONTHLY: 'Theo tháng' };
export type PayerKind = 'MTO' | 'MTE' | 'EXTERNAL';
export const PAYER_KIND_LABEL: Record<PayerKind, string> = { MTO: 'MTO', MTE: 'MTE', EXTERNAL: 'Thầy cô ngoài danh sách' };

export interface FundContributor { _id: string; fullName: string; organization: string | null; contact: string | null; groupId: string | null; note: string | null; isActive: boolean; phone?: string | null; phoneHidden?: boolean }

type IncomeByKind = { total: number; MTO: number; MTE: number; EXTERNAL: number };
type ExpenseByType = { total: number; ALLOWANCE: number; OTHER: number };
export interface PayoutExpense {
  _id: string; expenseDate: string; amount: number; description: string; category: string | null;
  source?: 'MANUAL' | 'ALLOWANCE'; periodId?: string | null; sheetCode?: string | null;
  detail?: { members?: number; carryOverTotal?: number; carryOvers?: { memberCode: string | null; fullName: string | null; amount: number; reason: string }[]; reconfirmations?: { at: string; summaryTotal: number; difference: number }[] } | null;
}
export interface FundLedger {
  year: number;
  quarter: number | null;
  month: number | null;
  kind: PayerKind | null;
  groupKind: GroupKind | null;
  totals: { income: number; incomeByKind: IncomeByKind; expense: number; expenseByType: ExpenseByType; net: number; balance: number };
  byMonth: { month: number; code: string; income: IncomeByKind; expense: number; expenseByType: ExpenseByType; net: number }[];
  byQuarter: { quarter: number; income: number; expense: number; expenseAllowance: number; net: number }[];
  /** Đối chiếu theo kỳ phụ cấp: bảng tổng hợp và khoản chi đã ghi sổ */
  allowancePeriods: { periodCode: string; sheetCode: string; status: PeriodStatus; summaryAmount: number; paidDate: string | null; recordedAmount: number | null; expenseDate: string | null; carryOverTotal: number; difference: number | null }[];
  expenses: PayoutExpense[];
}

export interface MyFund {
  period: PeriodView;
  target: { minApprovedAmount: number; points: number };
  approvedAmount: number;
  pendingAmount: number;
  reached: boolean;
  isEligible: boolean;
  weeks: { weekKey: string; from: string; to: string; status: WeekStatus; amount: number }[];
  groupId: string | null;
  contributions: ContributionView[];
}

export type WeekStatus = 'NONE' | FundStatus;
/** Ô tuần ở bảng tổng hợp: chưa có khoản (kể cả khoản chưa hợp lệ) để trống bằng dấu gạch ngang trung tính */
export const WEEK_STATUS_LABEL: Record<WeekStatus, string> = { NONE: '—', PENDING: 'Đang chờ xác nhận', DONE: 'Đã ghi nhận', NOT_DONE: '—' };
export const WEEK_STATUS_COLOR: Record<WeekStatus, string> = { NONE: 'default', PENDING: 'gold', DONE: 'green', NOT_DONE: 'default' };

export interface FundGroupReport {
  period: PeriodView;
  weeks: { weekKey: string; from: string; to: string }[];
  isAdmin: boolean;
  groups: {
    _id: string;
    code: string;
    name: string;
    groupKind: GroupKind;
    leader: MemberBrief | null;
    deputy: MemberBrief | null;
    canReview: boolean;
    canProxy?: boolean;
    pending: number;
    members: { member: MemberBrief; total: number; paidUntil: string | null; weeks: Record<string, { status: WeekStatus; amount: number; ids: string[] }> }[];
  }[];
  contributions: ContributionView[];
}

export interface FundStats {
  period: PeriodView;
  target: { minApprovedAmount: number; points: number };
  totals: { contributions: number; pending: number; approvedAmount: number; mentees: number; reached: number; notContributed: number };
  byDate: { date: string; total: number; pending: number; done: number; notDone: number; amount: number }[];
  members: { member: MemberBrief; approved: number; pending: number; rejected: number; count: number; reached: boolean }[];
}

export interface ContributionInput { contributionDate: string; amount: number; note?: string; fileIds: string[]; cycleType?: FundCycle; coverUntil?: string; memberId?: string; contributorId?: string }

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
  stats: (code: string) => apiJson<FundStats>(`/fund/stats/${encodeURIComponent(code)}`),
  groupReport: (params: { period?: string; groupId?: string; kind?: GroupKind }) => apiJson<FundGroupReport>(`/fund/groups/report${q(params)}`),
  proxySubmit: (body: ContributionInput) => apiJson<ContributionView>('/fund/groups/contributions', { method: 'POST', json: body }),
  contributors: (groupId?: string) => apiJson<FundContributor[]>(`/fund/contributors${q({ groupId })}`),
  saveContributor: (body: Partial<FundContributor>, id?: string) =>
    apiJson<FundContributor>(id ? `/fund/contributors/${id}` : '/fund/contributors', { method: id ? 'PUT' : 'POST', json: body }),
  ledger: (params: { year?: number; quarter?: number; month?: number; kind?: PayerKind; groupKind?: GroupKind }) =>
    apiJson<FundLedger>(`/fund/ledger${q({ year: params.year ? String(params.year) : undefined, quarter: params.quarter ? String(params.quarter) : undefined, month: params.month ? String(params.month) : undefined, kind: params.kind, groupKind: params.groupKind })}`),
  saveExpense: (body: { expenseDate: string; amount: number; description: string; category?: string }, id?: string) =>
    apiJson(id ? `/fund/expenses/${id}` : '/fund/expenses', { method: id ? 'PUT' : 'POST', json: body }),
  removeExpense: (id: string) => apiJson(`/fund/expenses/${id}`, { method: 'DELETE' }),
  groupReview: (ids: string[], status: 'DONE' | 'NOT_DONE', note?: string) =>
    apiJson<{ updated: number }>('/fund/groups/review', { method: 'PUT', json: { ids, status, note } })
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
  /** ALL = mọi thành viên đúng đối tượng; SELECTED = chỉ người / nhóm được gán */
  audienceMode?: 'ALL' | 'SELECTED';
  /** Module chấm recap mentoring (bài gốc nằm ở mentoring) */
  isRecapModule?: boolean;
  /** Người giữ chức vụ "Admin module <tên>" */
  adminMembers?: ModuleAdminMember[];
}

export interface ModuleAdminMember { _id: string; memberCode: string; fullName: string; memberType: string; startDate: string }

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

export interface LibraryImportResult {
  valid: boolean;
  applied: boolean;
  added: { row: number; title: string; author: string; libraryType: 'BOOK' | 'DOCUMENT'; fileUrl: string | null }[];
  duplicates: { row: number; title: string; message: string }[];
  errors: { row: number; message: string }[];
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
  /** Chỉ khi TẠO module: đối tượng áp dụng (MTE / MTO riêng lẻ hoặc nhóm) */
  audience?: { mode: 'ALL' | 'SELECTED'; memberIds?: string[]; groupIds?: string[] };
  /** Chỉ khi TẠO module: người giữ chức vụ "Admin module <tên>" */
  adminMemberIds?: string[];
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
  exportLibrary: () => downloadFile('/learning/library/export.xlsx', 'hlc-thu-vien.xlsx'),
  importLibrary: (file: File, dryRun: boolean) => {
    const form = new FormData();
    form.append('file', file);
    return apiJson<LibraryImportResult>(`/learning/library/import?dryRun=${dryRun}`, { method: 'POST', body: form });
  },
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
    apiJson<SubmissionView>(`/learning/submissions/${id}/review`, { method: 'PUT', json: body }),
  audience: (moduleId: string) => apiJson<ModuleAudience>(`/learning/modules/${moduleId}/audience`),
  saveAudience: (moduleId: string, body: { mode: 'ALL' | 'SELECTED'; memberIds?: string[]; groupIds?: string[] }) =>
    apiJson<ModuleAudience>(`/learning/modules/${moduleId}/audience`, { method: 'PUT', json: body }),
  moduleAdmins: (moduleId: string) => apiJson<ModuleAdminMember[]>(`/learning/modules/${moduleId}/admins`),
  saveModuleAdmins: (moduleId: string, memberIds: string[]) =>
    apiJson<ModuleAdminMember[]>(`/learning/modules/${moduleId}/admins`, { method: 'PUT', json: { memberIds } })
};

/** Người / nhóm được gán module (mode SELECTED: chỉ những người này thấy và nộp bài) */
export interface ModuleAudience {
  moduleId: string;
  mode: 'ALL' | 'SELECTED';
  members: { _id: string; memberCode: string; fullName: string; memberType: string }[];
  groups: { _id: string; code: string; name: string; groupKind: GroupKind }[];
  audienceCount: number;
}

// ---------- Quyền ----------

export type AdminScope = 'FUND' | 'MENTORING' | 'POINT' | 'LEARNING_MODULE' | 'LEARNING' | 'MENTEE' | 'MENTORING_VIEW';
export const SCOPE_LABEL: Record<AdminScope, string> = {
  FUND: 'Duyệt HLC Fund',
  MENTORING: 'Quản lý mentoring',
  POINT: 'Điểm phụ cấp',
  LEARNING_MODULE: 'Quản lý module học tập',
  LEARNING: 'Trưởng ban học tập (mọi module)',
  MENTEE: 'Trưởng ban MTE (quản lý nhóm MTE; sửa điểm, đổi cặp phải đề xuất)',
  MENTORING_VIEW: 'Xem mentoring (không duyệt, không sửa)'
};

export interface LeaderGroupAccess {
  _id: string; code: string; name: string; role: string; roleName: string; groupKind: GroupKind; permissions: string[]; canReview: boolean;
  /** Quyền chỉ có nhờ ủy quyền: quyền -> người ủy quyền */
  delegatedFrom?: Record<string, { memberId: string; name: string }>;
  source?: 'GROUP' | 'BAN' | 'DELEGATION';
}
export interface MyAccess {
  systemRole: string; isSuperAdmin: boolean; scopes: AdminScope[];
  /** Hành động cấp hệ thống: LOCK_PERIOD, EDIT_POINTS, VIEW_PAYOUT, EXPORT_PERSONAL, VIEW_ACTIVITY_LOG */
  actions: string[];
  /** null = mọi module */
  moduleIds: string[] | null;
  leaderGroups: LeaderGroupAccess[];
  mustChangePassword: boolean;
  /** Mật khẩu vừa được Admin toàn cục ghi đè: phải đổi lại trước khi dùng tiếp */
  passwordWasReset?: boolean;
  /** Phạm vi có quyền GHI (scopes gồm cả phạm vi chỉ xem như POINT của Trưởng ban MTE) */
  writeScopes: AdminScope[];
  profileUrlEditable: boolean;
}
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
  mine: (code?: string) => apiJson<MyDashboard>(`/dashboard/me${q({ period: code })}`),
  learningAverage: (params: { period?: string; quarter?: string; groupId?: string; moduleId?: string; memberType?: string }) =>
    apiJson<LearningAverage>(`/dashboard/learning-average${q(params)}`)
};

// ---------- Dashboard điểm học tập trung bình ----------

export interface AverageMemberRow {
  member: { _id: string; memberCode: string; fullName: string; memberType: 'MENTOR' | 'MENTEE'; phone?: string | null; phoneHidden?: boolean };
  group: { _id: string; name: string } | null;
  average: number | null;
  /** Điểm trung bình từng tháng của khoảng xem (đơn vị gốc: 1 MTE x 1 tháng) */
  months?: Record<string, number | null>;
  learningAverage: number | null;
  recapAverage: number | null;
  scoredItems: number;
}
export interface LearningAverage {
  range: { label: string; mode: 'MONTH' | 'QUARTER'; code: string; months: string[] };
  /** false = chỉ thấy module mình quản lý (Admin module nhỏ) */
  canViewAll: boolean;
  overall: { average: number | null; learningAverage: number | null; recapAverage: number | null; members: number; scoredItems: number };
  byMember: AverageMemberRow[];
  byGroup: { group: { _id: string | null; name: string }; average: number | null; members: number; scoredItems: number }[];
  byModule: { module: { _id: string; code: string; name: string; isRecap: boolean }; average: number | null; members: number; scoredItems: number }[];
  byMonth: { period: string; average: number | null; learningAverage: number | null; recapAverage: number | null; scoredItems: number }[];
  top: AverageMemberRow[];
  needImprovement: AverageMemberRow[];
  filters: { groups: { _id: string; name: string }[]; modules: { _id: string; name: string; isRecap: boolean }[] };
}

// ---------- Đề xuất giữa các chức vụ ----------

export type ProposalType = 'PAIR_CHANGE' | 'POINT_ADJUST' | 'MENTORING_POINT' | 'MENTORING_DATA';
export type ProposalStatus = 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export const PROPOSAL_TYPE_LABEL: Record<ProposalType, string> = {
  PAIR_CHANGE: 'Đổi cặp mentoring',
  POINT_ADJUST: 'Sửa điểm phụ cấp',
  MENTORING_POINT: 'Điểm phụ cấp / thưởng từ mentoring',
  MENTORING_DATA: 'Điều chỉnh dữ liệu mentoring'
};
/** Chức vụ nắm quyền quyết định từng loại đề xuất */
export const PROPOSAL_DECIDER_LABEL: Record<ProposalType, string> = {
  PAIR_CHANGE: 'Trưởng ban Mentoring',
  POINT_ADJUST: 'Trưởng ban HLC Fund',
  MENTORING_POINT: 'Trưởng ban HLC Fund',
  MENTORING_DATA: 'Trưởng ban Mentoring'
};
export const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  PENDING: 'Chờ duyệt', PROCESSING: 'Đang xử lý', APPROVED: 'Đã duyệt', REJECTED: 'Từ chối', CANCELLED: 'Đã rút'
};
export const PROPOSAL_STATUS_COLOR: Record<ProposalStatus, string> = {
  PENDING: 'gold', PROCESSING: 'processing', APPROVED: 'green', REJECTED: 'red', CANCELLED: 'default'
};
export interface ProposalView {
  _id: string;
  type: ProposalType;
  typeLabel: string;
  status: ProposalStatus;
  decider: 'MENTORING' | 'FUND';
  deciderLabel: string;
  title: string;
  reason: string;
  targetType: string | null;
  targetId: string | null;
  payload: Record<string, unknown>;
  proposerName: string;
  proposerRole: string;
  deciderName: string | null;
  decisionNote: string | null;
  decidedAt: string | null;
  resultRef: string | null;
  createdAt: string;
  canDecide: boolean;
  canCancel: boolean;
}
export interface ProposalSummary { canPropose: ProposalType[]; canDecide: ProposalType[]; pendingInbox: number }
export interface ProposalInput {
  type: ProposalType;
  reason: string;
  targetId: string;
  targetType?: string;
  payload?: Record<string, unknown>;
}
export const proposalApi = {
  summary: () => apiJson<ProposalSummary>('/proposals/summary'),
  list: (params: { box?: 'mine' | 'inbox' | 'all'; status?: string; type?: string }) => apiJson<ProposalView[]>(`/proposals${q(params)}`),
  create: (body: ProposalInput) => apiJson<ProposalView>('/proposals', { method: 'POST', json: body }),
  decide: (id: string, body: { status: 'APPROVED' | 'REJECTED'; note?: string }) =>
    apiJson<ProposalView>(`/proposals/${id}/decide`, { method: 'PUT', json: body }),
  cancel: (id: string) => apiJson<ProposalView>(`/proposals/${id}/cancel`, { method: 'PUT' })
};

// ---------- Nhóm & Leader ----------

export interface GroupMember extends MemberBrief { status?: string; phone?: string | null; phoneHidden?: boolean; email?: string | null; joinedGroupAt?: string }
export type GroupKind = 'MENTEE' | 'FUND';
export const GROUP_KIND_LABEL: Record<GroupKind, string> = { MENTEE: 'Nhóm MTE', FUND: 'Nhóm HLC Fund (MTO)' };
export interface GroupView {
  _id: string;
  code: string;
  name: string;
  groupKind: GroupKind;
  isActive: boolean;
  deputyCanReview: boolean;
  leader: GroupMember | null;
  deputy: GroupMember | null;
  members: GroupMember[];
  roles: GroupRoleAssignment[];
  counts: { mentors: number; mentees: number };
}
export interface GroupHistory {
  memberships: { _id: string; memberId: string; startDate: string; endDate: string | null; note: string | null; member: GroupMember | null }[];
  roles: { _id: string; role: string; roleName: string; startDate: string; endDate: string | null; note: string | null; member: GroupMember | null }[];
}

export interface GroupRoleAssignment { assignmentId: string; memberId: string; fullName: string; memberCode: string; positionId: string; roleCode: string; roleName: string; startDate: string; endDate: string | null; isActive: boolean }

export type RoleAppliesTo = 'MENTEE' | 'FUND' | 'BAN';
export const ROLE_PERMISSION_LABEL: Record<string, string> = {
  VIEW_PROGRESS: 'Xem tiến độ nhóm',
  SCORE_RECAP: 'Chấm recap MTE',
  REVIEW_FUND: 'Duyệt minh chứng quỹ',
  PROXY_FUND: 'Nộp hộ minh chứng quỹ',
  LOCK_PERIOD: 'Chốt kỳ phụ cấp',
  CONFIRM_PAYOUT: 'Xác nhận đã chi (ghi sổ quỹ)',
  EDIT_POINTS: 'Sửa đơn giá, cộng / trừ điểm thủ công',
  VIEW_PAYOUT: 'Xem, xuất bảng phụ cấp đã chốt (kế toán)',
  EXPORT_PERSONAL: 'Xuất dữ liệu cá nhân',
  VIEW_ACTIVITY_LOG: 'Xem nhật ký thao tác'
};
/** Quyền theo nhóm (tác động trong nhóm, hoặc mọi nhóm của loại được chọn với vai trò cấp ban) */
export const GROUP_PERMISSIONS = ['VIEW_PROGRESS', 'SCORE_RECAP', 'REVIEW_FUND', 'PROXY_FUND'];
/** Quyền cấp hệ thống (chỉ cho vai trò cấp ban) */
export const GLOBAL_PERMISSIONS = ['LOCK_PERIOD', 'CONFIRM_PAYOUT', 'EDIT_POINTS', 'VIEW_PAYOUT', 'EXPORT_PERSONAL', 'VIEW_ACTIVITY_LOG'];
export const ROLE_APPLIES_LABEL: Record<RoleAppliesTo, string> = { MENTEE: 'Nhóm MTE', FUND: 'Nhóm HLC Fund (MTO & thầy cô)', BAN: 'Chức vụ ban (không gắn nhóm)' };
export const ADMIN_SCOPE_LABEL: Record<string, string> = {
  FUND: 'Trưởng ban HLC Fund: toàn quyền thu chi (duyệt quỹ, sửa đơn giá, chốt kỳ, xác nhận đã chi)',
  MENTORING: 'Trưởng ban Mentoring: toàn quyền mentoring (ghép cặp, lịch, recap, ủy quyền recap)',
  POINT: 'Admin điểm phụ cấp (cấp riêng, cũ)',
  LEARNING: 'Trưởng ban Học tập: toàn bộ module học tập; chỉ xem mentoring',
  MENTEE: 'Trưởng ban MTE: quản lý nhóm MTE; sửa điểm, đổi cặp phải đề xuất',
  LEARNING_MODULE: 'Admin module học tập nhỏ (chỉ một module)'
};
export interface RoleView {
  _id: string;
  code: string;
  name: string;
  appliesTo: RoleAppliesTo;
  permissions: string[];
  allowancePoints: number;
  bonusPoints: number;
  adminScope: string | null;
  description: string | null;
  sortOrder: number;
  isActive: boolean;
  assignmentCount: number;
  /** Vai trò cấp ban: quyền theo nhóm áp dụng cho mọi nhóm của các loại này */
  scopeKinds: GroupKind[];
  activeHolderCount: number;
  isSystem: boolean;
  /** Chức vụ "Admin module <tên>": do màn hình Học tập quản lý */
  isModuleAdmin?: boolean;
  moduleId?: string | null;
}
export const roleApi = {
  list: () => apiJson<RoleView[]>('/roles'),
  save: (body: Partial<RoleView>, id?: string) => apiJson<RoleView>(id ? `/roles/${id}` : '/roles', { method: id ? 'PUT' : 'POST', json: body }),
  thresholds: () => apiJson<Record<GroupKind, number>>('/roles/thresholds/all'),
  saveThresholds: (body: Record<GroupKind, number>) => apiJson<Record<GroupKind, number>>('/roles/thresholds/all', { method: 'PUT', json: body }),
  remove: (id: string) => apiJson<{ mode: 'DELETE' | 'DEACTIVATE' }>(`/roles/${id}`, { method: 'DELETE' })
};

export interface GroupDeletePreview {
  group: { _id: string; code: string; name: string; groupKind: GroupKind };
  members: GroupMember[];
  counts: {
    members: number; contributors: number; membershipHistory: number; roleAssignments: number; activeRoles: number;
    moduleAudiences: number; finalizedPointEntries: number; finalizedContributions: number;
  };
  canDelete: boolean;
  mode: 'HARD' | 'DEACTIVATE';
  targets: { _id: string; code: string; name: string }[];
}

export const groupApi = {
  list: () => apiJson<GroupView[]>('/groups'),
  unassigned: () => apiJson<GroupMember[]>('/groups/unassigned'),
  create: (body: { name: string; deputyCanReview?: boolean; groupKind?: GroupKind }) => apiJson<GroupView>('/groups', { method: 'POST', json: body }),
  update: (id: string, body: { name: string; deputyCanReview?: boolean; isActive?: boolean }) => apiJson<GroupView>(`/groups/${id}`, { method: 'PUT', json: body }),
  setRole: (id: string, role: 'LEADER' | 'DEPUTY', memberId?: string) => apiJson<GroupView>(`/groups/${id}/role`, { method: 'PUT', json: { role, memberId } }),
  addMembers: (id: string, memberIds: string[]) => apiJson<{ moved: number; group: GroupView }>(`/groups/${id}/members`, { method: 'POST', json: { memberIds } }),
  removeMember: (id: string, memberId: string) => apiJson<GroupView>(`/groups/${id}/members/${memberId}`, { method: 'DELETE' }),
  history: (id: string) => apiJson<GroupHistory>(`/groups/${id}/history`),
  assign: (id: string, body: { memberId: string; positionId: string; startDate?: string; endDate?: string; note?: string }) =>
    apiJson<GroupView>(`/groups/${id}/assignments`, { method: 'POST', json: body }),
  endAssignment: (assignmentId: string, endDate?: string, reason?: string) => apiJson(`/groups/assignments/${assignmentId}/end`, { method: 'PUT', json: { endDate, reason } }),
  deletePreview: (id: string) => apiJson<GroupDeletePreview>(`/groups/${id}/delete-preview`),
  transfer: (id: string, body: { targetGroupId: string; memberIds?: string[]; note?: string }) =>
    apiJson<{ moved: number; contributors: number; preview: GroupDeletePreview }>(`/groups/${id}/transfer`, { method: 'POST', json: body }),
  remove: (id: string, reason?: string) => apiJson<{ mode: 'HARD' | 'DEACTIVATE' }>(`/groups/${id}`, { method: 'DELETE', json: { reason } })
};

// ---------- Ủy quyền tạm thời ----------

export interface DelegationView {
  _id: string; groupId: string; fromMemberId: string; toMemberId: string; permissions: string[];
  startDate: string; endDate: string; reason: string | null; revokedAt: string | null; createdAt: string;
  from: { _id: string; memberCode: string; fullName: string } | null;
  to: { _id: string; memberCode: string; fullName: string } | null;
  group: { _id: string; code: string; name: string } | null;
  status: 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'REVOKED';
}
export const DELEGATION_STATUS: Record<DelegationView['status'], { label: string; color: string }> = {
  ACTIVE: { label: 'Đang hiệu lực', color: 'green' },
  UPCOMING: { label: 'Chưa tới ngày', color: 'blue' },
  EXPIRED: { label: 'Đã hết hạn', color: 'default' },
  REVOKED: { label: 'Đã thu hồi', color: 'red' }
};
export const delegationApi = {
  list: (groupId?: string) => apiJson<DelegationView[]>(`/delegations${q({ groupId })}`),
  create: (body: { groupId: string; toMemberId: string; permissions: string[]; startDate: string; endDate: string; reason?: string; fromMemberId?: string }) =>
    apiJson<DelegationView>('/delegations', { method: 'POST', json: body }),
  revoke: (id: string) => apiJson<DelegationView>(`/delegations/${id}/revoke`, { method: 'PUT' })
};

// ---------- Nhật ký thao tác ----------

export interface ActivityLogView {
  _id: string; module: string; action: string; targetId: string | null; targetName: string | null; summary: string;
  detail: Record<string, unknown> | null; actorName: string | null; onBehalfOfName: string | null; createdAt: string;
}
export const ACTIVITY_MODULE_LABEL: Record<string, string> = {
  ORGANIZATION: 'Tổ chức', ROLE: 'Vai trò, chức vụ', MEMBER: 'Thành viên', POINT: 'Điểm phụ cấp', FUND: 'HLC Fund',
  MENTORING: 'Mentoring', LEARNING: 'Học tập', DELEGATION: 'Ủy quyền', SYSTEM: 'Cấu hình hệ thống', PROPOSAL: 'Đề xuất'
};
export const activityApi = {
  list: (params: { module?: string; action?: string; from?: string; to?: string; keyword?: string; limit?: number }) =>
    apiJson<ActivityLogView[]>(`/activity-logs${q(params as Record<string, string | undefined>)}`)
};

// ---------- Cấu hình hệ thống ----------

export interface SystemConfig { forcePasswordChangeOnFirstLogin: boolean; memberCanEditProfileUrl: boolean; allowUnlockPaidPeriod: boolean }
export const systemConfigApi = {
  get: () => apiJson<SystemConfig>('/system-config'),
  save: (body: Partial<SystemConfig>) => apiJson<SystemConfig>('/system-config', { method: 'PUT', json: body })
};

// ---------- Danh mục tỉnh, thành phố ----------

export interface Province { _id: string; code: string; name: string; aliases: string[]; mergedInto: string | null; sortOrder: number; isActive: boolean }
export const provinceApi = {
  list: (all = false) => apiJson<Province[]>(`/provinces${all ? '?all=true' : ''}`),
  save: (body: Partial<Province>) => apiJson<Province>('/provinces', { method: 'PUT', json: body })
};

// ---------- Thêm thành viên (Admin toàn cục) ----------

export interface NextMemberCode { code: string; method: 'COUNT' | 'MAX_PLUS_ONE'; total: number; maxSequence: number; warning: string | null }
export interface DuplicateMember { _id: string; memberCode: string; fullName: string; memberType: string; dateOfBirth: string | null; status: string; phone: string | null; email: string | null }
export interface NewMemberInput {
  fullName: string; gender: string; dateOfBirth: string; memberType: 'MENTEE' | 'MENTOR'; hometownCode: string; addressCode: string;
  phone: string; email: string; nationalId?: string; bankAccount?: string; bankCode?: string; groupId?: string; confirmDuplicate?: boolean;
  majorCodes?: string[]; occupationCodes?: string[];
}
export const memberAdminApi = {
  nextCode: (type: 'MENTEE' | 'MENTOR') => apiJson<NextMemberCode>(`/member-admin/next-code?type=${type}`),
  banks: () => apiJson<string[]>('/member-admin/banks'),
  precheck: (body: Partial<NewMemberInput>) => apiJson<{ next: NextMemberCode | null; duplicates: DuplicateMember[] }>('/member-admin/precheck', { method: 'POST', json: body }),
  create: (body: NewMemberInput) =>
    apiJson<{ member: Member; group: { _id: string; name: string } | null; codeMethod: string; codeWarning: string | null; account: { username: string; password: string } }>('/member-admin/members', { method: 'POST', json: body }),
  /** Xem đầy đủ CCCD / số tài khoản (ghi nhật ký) */
  /** Ghi đè mật khẩu (Admin toàn cục): hệ thống tự sinh, chỉ trả một lần */
  resetPassword: (id: string) => apiJson<{ username: string; password: string; resetAt: string }>(`/member-admin/members/${id}/reset-password`, { method: 'POST' }),
  sensitive: (id: string) => apiJson<{ nationalId: string | null; bankAccount: string | null; bankName: string | null }>(`/member-admin/members/${id}/sensitive`)
};

/** Danh bạ rút gọn (không có dữ liệu nhạy cảm) cho màn hình chọn người */
export interface DirectoryMember { _id: string; memberCode: string; fullName: string; memberType: 'MENTEE' | 'MENTOR'; status: 'ACTIVE' | 'INACTIVE' }
export const memberDirectoryApi = {
  list: (type?: 'MENTEE' | 'MENTOR', all = false) => apiJson<DirectoryMember[]>(`/member-directory${q({ type, all: all ? 'true' : undefined })}`),
  groups: () => apiJson<{ _id: string; code: string; name: string; groupKind: GroupKind }[]>('/member-directory/groups')
};

// ---------- Xuất danh sách thành viên ----------

export const memberExportApi = {
  /** type: MENTEE | MENTOR | undefined (tất cả). Tên file do máy chủ đặt */
  download: (type?: 'MENTEE' | 'MENTOR') =>
    downloadFile(`/member-export/members.xlsx${q({ type })}`, `danh-sach-thanh-vien-${type === 'MENTOR' ? 'mentor' : type === 'MENTEE' ? 'mentee' : 'tat-ca'}.xlsx`)
};

export interface RecapRubric {
  module: { _id: string; code: string; name: string; maxScore: number };
  criteria: { _id: string; name: string; description: string | null; maxScore: number }[];
}
/** Buổi đã có lịch nhưng chưa có recap MTO, mà tôi được phép nộp hộ (Trưởng ban Mentoring hoặc được ủy quyền) */
export interface MissingMentorRecap {
  session: { _id: string; code: string; scheduledStartAt: string; recapDeadlineAt: string | null };
  mentor: MemberBrief | null;
  mentee: MemberBrief | null;
  groupName: string | null;
}
export interface RecapToScore {
  _id: string;
  role: 'MENTOR' | 'MENTEE';
  content: string;
  firstSubmittedAt: string;
  isLate: boolean;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  reviewNote: string | null;
  score: number | null;
  scoreDetails: { criterionId: string; name: string; maxScore: number; score: number }[];
  scoreFeedback: string | null;
  scoredAt: string | null;
  files: FileView[];
  author: MemberBrief | null;
  session: { _id: string; code: string; scheduledStartAt: string; recapDeadlineAt: string; pairStatus: PairRecapStatus };
  mentor: MemberBrief | null;
  mentee: MemberBrief | null;
  groupName: string | null;
  /** SCORE: recap MTE chấm thang 100; APPROVE: recap MTO chỉ Duyệt / Không duyệt */
  mode: 'SCORE' | 'APPROVE';
  canScore: boolean;
  conflict: boolean;
}

export interface LeaderOverview {
  period: PeriodView;
  weeks: { weekKey: string; from: string; to: string }[];
  groups: {
    _id: string;
    code: string;
    name: string;
    groupKind?: GroupKind;
    myRole: string;
    canReview: boolean;
    leader: GroupMember | null;
    deputy: GroupMember | null;
    members: {
      member: GroupMember;
      mentoring: { sessionCode: string; scheduledStartAt: string | null; pairStatus: PairRecapStatus; myStatus: RoleRecapStatus; recapScore: number | null; partner: GroupMember | null }[];
      learning: { moduleId: string; name: string; cycleKey: string; submitted: number; min: number; reached: boolean }[];
      fund: { weeks: { weekKey: string; status: WeekStatus }[]; doneWeeks: number; pending: number; approvedAmount: number };
    }[];
  }[];
}

export const leaderApi = {
  overview: (code?: string) => apiJson<LeaderOverview>(`/leader/overview${q({ period: code })}`),
  recaps: (params: { period?: string; groupId?: string; filter?: string }) => apiJson<{ rubric: RecapRubric; rows: RecapToScore[]; missing: MissingMentorRecap[] }>(`/leader/recaps${q(params)}`),
  score: (id: string, body: { status: 'APPROVED' | 'REJECTED'; scores?: { criterionId: string; score: number }[]; feedback?: string }) =>
    apiJson(`/leader/recaps/${id}/score`, { method: 'PUT', json: body }),
  /** Nhật ký nộp / sửa recap + mốc nộp lần đầu + điểm thưởng sớm đang tính */
  recapHistory: (id: string) => apiJson<RecapHistory>(`/leader/recaps/${id}/history`)
};

export type RecapLogAction = 'SUBMIT' | 'EDIT' | 'RESUBMIT' | 'PROXY';
export const RECAP_LOG_LABEL: Record<RecapLogAction, string> = { SUBMIT: 'Nộp lần đầu', EDIT: 'Sửa', RESUBMIT: 'Nộp lại sau khi bị trả', PROXY: 'Nộp hộ' };
export interface RecapHistory {
  recapId: string;
  role: 'MENTOR' | 'MENTEE';
  sessionCode: string;
  periodCode: string | null;
  member: { _id: string; memberCode: string; fullName: string } | null;
  /** Mốc so với hạn thưởng sớm (23:59 ngày 7 / 14): lần nộp đầu tiên, không đổi khi sửa */
  initialSubmittedAt: string;
  lastSubmittedAt: string;
  recapDeadlineAt: string | null;
  isLate: boolean;
  reviewStatus: string;
  earlyBonus: number;
  earlyBonusPointTypeCode: string | null;
  editCount: number;
  logs: {
    _id: string;
    action: RecapLogAction;
    at: string;
    actorName: string | null;
    contentBefore: string | null;
    contentAfter: string;
    filesBefore: { fileId: string; fileName: string | null }[] | null;
    filesAfter: { fileId: string; fileName: string | null }[] | null;
  }[];
}

// ---------- Hồ sơ cá nhân ----------

export interface ProfileLog { _id: string; field: string; oldValue: string | null; newValue: string | null; changedByRole: 'SELF' | 'ADMIN' | 'APPROVED'; changedByName?: string; createdAt: string }
export const PROFILE_FIELD_LABEL: Record<string, string> = {
  fullName: 'Họ tên', memberType: 'Vai trò', status: 'Trạng thái', dateOfBirth: 'Ngày sinh', gender: 'Giới tính', phone: 'Số điện thoại', hidePhone: 'Ẩn số điện thoại với người ngoài cặp và nhóm',
  email: 'Email', address: 'Địa chỉ cũ (nhập tự do)', hometown: 'Quê quán cũ (nhập tự do)', profileUrl: 'Link profile', bankAccount: 'Số tài khoản', bankName: 'Ngân hàng', joinedAt: 'Ngày tham gia',
  hometownCode: 'Quê quán', addressCode: 'Địa chỉ (tỉnh, thành phố)', major: 'Ngành học (cũ)', occupation: 'Ngành nghề (cũ)', nationalId: 'Số CCCD',
  majorCodes: 'Ngành học', occupationCodes: 'Ngành nghề', bankCode: 'Ngân hàng'
};

// ---------- Danh mục ngành nghề / ngân hàng ----------

export interface CatalogItem { _id: string; type: 'CAREER' | 'BANK'; code: string; name: string; shortName: string | null; aliases: string[]; mergedInto: string | null; sortOrder: number; isActive: boolean }
export const catalogApi = {
  list: (type: 'CAREER' | 'BANK', all = false) => apiJson<CatalogItem[]>(`/catalogs/${type}${all ? '?all=true' : ''}`),
  save: (type: 'CAREER' | 'BANK', body: Partial<CatalogItem>) => apiJson<CatalogItem>(`/catalogs/${type}`, { method: 'PUT', json: body })
};
/** Hồ sơ còn ngành học / ngành nghề / ngân hàng cũ nhập tự do chưa quy đổi được */
export const catalogNeedsReview = (member: Partial<Member>) => ({
  major: Boolean(member.major?.trim()) && !member.majorCodes?.length,
  occupation: Boolean(member.occupation?.trim()) && !member.occupationCodes?.length,
  bank: Boolean(member.bankName?.trim()) && !member.bankCode
});

// ---------- Bản nháp & duyệt thay đổi hồ sơ ----------

export type ProfileChangeStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
export interface ProfileChangeRequest {
  _id: string; memberId: string; status: ProfileChangeStatus; reason: string | null; onBehalfOf: string | null; effectivePeriodCode: string | null;
  changes: { field: string; oldValue: string | null; newValue: string | null }[];
  createdAt: string; decidedAt: string | null; decidedByName?: string | null;
  member?: { _id: string; memberCode: string; fullName: string; memberType: string };
}
export const PROFILE_CHANGE_STATUS: Record<ProfileChangeStatus, { label: string; color: string }> = {
  PENDING: { label: 'Chờ duyệt', color: 'gold' },
  APPROVED: { label: 'Đã duyệt', color: 'green' },
  REJECTED: { label: 'Bị từ chối', color: 'red' },
  CANCELLED: { label: 'Đã hủy', color: 'default' }
};
export interface ProfileApprover {
  _id: string; memberId: string; scope: 'ALL' | 'MENTEE' | 'MENTOR'; startDate: string; endDate: string; note: string | null;
  status: 'ACTIVE' | 'UPCOMING' | 'EXPIRED' | 'REVOKED'; member: { _id: string; memberCode: string; fullName: string } | null;
}
export const profileWorkflowApi = {
  draft: () => apiJson<{ data: Record<string, unknown>; updatedAt: string } | null>('/member/me/profile/draft'),
  saveDraft: (data: Record<string, unknown>) => apiJson('/member/me/profile/draft', { method: 'PUT', json: { data } }),
  discardDraft: () => apiJson('/member/me/profile/draft', { method: 'DELETE' }),
  save: (body: Record<string, unknown>) => apiJson<{ member: Member; applied: string[]; pending: ProfileChangeRequest | null }>('/member/me/profile', { method: 'PUT', json: body }),
  myRequests: () => apiJson<ProfileChangeRequest[]>('/member/me/profile/requests'),
  cancelRequest: (id: string) => apiJson(`/member/me/profile/requests/${id}/cancel`, { method: 'POST' })
};
export const profileApprovalApi = {
  canApprove: () => apiJson<{ canApprove: boolean; scopes: string[] }>('/profile-requests/can-approve'),
  list: (status = 'PENDING') => apiJson<ProfileChangeRequest[]>(`/profile-requests?status=${status}`),
  decide: (id: string, approve: boolean, reason?: string) => apiJson<ProfileChangeRequest>(`/profile-requests/${id}/decide`, { method: 'PUT', json: { approve, reason } }),
  approvers: () => apiJson<ProfileApprover[]>('/profile-requests/approvers/all'),
  addApprover: (body: { memberId: string; scope: string; startDate: string; endDate: string; note?: string }) => apiJson('/profile-requests/approvers', { method: 'POST', json: body }),
  revokeApprover: (id: string) => apiJson(`/profile-requests/approvers/${id}/revoke`, { method: 'PUT' })
};

export const passwordApi = {
  change: (body: { oldPass: string; newPass: string; confirmPass: string }) => apiJson('/user/me/password', { method: 'PUT', json: body })
};

export const profileApi = {
  mine: () => apiJson<Member>('/member/me/profile'),
  update: (body: Partial<Member>) => apiJson<Member>('/member/me/profile', { method: 'PUT', json: body }),
  logs: () => apiJson<ProfileLog[]>('/member/me/profile-logs'),
  adminUpdate: (id: string, body: Partial<Member>) => apiJson<Member>(`/member/${id}/profile`, { method: 'PUT', json: body }),
  adminLogs: (id: string) => apiJson<ProfileLog[]>(`/member/${id}/profile-logs`)
};

// ---------- Tỷ lệ hoàn tất nhóm (thưởng Leader/Phó) ----------

export interface GroupCompletion { _id: string; name: string; groupKind: GroupKind; done: number; total: number; rate: number | null; threshold: number; passed: boolean; leader: string | null; deputy: string | null }
export interface AllowanceReport extends PeriodSummary {
  entriesByMember: Record<string, { pointType: string; description: string; points: number; sourceType: string }[]>;
  completion: GroupCompletion[];
  generatedAt: string;
}

export const completionApi = {
  report: (code: string) => apiJson<AllowanceReport>(`/points/periods/${encodeURIComponent(code)}/report`),
  admin: (code: string) => apiJson<GroupCompletion[]>(`/points/periods/${encodeURIComponent(code)}/group-completion`),
  mine: (code: string) => apiJson<GroupCompletion[]>(`/leader/completion?period=${encodeURIComponent(code)}`)
};

// ---------- Dữ liệu mentoring quý cũ ----------

export interface HistoryImportResult {
  valid: boolean;
  applied: boolean;
  batchId: string | null;
  errors: { row: number; message: string }[];
  rows: { row: number; month: number; mentorCode: string; menteeCode: string; mentorName: string; menteeName: string; startAt: string | null; mentorRecap: unknown; menteeRecap: { score: number | null } | null }[];
}
export interface HistoryBatch { _id: string; quarterCode: string; fileName: string | null; status: 'ACTIVE' | 'REVERTED'; reason: string | null; created: { rows?: number; pairIds?: string[]; recapIds?: string[] }; createdAt: string; revertedAt: string | null }

export const historyApi = {
  exportQuarter: (quarter: string) => downloadFile(`/mentoring/history/export.xlsx?quarter=${encodeURIComponent(quarter)}`, `hlc-mentoring-quy-cu-${quarter}.xlsx`),
  importQuarter: (quarter: string, file: File, dryRun: boolean, reason?: string) => {
    const form = new FormData();
    form.append('file', file);
    if (reason) form.append('reason', reason);
    return apiJson<HistoryImportResult>(`/mentoring/history/import?quarter=${encodeURIComponent(quarter)}&dryRun=${dryRun}`, { method: 'POST', body: form });
  },
  batches: () => apiJson<HistoryBatch[]>('/mentoring/history/batches'),
  revert: (id: string) => apiJson(`/mentoring/history/batches/${id}/revert`, { method: 'POST' }),
  proxyRecap: (sessionId: string, body: { role: 'MENTOR' | 'MENTEE'; content: string; fileIds?: string[]; submittedAt?: string; reason: string }) =>
    apiJson(`/mentoring/sessions/${sessionId}/recap/proxy`, { method: 'POST', json: body })
};
