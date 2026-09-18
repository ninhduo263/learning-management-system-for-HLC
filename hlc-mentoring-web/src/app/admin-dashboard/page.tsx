'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  App,
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Statistic,
  Table,
  Tag
  ,Modal, Upload, Typography
} from 'antd';
import { DownloadOutlined, PlayCircleOutlined, LockOutlined, PlusOutlined, TrophyOutlined, CrownOutlined, InboxOutlined } from '@ant-design/icons';
import { apiFetch, getAuthToken } from '@/lib/api';

type CycleStatus = 'OPEN' | 'CALCULATING' | 'REVIEWING' | 'LOCKED' | 'EXPORTED' | 'PAID';

interface Cycle {
  code: string;
  name: string;
  startDate: string;
  endDate: string;
  status: CycleStatus;
  pointRate: number;
  baseAllowance: number;
}

interface AllowanceSummary {
  _id: string;
  userId: string;
  totalScore: number;
  pointRate: number;
  baseAllowance: number;
  bonusAmount: number;
  deductionAmount: number;
  finalAmount: number;
  status: string;
  scoreByCategory: Record<string, number>;
  user?: { fullName: string; role: string };
}

interface DashboardOverview {
  metrics: {
    totalMentees: number;
    totalMentors: number;
    totalPairs: number;
    submittedItems: number;
    approvedItems: number;
    fundStatus: Record<string, number>;
  };
  topMentees: Array<{ userId: string; fullName: string; totalScore: number; finalAmount: number; position: string }>;
  needsImprovement: Array<{ userId: string; totalScore: number; finalAmount: number }>;
  topPairs: Array<{ pairId: string; mentorId: string; menteeId: string; rating?: number; status?: string }>;
}

interface CycleFormValues {
  code: string;
  name: string;
  year: number;
  quarter: number;
  pointRate: number;
  baseAllowance: number;
}

const statusLabels: Record<CycleStatus, string> = {
  OPEN: 'Đang mở',
  CALCULATING: 'Đang tính',
  REVIEWING: 'Chờ duyệt',
  LOCKED: 'Đã khóa',
  EXPORTED: 'Đã xuất',
  PAID: 'Đã thanh toán'
};

