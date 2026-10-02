'use client';

import { useMemo, useState } from 'react';
import { Alert, App, Button, Card, Spin, Table, Tabs, Tag, Typography } from 'antd';
import { apiFetch } from '@/lib/api';
import { getCurrentTime } from '@/utils/time';
import ProfileLink from '@/components/ProfileLink';

interface UserOption {
  userId: string;
  fullName: string;
  phone?: string;
  email?: string;
  mentorId?: string;
  profileUrl?: string;
}

type MemberRole = 'mentor' | 'mentee';

interface Pair {
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

interface QuarterReport {
  key: string;
  quarter: number;
  year: number;
  quarterlyIds: Pair[][];
  months: string[];
  completed: boolean;
}

interface DisplayRow {
  key: string;
  serial: number | string;
  quarterlyId: string;
  role: 'Mentor' | 'Mentee';
  userId: string;
  fullName: string;
  profileUrl: string;
  [column: string]: string | number;
}

function quarterDetails(quarterlyId?: string) {
  const match = /^Q([1-4])(\d{4})O\d{5}E\d{5}$/i.exec(String(quarterlyId || ''));
  return match ? { quarter: Number(match[1]), year: Number(match[2]) } : null;
}

function monthFromMonthlyId(monthlyId?: string) {
  const match = /^T(1[0-2]|[1-9])Q[1-4](\d{4})O\d{5}E\d{5}$/i.exec(String(monthlyId || ''));
  return match ? `${String(Number(match[1])).padStart(2, '0')}/${match[2]}` : null;
}

function monthLabels(quarter: number, year: number) {
  return [1, 2, 3].map((offset) => {
    const month = (quarter - 1) * 3 + offset;
    return `${String(month).padStart(2, '0')}/${year}`;
  });
}

function statusLabel(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  if (['đã xong', 'da xong', 'đã nộp/đã xong', 'completed', 'approved', 'xong'].includes(normalized)) return 'Đã nộp';
  if (['nộp muộn', 'late'].includes(normalized)) return 'Nộp muộn';
  if (['chờ', 'pending'].includes(normalized)) return 'Chờ';
  return 'Chưa xong';
}

function getImportedMonthStatus(pair: Pair, month: string, role: MemberRole) {
  const statuses = pair.importedRecapStatus || {};
  const [monthNumber, year] = month.split('/');
  const candidates = [
    month,
    `${monthNumber}${year}`,
    `${monthNumber}-${year}`
  ];
  for (const key of candidates) {
    const value = statuses[key]?.[role];
    if (value !== undefined) return value;
  }
  return undefined;
}

function pairStatus(pair: Pair | undefined, month: string, role: MemberRole) {
  if (!pair) return '';
  const apiStatus = pair.recapStatusByRole?.[role];
  if (apiStatus !== undefined) return statusLabel(apiStatus);
  return statusLabel(getImportedMonthStatus(pair, month, role));
}

function buildRows(
  pairs: Pair[][],
  months: string[],
  mentorNames: Map<string, string>,
  menteeNames: Map<string, string>,
  mentorProfiles: Map<string, string>,
  menteeProfiles: Map<string, string>
) {
  return pairs.flatMap<DisplayRow>((monthlyPairs, index) => {
    const firstPair = monthlyPairs[0];
    const pairsByMonth = new Map(
      monthlyPairs
        .map((pair) => [monthFromMonthlyId(pair.monthlyId), pair] as const)
        .filter((entry): entry is readonly [string, Pair] => Boolean(entry[0]))
    );
    const createRow = (role: MemberRole): DisplayRow => {
      const isMentor = role === 'mentor';
      const userId = isMentor ? firstPair.mentorId : firstPair.menteeId;
      const row: DisplayRow = {
        key: `${firstPair.quarterlyId}-${role}`,
        serial: isMentor ? index + 1 : '',
        quarterlyId: firstPair.quarterlyId || '',
        role: isMentor ? 'Mentor' : 'Mentee',
        userId,
        fullName: (isMentor ? mentorNames : menteeNames).get(userId) || userId,
        profileUrl: (isMentor ? mentorProfiles : menteeProfiles).get(userId) || ''
      };

      for (const month of months) {
        const columnKey = month.replace('/', '_');
        const pair = pairsByMonth.get(month);
        row[`${columnKey}_monthlyId`] = pair?.monthlyId || '';
        row[`${columnKey}_status`] = pairStatus(pair, month, role);
      }
      return row;
    };

    return [createRow('mentor'), createRow('mentee')];
  });
}

export default function AdminDashboardPage() {
  const { message } = App.useApp();
  const [isDataVisible, setIsDataVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [membersVisible, setMembersVisible] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [pairs, setPairs] = useState<Pair[]>([]);
  const [mentors, setMentors] = useState<UserOption[]>([]);
  const [mentees, setMentees] = useState<UserOption[]>([]);
  const [directoryMentors, setDirectoryMentors] = useState<UserOption[]>([]);
  const [directoryMentees, setDirectoryMentees] = useState<UserOption[]>([]);
  const [exportingQuarter, setExportingQuarter] = useState<string | null>(null);

  const loadPairs = async () => {
    setLoading(true);
    try {
      const [pairResponse, mentorResponse, menteeResponse] = await Promise.all([
        apiFetch('/mentoring/pairs/status'),
        apiFetch('/users/mentors?includeInactive=true'),
        apiFetch('/users/mentees?includeInactive=true')
      ]);
      const [pairResult, mentorResult, menteeResult] = await Promise.all([
        pairResponse.json(), mentorResponse.json(), menteeResponse.json()
      ]);
      if (!pairResult.success) throw new Error(pairResult.message || 'Không thể tải danh sách mentoring');
      if (!mentorResult.success) throw new Error(mentorResult.message || 'Không thể tải danh sách Mentor');
      if (!menteeResult.success) throw new Error(menteeResult.message || 'Không thể tải danh sách Mentee');
      setPairs(pairResult.data || []);
      setMentors(mentorResult.data || []);
      setMentees(menteeResult.data || []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tải dữ liệu mentoring');
    } finally {
      setLoading(false);
    }
  };

  const handleShowData = async () => {
    if (isDataVisible) {
      setIsDataVisible(false);
      return;
    }
    setIsDataVisible(true);
    await loadPairs();
  };

  const exportQuarter = async (report: QuarterReport) => {
    setExportingQuarter(report.key);
    try {
      const response = await apiFetch(`/mentoring/quarterly-report/${report.year}/${report.quarter}/export.xlsx`);
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Không thể xuất file báo cáo quý');
      }
      const file = await response.blob();
      const url = URL.createObjectURL(file);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hlc-mentoring-Q${report.quarter}-${report.year}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể xuất file báo cáo quý');
    } finally {
      setExportingQuarter(null);
    }
  };

  const handleShowMembers = async () => {
    if (membersVisible) {
      setMembersVisible(false);
      return;
    }
    setMembersVisible(true);
    setMembersLoading(true);
    try {
      const [mentorResponse, menteeResponse] = await Promise.all([
        apiFetch('/users/mentors?includeInactive=true'),
        apiFetch('/users/mentees?includeInactive=true')
      ]);
      const [mentorResult, menteeResult] = await Promise.all([
        mentorResponse.json(),
        menteeResponse.json()
      ]);
      if (!mentorResult.success) throw new Error(mentorResult.message || 'Không thể tải danh sách Mentor');
      if (!menteeResult.success) throw new Error(menteeResult.message || 'Không thể tải danh sách Mentee');
      setDirectoryMentors(mentorResult.data || []);
      setDirectoryMentees(menteeResult.data || []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tải danh sách thành viên');
    } finally {
      setMembersLoading(false);
    }
  };

  const mentorNames = useMemo(() => new Map(mentors.map((user) => [user.userId, user.fullName])), [mentors]);
  const menteeNames = useMemo(() => new Map(mentees.map((user) => [user.userId, user.fullName])), [mentees]);
  const mentorProfiles = useMemo(() => new Map(mentors.map((user) => [user.userId, user.profileUrl || ''])), [mentors]);
  const menteeProfiles = useMemo(() => new Map(mentees.map((user) => [user.userId, user.profileUrl || ''])), [mentees]);

  const reports = useMemo(() => {
    const groups = new Map<string, Pair[]>();
    for (const pair of pairs) {
      if (!pair.quarterlyId) continue;
      const group = groups.get(pair.quarterlyId) || [];
      group.push(pair);
      groups.set(pair.quarterlyId, group);
    }

    const quarters = new Map<string, Map<string, Pair[]>>();
    for (const [quarterlyId, monthlyPairs] of groups) {
      const details = quarterDetails(quarterlyId);
      if (!details) continue;
      const key = `Q${details.quarter}${details.year}`;
      const quarterGroups = quarters.get(key) || new Map<string, Pair[]>();
      quarterGroups.set(quarterlyId, monthlyPairs);
      quarters.set(key, quarterGroups);
    }

    const now = getCurrentTime();
    return [...quarters.entries()]
      .map(([key, quarterGroups]) => {
        const { quarter, year } = quarterDetails([...quarterGroups.keys()][0])!;
        const monthlyPairs = [...quarterGroups.values()].flat();
        const hasHistoricalStatuses = monthlyPairs.some(
          (pair) => Object.keys(pair.importedRecapStatus || {}).length > 0
        );
        const quarterHasEnded = now.getTime() >= Date.UTC(year, quarter * 3, 1);
        return {
          key,
          quarter,
          year,
          quarterlyIds: [...quarterGroups.values()],
          months: monthLabels(quarter, year),
          visible: hasHistoricalStatuses || quarterHasEnded,
          completed: quarterHasEnded
        };
      })
      .filter((report) => report.visible)
      .sort((left, right) => left.year - right.year || left.quarter - right.quarter);
  }, [pairs]);

  const renderTable = (report: QuarterReport) => {
    const rows = buildRows(report.quarterlyIds, report.months, mentorNames, menteeNames, mentorProfiles, menteeProfiles);
    const columns = [
      { title: 'STT', dataIndex: 'serial', width: 65 },
      { title: 'QUÝ', render: () => `Q${report.quarter}/${report.year}`, width: 100 },
      { title: 'CHỨC DANH', dataIndex: 'role', width: 110, render: (value: string) => <Tag color={value === 'Mentor' ? 'blue' : 'green'}>{value}</Tag> },
      {
        title: 'THÀNH VIÊN',
        width: 250,
        render: (_: unknown, row: DisplayRow) => (
          <div><strong>{row.fullName}</strong><div className="text-xs text-gray-500">{row.userId}</div></div>
        )
      },
      {
        title: 'PROFILE',
        dataIndex: 'profileUrl',
        width: 130,
        render: (value: string) => <ProfileLink url={value} />
      },
      ...report.months.map((month) => {
        const columnKey = month.replace('/', '_');
        return {
          title: month,
          children: [
            { title: 'MÃ THEO THÁNG', dataIndex: `${columnKey}_monthlyId`, width: 250, render: (value: string) => value || '—' },
            {
              title: 'TRẠNG THÁI',
              dataIndex: `${columnKey}_status`,
              width: 115,
              render: (value: string) => value
                ? <Tag color={value === 'Đã nộp' ? 'green' : value === 'Nộp muộn' || value === 'Chờ' ? 'gold' : 'red'}>{value}</Tag>
                : '—'
            }
          ]
        };
      })
    ];

    return (
      <Table<DisplayRow>
        rowKey="key"
        columns={columns}
        dataSource={rows}
        loading={loading}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20 }}
        locale={{ emptyText: `Chưa có dữ liệu Quý ${report.quarter}` }}
      />
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Typography.Title level={3} className="!mb-0">Báo cáo danh sách mentoring</Typography.Title>
        <div className="flex gap-2">
          <Button type="primary" block className="sm:!w-auto" onClick={handleShowData}>
            {isDataVisible ? 'Ẩn danh sách' : 'Xem danh sách'}
          </Button>
        </div>
      </div>
      {!isDataVisible ? (
        <Card><Typography.Text type="secondary">Bấm “Xem danh sách” để tải dữ liệu mentoring.</Typography.Text></Card>
      ) : loading ? (
        <Card className="flex justify-center py-12"><Spin size="large" /></Card>
      ) : reports.length === 0 ? (
        <Card><Alert type="info" showIcon title="Chưa có báo cáo quý đã hoàn tất" /></Card>
      ) : (
        <Card title="Danh sách mentoring">
          <Tabs items={reports.map((report) => ({
            key: report.key,
            label: `Danh sách Quý ${report.quarter} - ${report.year}`,
            children: (
              <div className="space-y-3">
                {report.completed && (
                  <div className="flex justify-end">
                    <Button
                      type="primary"
                      loading={exportingQuarter === report.key}
                      disabled={exportingQuarter !== null && exportingQuarter !== report.key}
                      onClick={() => exportQuarter(report)}
                    >
                      Xuất file .xlsx
                    </Button>
                  </div>
                )}
                {renderTable(report)}
              </div>
            )
          }))} />
        </Card>
      )}
      <Card
        title="Danh sách thành viên"
        extra={(
          <Button type="primary" onClick={handleShowMembers}>
            {membersVisible ? 'Ẩn danh sách thành viên' : 'Xem danh sách thành viên'}
          </Button>
        )}
      >
        {!membersVisible ? (
          <Typography.Text type="secondary">Bấm “Xem danh sách thành viên” để tải danh sách Mentor và Mentee.</Typography.Text>
        ) : (
          <Tabs
            items={[
              {
                key: 'mentees',
                label: `Danh sách Mentee (${directoryMentees.length})`,
                children: (
                  <Table<UserOption>
                    rowKey="userId"
                    size="small"
                    loading={membersLoading}
                    dataSource={directoryMentees}
                    scroll={{ x: 'max-content' }}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'STT', render: (_: unknown, _member: UserOption, index: number) => index + 1, width: 65 },
                      { title: 'HỌ VÀ TÊN', dataIndex: 'fullName', render: (value: string) => value || 'Chưa có họ tên' },
                      { title: 'HLC ID', dataIndex: 'userId' },
                      { title: 'SỐ ĐIỆN THOẠI', dataIndex: 'phone', render: (value?: string) => value || '—' },
                      { title: 'EMAIL', dataIndex: 'email', render: (value?: string) => value || '—' },
                      { title: 'PROFILE', dataIndex: 'profileUrl', render: (value?: string) => <ProfileLink url={value} /> }
                    ]}
                  />
                )
              },
              {
                key: 'mentors',
                label: `Danh sách Mentor (${directoryMentors.length})`,
                children: (
                  <Table<UserOption>
                    rowKey="userId"
                    size="small"
                    loading={membersLoading}
                    dataSource={directoryMentors}
                    scroll={{ x: 'max-content' }}
                    pagination={{ pageSize: 10 }}
                    columns={[
                      { title: 'STT', render: (_: unknown, _member: UserOption, index: number) => index + 1, width: 65 },
                      { title: 'HỌ VÀ TÊN', dataIndex: 'fullName', render: (value: string) => value || 'Chưa có họ tên' },
                      { title: 'HLC ID', dataIndex: 'userId' },
                      { title: 'SỐ ĐIỆN THOẠI', dataIndex: 'phone', render: (value?: string) => value || '—' },
                      { title: 'EMAIL', dataIndex: 'email', render: (value?: string) => value || '—' },
                      { title: 'PROFILE', dataIndex: 'profileUrl', render: (value?: string) => <ProfileLink url={value} /> }
                    ]}
                  />
                )
              }
            ]}
          />
        )}
      </Card>
    </div>
  );
}
