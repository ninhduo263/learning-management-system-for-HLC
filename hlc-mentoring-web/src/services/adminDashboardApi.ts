import { apiFetch } from '@/lib/api';

export interface AdminDashboardUser {
  userId: string;
  fullName: string;
  phone?: string;
  email?: string;
  mentorId?: string;
  profileUrl?: string;
}

export interface AdminDashboardPair {
  _id: string;
  monthlyId?: string;
  quarterlyId?: string;
  cycleId: string;
  mentorId: string;
  menteeId: string;
  importedRecapStatus?: Record<string, { mentor?: string; mentee?: string }>;
  recapStatusByRole?: { mentor?: string; mentee?: string };
  isLocked?: boolean;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const adminDashboardRoutes = {
  pairStatuses: '/mentoring/pairs/status',
  mentors: '/users/mentors',
  mentees: '/users/mentees',
  quarterlyReport: (year: number, quarter: number) =>
    `/mentoring/quarterly-report/${encodeURIComponent(String(year))}/${encodeURIComponent(String(quarter))}/export.xlsx`
};

async function readApiData<T>(path: string, fallbackMessage: string): Promise<T> {
  const response = await apiFetch(path);
  const result = await response.json() as ApiResponse<T>;
  if (!response.ok || !result.success) {
    throw new Error(result.message || fallbackMessage);
  }
  return result.data;
}

function userListRoute(endpoint: string, includeInactive: boolean) {
  const query = new URLSearchParams({ includeInactive: String(includeInactive) });
  return `${endpoint}?${query.toString()}`;
}

async function getUsers(endpoint: string, label: string) {
  return readApiData<AdminDashboardUser[]>(
    userListRoute(endpoint, true),
    `Không thể tải danh sách ${label}`
  );
}

export async function getAdminPairDashboardData() {
  const [pairs, mentors, mentees] = await Promise.all([
    readApiData<AdminDashboardPair[]>(
      adminDashboardRoutes.pairStatuses,
      'Không thể tải danh sách mentoring'
    ),
    getUsers(adminDashboardRoutes.mentors, 'Mentor'),
    getUsers(adminDashboardRoutes.mentees, 'Mentee')
  ]);

  return { pairs, mentors, mentees };
}

export async function getAdminMemberDirectory() {
  const [mentors, mentees] = await Promise.all([
    getUsers(adminDashboardRoutes.mentors, 'Mentor'),
    getUsers(adminDashboardRoutes.mentees, 'Mentee')
  ]);

  return { mentors, mentees };
}

export async function getQuarterlyReportFile(year: number, quarter: number) {
  const response = await apiFetch(adminDashboardRoutes.quarterlyReport(year, quarter));
  if (!response.ok) {
    const result = await response.json() as Partial<ApiResponse<never>>;
    throw new Error(result.message || 'Không thể xuất file báo cáo quý');
  }
  return response.blob();
}