export default function AdminDashboardPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<CycleFormValues>();
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [summaries, setSummaries] = useState<AllowanceSummary[]>([]);
  const [dashboard, setDashboard] = useState<DashboardOverview | null>(null);
  const [selectedCycle, setSelectedCycle] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);

  const loadCycles = async () => {
    try {
      const response = await apiFetch('/cycles');
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setCycles(result.data);
      if (!selectedCycle && result.data.length > 0) setSelectedCycle(result.data[0].code);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tải kỳ hoạt động');
    }
  };

  const loadSummaries = async (cycleId: string) => {
    setLoading(true);
    try {
      const response = await apiFetch(`/allowance-summaries?cycleId=${encodeURIComponent(cycleId)}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setSummaries(result.data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tải bảng phụ cấp');
    } finally {
      setLoading(false);
    }
  };

  const loadDashboard = async (cycleId?: string) => {
    try {
      const query = cycleId ? `?cycleId=${encodeURIComponent(cycleId)}` : '';
      const response = await apiFetch(`/dashboard/overview${query}`);
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setDashboard(result.data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tải dashboard');
    }
  };

  useEffect(() => {
    loadCycles();
  }, []);

  useEffect(() => {
    if (selectedCycle) {
      loadSummaries(selectedCycle);
      loadDashboard(selectedCycle);
    }
  }, [selectedCycle]);

  const selectedCycleData = cycles.find((cycle) => cycle.code === selectedCycle);
  const totalAmount = useMemo(
    () => summaries.reduce((total, summary) => total + summary.finalAmount, 0),
    [summaries]
  );
  const averageScore = summaries.length
    ? summaries.reduce((total, summary) => total + summary.totalScore, 0) / summaries.length
    : 0;

  const createCycle = async (values: CycleFormValues) => {
    try {
      const response = await apiFetch('/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: values.code,
          name: values.name,
          // Send calendar dates in UTC so the backend does not shift the quarter
          // boundary when the browser is running in a positive timezone.
          year: values.year,
          quarter: values.quarter,
          pointRate: values.pointRate || 0,
          baseAllowance: values.baseAllowance || 0
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã tạo quý mentoring');
      form.resetFields();
      await loadCycles();
      setSelectedCycle(result.data.code);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tạo kỳ hoạt động');
    }
  };

  const calculate = async () => {
    if (!selectedCycle) return;
    const response = await apiFetch(`/cycles/${selectedCycle}/calculate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pointRate: selectedCycleData?.pointRate || 0,
        baseAllowance: selectedCycleData?.baseAllowance || 0
      })
    });
    const result = await response.json();
    if (!result.success) {
      message.error(result.message);
      return;
    }
    message.success(`Đã tổng hợp ${result.count} mentee`);
    await loadSummaries(selectedCycle);
    await loadDashboard(selectedCycle);
    await loadCycles();
  };

  const lockCycle = async () => {
    if (!selectedCycle) return;
    const response = await apiFetch(`/cycles/${selectedCycle}/lock`, { method: 'PATCH' });
    const result = await response.json();
    if (!result.success) {
      message.error(result.message);
      return;
    }
    message.success('Đã khóa kỳ tính điểm');
    await loadSummaries(selectedCycle);
    await loadDashboard(selectedCycle);
    await loadCycles();
  };

  const unlockCycle = async () => {
    if (!selectedCycle) return;
    try {
      const response = await apiFetch(`/cycles/${encodeURIComponent(selectedCycle)}/unlock`, { method: 'PATCH' });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã mở khóa quý để test tạo lịch mentoring');
      await loadCycles();
      await loadSummaries(selectedCycle);
      await loadDashboard(selectedCycle);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể mở khóa quý');
    }
  };

  const importUsers = async (file: File) => {
    setImportLoading(true);
    try {
      if (!getAuthToken()) {
        throw new Error('Phiên đăng nhập Admin không tồn tại. Vui lòng đăng nhập lại.');
      }
      const body = new FormData();
      body.append('file', file);
      const response = await apiFetch('/users/import', { method: 'POST', body });
      const result = await response.json();
      if (response.status === 401) {
        throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
      }
      if (response.status === 403) {
        throw new Error('Tài khoản hiện tại không có quyền Admin để import dữ liệu.');
      }
      if (!result.success) throw new Error(result.message);
      const summary = result.data;
      message.success(`Đã tạo ${summary.imported}, cập nhật ${summary.updated}, lỗi ${summary.failed}`);
      if (summary.errors?.length) {
        Modal.warning({
          title: 'Import hoàn tất nhưng có dòng lỗi',
          content: <div className="max-h-60 overflow-auto">{summary.errors.map((item: { row: number; message: string }) => <div key={item.row}>Dòng {item.row}: {item.message}</div>)}</div>
        });
      }
      setImportOpen(false);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể import dữ liệu');
    } finally {
      setImportLoading(false);
    }
  };

  const downloadUserTemplate = async () => {
    try {
      const response = await apiFetch('/users/import-template.xlsx');
      if (!response.ok) throw new Error('Không thể tải file mẫu');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'hlc-users-template.xlsx';
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tải file mẫu');
    }
  };

  const awardRolePoints = async () => {
    if (!selectedCycle) return;
    try {
      const response = await apiFetch(`/cycles/${selectedCycle}/role-points`, { method: 'POST' });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success(`Đã cộng điểm chức vụ cho ${result.data.count} mentee`);
      await loadDashboard(selectedCycle);
      await loadSummaries(selectedCycle);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể cộng điểm chức vụ');
    }
  };

  const awardTopThree = async () => {
    if (!selectedCycle) return;
    try {
      const response = await apiFetch(`/cycles/${selectedCycle}/top-three-awards`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points: [5, 3, 2] })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success(`Đã xếp hạng ${result.data.length} cặp mentoring`);
      await loadSummaries(selectedCycle);
      await loadDashboard(selectedCycle);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể xếp hạng top 3');
    }
  };

  const downloadExcel = () => {
    if (!selectedCycle) return;
    apiFetch(`/allowance-summaries/export.xlsx?cycleId=${encodeURIComponent(selectedCycle)}`)
      .then((response) => response.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hlc-allowance-${selectedCycle}.xlsx`;
        link.click();
        URL.revokeObjectURL(url);
      })
      .catch(() => message.error('Không thể xuất file Excel'));
  };

  const downloadMonthlyReport = async () => {
    if (!selectedCycle) return;
    try {
      const response = await apiFetch(`/monthly-reports/export.xlsx?cycleId=${encodeURIComponent(selectedCycle)}`);
      if (!response.ok) throw new Error('Không thể xuất báo cáo cuối tháng');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `hlc-monthly-report-${selectedCycle}.xlsx`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể xuất báo cáo cuối tháng');
    }
  };

  const columns = [
    { title: 'STT', render: (_value: unknown, _record: AllowanceSummary, index: number) => index + 1, width: 60 },
    { title: 'Mã mentee', dataIndex: 'userId' },
    { title: 'Họ và tên', render: (record: AllowanceSummary) => record.user?.fullName || 'Chưa có dữ liệu' },
    { title: 'Tổng điểm', dataIndex: 'totalScore', sorter: (a: AllowanceSummary, b: AllowanceSummary) => a.totalScore - b.totalScore },
    { title: 'Đơn giá', dataIndex: 'pointRate', render: (value: number) => `${value.toLocaleString('vi-VN')} đ` },
    { title: 'Tổng tiền', dataIndex: 'finalAmount', render: (value: number) => `${value.toLocaleString('vi-VN')} đ` },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      render: (status: string) => <Tag color={status === 'LOCKED' ? 'green' : 'blue'}>{status}</Tag>
    }
  ];

  const topMenteeColumns = [
    { title: 'Mã mentee', dataIndex: 'userId' },
    { title: 'Họ và tên', dataIndex: 'fullName' },
    { title: 'Vị trí', dataIndex: 'position' },
    { title: 'Tổng điểm', dataIndex: 'totalScore' },
    { title: 'Tổng tiền', dataIndex: 'finalAmount', render: (value: number) => `${value.toLocaleString('vi-VN')} đ` }
  ];

  const topPairColumns = [
    { title: 'Pair', dataIndex: 'pairId' },
    { title: 'Mentor', dataIndex: 'mentorId' },
    { title: 'Mentee', dataIndex: 'menteeId' },
    { title: 'Đánh giá', dataIndex: 'rating', render: (value: number | undefined) => value ? `${value}/5` : 'Chưa chấm' },
    { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={value === 'ACTIVE' ? 'green' : 'gold'}>{value || 'ACTIVE'}</Tag> }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-800">Báo cáo & phụ cấp</h1>
        <Space wrap>
          <Select
            value={selectedCycle}
            placeholder="Chọn kỳ hoạt động"
            style={{ minWidth: 220 }}
            onChange={setSelectedCycle}
            options={cycles.map((cycle) => ({
              value: cycle.code,
              label: `${cycle.name} - ${statusLabels[cycle.status]}`
            }))}
          />
          <Button icon={<PlayCircleOutlined />} onClick={calculate} disabled={!selectedCycle}>
            Tính điểm
          </Button>
          <Button icon={<TrophyOutlined />} onClick={awardRolePoints} disabled={!selectedCycle}>
            Cộng điểm chức vụ
          </Button>
          <Button icon={<CrownOutlined />} onClick={awardTopThree} disabled={!selectedCycle}>
            Xếp hạng top 3 cặp
          </Button>
          <Button icon={<LockOutlined />} onClick={lockCycle} disabled={!selectedCycle || selectedCycleData?.status === 'LOCKED'}>
            Khóa kỳ
          </Button>
          <Button onClick={unlockCycle} disabled={selectedCycleData?.status !== 'LOCKED'}>
            Mở khóa quý
          </Button>
          <Button type="primary" icon={<DownloadOutlined />} onClick={downloadExcel} disabled={!selectedCycle}>
            Xuất Excel
          </Button>
          <Button icon={<DownloadOutlined />} onClick={downloadMonthlyReport} disabled={!selectedCycle}>
            Xuất báo cáo cuối tháng
          </Button>
          <Button icon={<PlusOutlined />} onClick={() => setImportOpen(true)}>
            Nhập dữ liệu Excel
          </Button>
        </Space>
      </div>

      <Modal title="Nhập dữ liệu Mentor/Mentee" open={importOpen} onCancel={() => setImportOpen(false)} footer={null} destroyOnHidden>
        <Typography.Paragraph type="secondary">
          File nguồn cần đúng các cột: HLC ID (Nhập tay), HỌ VÀ TÊN, SĐT, EMAIL, SỐ TÀI KHOẢN, NGÂN HÀNG (Chọn list), NGÀY SINH, DIỆN HỖ TRỢ SINH HOẠT PHÍ, Trạng thái hoạt động (Chọn list), THỜI GIAN GIA NHẬP HLC (Chọn ngày), THỜI GIAN BẮT ĐẦU NHẬN TRỢ CẤP (Chọn ngày).
        </Typography.Paragraph>
        <Button type="link" className="px-0" onClick={downloadUserTemplate}>Tải file mẫu (.xlsx)</Button>
        <Upload.Dragger
          accept=".xlsx,.csv"
          multiple={false}
          showUploadList={false}
          beforeUpload={(file) => {
            void importUsers(file);
            return Upload.LIST_IGNORE;
          }}
          disabled={importLoading}
        >
          <p className="ant-upload-drag-icon"><InboxOutlined /></p>
          <p className="ant-upload-text">{importLoading ? 'Đang xử lý...' : 'Kéo thả file vào đây hoặc bấm để chọn'}</p>
          <p className="ant-upload-hint">Hỗ trợ .xlsx và .csv, tối đa 5MB</p>
        </Upload.Dragger>
      </Modal>

      <Card title="Tạo quý mentoring mới">
        <Form form={form} layout="vertical" onFinish={createCycle}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <Form.Item name="year" label="Năm" initialValue={new Date().getFullYear()} rules={[{ required: true, message: 'Nhập năm' }]}>
              <InputNumber min={2020} max={2100} className="w-full" />
            </Form.Item>
            <Form.Item name="quarter" label="Quý" rules={[{ required: true, message: 'Chọn quý' }]}>
              <Select options={[1, 2, 3, 4].map((value) => ({ value, label: `Quý ${value} (${value === 1 ? 'Tháng 1 - 3' : value === 2 ? 'Tháng 4 - 6' : value === 3 ? 'Tháng 7 - 9' : 'Tháng 10 - 12'})` }))} />
            </Form.Item>
            <Form.Item name="name" label="Tên quý" rules={[{ required: true, message: 'Nhập tên quý' }]}>
              <Input placeholder="Quý 4/2026" />
            </Form.Item>
            <Form.Item label="Đơn giá / điểm">
              <Space.Compact className="w-full">
                <Form.Item name="pointRate" noStyle initialValue={0}>
                  <InputNumber min={0} className="w-full" />
                </Form.Item>
                <span className="flex items-center border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500">đ</span>
              </Space.Compact>
            </Form.Item>
            <Form.Item label="Phụ cấp cơ bản">
              <Space.Compact className="w-full">
                <Form.Item name="baseAllowance" noStyle initialValue={0}>
                  <InputNumber min={0} className="w-full" />
                </Form.Item>
                <span className="flex items-center border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500">đ</span>
              </Space.Compact>
            </Form.Item>
          </div>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Tạo kỳ</Button>
        </Form>
      </Card>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card><Statistic title="Số mentee" value={dashboard?.metrics.totalMentees ?? summaries.length} /></Card>
        <Card><Statistic title="Số mentor" value={dashboard?.metrics.totalMentors ?? 0} /></Card>
        <Card><Statistic title="Số cặp" value={dashboard?.metrics.totalPairs ?? 0} /></Card>
        <Card><Statistic title="Tổng phụ cấp dự kiến" value={totalAmount} suffix="đ" /></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card><Statistic title="Bài đã nộp" value={dashboard?.metrics.submittedItems ?? 0} /></Card>
        <Card><Statistic title="Bài được duyệt" value={dashboard?.metrics.approvedItems ?? 0} /></Card>
        <Card><Statistic title="Điểm trung bình" value={averageScore} precision={2} /></Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Top mentee">
          <Table rowKey="userId" columns={topMenteeColumns} dataSource={dashboard?.topMentees ?? []} pagination={false} />
        </Card>
        <Card title="Người cần cải thiện">
          <Table rowKey="userId" columns={[
            { title: 'Mã mentee', dataIndex: 'userId' },
            { title: 'Tổng điểm', dataIndex: 'totalScore' },
            { title: 'Tổng tiền', dataIndex: 'finalAmount', render: (value: number) => `${value.toLocaleString('vi-VN')} đ` }
          ]} dataSource={dashboard?.needsImprovement ?? []} pagination={false} />
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card title="Top cặp mentoring">
          <Table rowKey="pairId" columns={topPairColumns} dataSource={dashboard?.topPairs ?? []} pagination={false} />
        </Card>
        <Card title="Tình trạng quỹ HLC">
          <div className="space-y-2">
            {Object.entries(dashboard?.metrics.fundStatus ?? {}).map(([key, value]) => (
              <div key={key} className="flex justify-between border-b pb-2 text-sm">
                <span>{key}</span>
                <Tag color={key === 'APPROVED' ? 'green' : key === 'REJECTED' ? 'red' : 'gold'}>{value}</Tag>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title={selectedCycleData ? `Chi tiết phụ cấp - ${selectedCycleData.name}` : 'Chi tiết phụ cấp'}>
        <Table rowKey="_id" columns={columns} dataSource={summaries} loading={loading} pagination={{ pageSize: 20 }} />
      </Card>
    </div>
  );
}
