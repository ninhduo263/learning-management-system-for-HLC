'use client';

import { useMemo, useState } from 'react';
import { App, Button, Card, Modal, Popconfirm, Spin, Table, Tabs, Tag, Typography, Upload } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import { apiFetch, getAuthToken } from '@/lib/api';

const QUARTERS = {
  q2: { cycleId: '2026Q2', label: 'Danh sách Quý 2', months: ['04/2026', '05/2026', '06/2026'] },
  q3: { cycleId: '2026Q3', label: 'Danh sách Quý 3', months: ['07/2026', '08/2026', '09/2026'] }
} as const;

interface UserOption { userId: string; fullName: string; }
interface Pair {
  _id: string;
  pairId: string;
  pairCode?: string;
  cycleId: string;
  mentorId: string;
  menteeId: string;
  importedRecapStatus?: Record<string, { mentor?: string; mentee?: string }>;
  isLocked?: boolean;
}
interface DisplayRow {
  key: string;
  serial: number | string;
  pairCode: string;
  role: 'Mentor' | 'Mentee';
  userId: string;
  fullName: string;
  [month: string]: string | number;
}

function statusLabel(value?: string) {
  const normalized = String(value || '').trim().toLowerCase();
  return ['đã xong', 'da xong', 'completed', 'approved'].includes(normalized) ? 'Đã xong' : 'Chưa xong';
}

function monthStatus(pair: Pair, month: string, role: 'mentor' | 'mentee') {
  const statuses = pair.importedRecapStatus || {};
  const compact = month.replace('/', '');
  const raw = statuses[month]?.[role] ?? statuses[compact]?.[role] ?? statuses[month.replace('/', '-') as keyof typeof statuses]?.[role];
  return statusLabel(raw);
}

function pairCode(pair: Pair) {
  if (pair.pairCode) return pair.pairCode;
  const month = Object.keys(pair.importedRecapStatus || {})[0] || '04/2026';
  const mentor = pair.mentorId.replace(/\D/g, '').slice(-5).padStart(5, '0');
  const mentee = pair.menteeId.replace(/\D/g, '').slice(-5).padStart(5, '0');
  return `${month}-${mentor}-${mentee}`;
}

function buildRows(pairs: Pair[], months: readonly string[], mentorNames: Map<string, string>, menteeNames: Map<string, string>, showMenteeStatus: boolean) {
  return pairs.flatMap<DisplayRow>((pair, index) => {
    const mentorRow = {
      key: `${pair.pairId}-mentor`,
      serial: index + 1,
      pairCode: pairCode(pair),
      role: 'Mentor' as const,
      userId: pair.mentorId,
      fullName: mentorNames.get(pair.mentorId) || pair.mentorId,
      ...Object.fromEntries(months.map((month) => [month, monthStatus(pair, month, 'mentor')]))
    };
    const menteeRow = {
      key: `${pair.pairId}-mentee`,
      serial: '',
      pairCode: '',
      role: 'Mentee' as const,
      userId: pair.menteeId,
      fullName: menteeNames.get(pair.menteeId) || pair.menteeId,
      ...Object.fromEntries(months.map((month) => [month, showMenteeStatus ? monthStatus(pair, month, 'mentee') : '']))
    };
    return [mentorRow, menteeRow];
  });
}

export default function AdminDashboardPage() {
  const { message } = App.useApp();
  const [isDataVisible, setIsDataVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pairsByQuarter, setPairsByQuarter] = useState<Record<string, Pair[]>>({ q2: [], q3: [] });
  const [mentors, setMentors] = useState<UserOption[]>([]);
  const [mentees, setMentees] = useState<UserOption[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importQuarter, setImportQuarter] = useState<keyof typeof QUARTERS>('q2');
  const [quarterLocks, setQuarterLocks] = useState<Record<string, boolean>>({ '2026Q2': false, '2026Q3': false });

  const loadPairs = async () => {
    setLoading(true);
    try {
      const [q2Response, q3Response, mentorResponse, menteeResponse, cyclesResponse] = await Promise.all([
        apiFetch('/mentoring/pairs/status?cycleId=2026Q2'),
        apiFetch('/mentoring/pairs/status?cycleId=2026Q3'),
        apiFetch('/users/mentors'),
        apiFetch('/users/mentees'),
        apiFetch('/cycles')
      ]);
      const [q2Result, q3Result, mentorResult, menteeResult, cyclesResult] = await Promise.all([
        q2Response.json(), q3Response.json(), mentorResponse.json(), menteeResponse.json(), cyclesResponse.json()
      ]);
      if (!q2Result.success || !q3Result.success) throw new Error('Không thể tải danh sách mentoring');
      setPairsByQuarter({
        q2: (q2Result.data || []).filter((pair: Pair) => pair.cycleId === '2026Q2'),
        q3: (q3Result.data || []).filter((pair: Pair) => pair.cycleId === '2026Q3')
      });
      if (mentorResult.success) setMentors(mentorResult.data || []);
      if (menteeResult.success) setMentees(menteeResult.data || []);
      if (cyclesResult.success) {
        setQuarterLocks({
          '2026Q2': Boolean(cyclesResult.data.find((cycle: { code: string }) => cycle.code === '2026Q2')?.isLocked),
          '2026Q3': Boolean(cyclesResult.data.find((cycle: { code: string }) => cycle.code === '2026Q3')?.isLocked)
        });
      }
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tải dữ liệu mentoring');
    } finally {
      setLoading(false);
    }
  };

  const toggleLock = async (quarter: keyof typeof QUARTERS) => {
    const cycleId = QUARTERS[quarter].cycleId;
    const isLocked = !quarterLocks[cycleId];
    try {
      const response = await apiFetch('/mentoring/quarter-lock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId, isLocked })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setQuarterLocks((current) => ({ ...current, [cycleId]: isLocked }));
      message.success(isLocked ? `Đã khóa dữ liệu ${QUARTERS[quarter].label}` : 'Đã mở khóa ghi đè dữ liệu');
      if (isDataVisible) await loadPairs();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể cập nhật khóa dữ liệu');
    }
  };

  const handleShowData = async () => {
    setIsDataVisible(true);
    await loadPairs();
  };

  const importPairs = async (file: File) => {
    setImportLoading(true);
    try {
      if (!getAuthToken()) throw new Error('Phiên đăng nhập Admin không tồn tại. Vui lòng đăng nhập lại.');
      const body = new FormData();
      body.append('file', file);
      const response = await apiFetch('/mentoring/import-pairs', { method: 'POST', body });
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Import thất bại');
      message.success(`Đã cập nhật ${result.data.updated} cặp, tạo ${result.data.inserted} cặp, bỏ qua ${result.data.skipped || 0} cặp bị khóa`);
      setImportOpen(false);
      if (isDataVisible) await loadPairs();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể import dữ liệu');
    } finally {
      setImportLoading(false);
    }
  };

  const mentorNames = useMemo(() => new Map(mentors.map((user) => [user.userId, user.fullName])), [mentors]);
  const menteeNames = useMemo(() => new Map(mentees.map((user) => [user.userId, user.fullName])), [mentees]);

  const renderTable = (quarter: keyof typeof QUARTERS) => {
    const config = QUARTERS[quarter];
    const locked = quarterLocks[config.cycleId];
    const rows = buildRows(pairsByQuarter[quarter], config.months, mentorNames, menteeNames, quarter === 'q2');
    const columns = [
      { title: 'STT', dataIndex: 'serial', width: 65 },
      { title: 'MÃ MENTORING', dataIndex: 'pairCode', width: 190 },
      { title: 'CHỨC DANH', dataIndex: 'role', width: 110, render: (value: string) => <Tag color={value === 'Mentor' ? 'blue' : 'green'}>{value}</Tag> },
      { title: 'HLC ID', dataIndex: 'userId', width: 150 },
      { title: 'HỌ VÀ TÊN', dataIndex: 'fullName', width: 220 },
      ...config.months.map((month) => ({
        title: month,
        dataIndex: month,
        width: 110,
        render: (value: string) => value ? <Tag color={value === 'Đã xong' ? 'green' : 'red'}>{value}</Tag> : ''
      }))
    ];
    return (
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
          <Button block className="sm:!w-auto" disabled={locked} onClick={() => { setImportQuarter(quarter); setImportOpen(true); }}>Import dữ liệu</Button>
          <Popconfirm
            title={locked ? 'Mở khóa để cho phép ghi đè dữ liệu?' : `Khóa dữ liệu ${config.label}?`}
            description={locked ? 'Sau khi mở khóa, file import có thể cập nhật các cặp trong quý.' : 'Các bản ghi trong quý sẽ không bị import ghi đè.'}
            onConfirm={() => void toggleLock(quarter)}
            okText={locked ? 'Mở khóa' : 'Khóa dữ liệu'}
            cancelText="Hủy"
          >
            <Button block className="sm:!w-auto" danger={!locked} type={locked ? 'primary' : 'default'}>
              {locked ? '🔓 Mở khóa ghi đè' : '🔒 Khóa dữ liệu'}
            </Button>
          </Popconfirm>
        </div>
        <Table<DisplayRow> rowKey="key" columns={columns} dataSource={rows} loading={loading} scroll={{ x: 'max-content' }} pagination={{ pageSize: 20 }} locale={{ emptyText: `Chưa có dữ liệu ${config.label.toLowerCase()}` }} />
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Typography.Title level={3} className="!mb-0">Báo cáo danh sách mentoring</Typography.Title>
        <div className="flex gap-2">
          <Button type="primary" block className="sm:!w-auto" onClick={handleShowData}>Xem danh sách</Button>
        </div>
      </div>
      <Modal title={`Import dữ liệu mentoring ${QUARTERS[importQuarter].label}`} open={importOpen} onCancel={() => setImportOpen(false)} footer={null} destroyOnHidden>
        <Typography.Paragraph type="secondary">Chọn file Excel danh sách mentoring và trạng thái recap theo tháng.</Typography.Paragraph>
        <Upload.Dragger accept=".xlsx,.csv" showUploadList={false} disabled={importLoading} beforeUpload={(file) => { void importPairs(file); return Upload.LIST_IGNORE; }}>
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">{importLoading ? 'Đang import...' : 'Kéo thả file hoặc bấm để chọn'}</p>
        </Upload.Dragger>
      </Modal>
      {!isDataVisible ? (
        <Card><Typography.Text type="secondary">Bấm “Xem danh sách” để tải dữ liệu mentoring.</Typography.Text></Card>
      ) : loading ? (
        <Card className="flex justify-center py-12"><Spin size="large" /></Card>
      ) : (
        <Card title="Danh sách mentoring">
          <Tabs items={[
            { key: 'q2', label: QUARTERS.q2.label, children: renderTable('q2') },
            { key: 'q3', label: QUARTERS.q3.label, children: renderTable('q3') }
          ]} />
        </Card>
      )}
    </div>
  );
}
