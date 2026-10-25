'use client';

import { useState } from 'react';
import { Alert, App, Button, Card, Dropdown, Form, Input, Modal, Space, Spin, Switch, Table, Tabs, Tag, Typography, Upload } from 'antd';
import { DownloadOutlined, InboxOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import AddMemberModal from '@/components/AddMemberModal';
import { useAccess } from '@/lib/useAccess';
import MemberEditModal from '@/components/MemberEditModal';
import ProfileLink from '@/components/ProfileLink';
import { memberCrudApi, memberExportApi, provinceNeedsReview, type Member } from '@/services/hlcApi';
import { errorMessage } from '@/lib/api';
import {
  ROLE_STATUS_COLOR,
  ROLE_STATUS_LABEL,
  memberApi,
  mentoringApi,
  type MemberView,
  type QuarterReport
} from '@/services/mentoringApi';
import PhoneLink from '@/components/PhoneLink';

const pad = (value: number) => String(value).padStart(2, '0');
type ReportRow = QuarterReport['rows'][number];

export default function AdminMembersPage() {
  const { message, modal } = App.useApp();
  const access = useAccess();
  const isSuperAdmin = Boolean(access?.isSuperAdmin);
  const [addOpen, setAddOpen] = useState(false);
  const [reportsVisible, setReportsVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<QuarterReport[]>([]);
  const [exporting, setExporting] = useState<string | null>(null);
  const [membersVisible, setMembersVisible] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);
  const [mentors, setMentors] = useState<MemberView[]>([]);
  const [mentees, setMentees] = useState<MemberView[]>([]);
  const [importing, setImporting] = useState(false);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);

  const loadReports = async () => {
    setLoading(true);
    try {
      const all = await mentoringApi.reports();
      setReports(all.filter((report) => report.rows.length && (report.quarter.hasEnded || report.hasImportedStatus)));
    } catch (error) {
      message.error(errorMessage(error, 'Không thể tải dữ liệu mentoring'));
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    setMembersLoading(true);
    try {
      const [mentorList, menteeList] = await Promise.all([mentoringApi.members('MENTOR'), mentoringApi.members('MENTEE')]);
      setMentors(mentorList);
      setMentees(menteeList);
    } catch (error) {
      message.error(errorMessage(error, 'Không thể tải danh sách thành viên'));
    } finally {
      setMembersLoading(false);
    }
  };

  const exportReport = async (report: QuarterReport) => {
    setExporting(report.quarter.code);
    try {
      await mentoringApi.exportReport(report);
    } catch (error) {
      message.error(errorMessage(error, 'Không thể xuất file báo cáo quý'));
    } finally {
      setExporting(null);
    }
  };

  const importMembers = async (file: File) => {
    setImporting(true);
    try {
      const result = await memberApi.importFile(file);
      modal.info({
        title: 'Kết quả import thành viên',
        width: 640,
        content: (
          <div>
            <p>Tạo mới {result.created}, cập nhật {result.updated}{result.failed ? `, lỗi ${result.failed} dòng` : ''}.</p>
            {result.errors.length > 0 && <ul className="ml-4 list-disc">{result.errors.slice(0, 30).map((item) => <li key={`${item.sheet}-${item.row}`}>{item.sheet} dòng {item.row}: {item.message}</li>)}</ul>}
          </div>
        )
      });
      if (membersVisible) await loadMembers();
    } catch (error) {
      message.error(errorMessage(error, 'Không thể import thành viên'));
    } finally {
      setImporting(false);
    }
  };

  const generateAccounts = async (values: { defaultPassword?: string }) => {
    setGenerating(true);
    try {
      const result = await memberApi.generateAccounts(values.defaultPassword || undefined);
      setAccountModalOpen(false);
      modal.success({
        title: 'Đã tạo tài khoản',
        width: 640,
        content: (
          <div>
            <p>Tạo mới {result.created.length}, liên kết tài khoản có sẵn {result.linked.length}, bỏ qua {result.skipped.length}.</p>
            <p>Tên đăng nhập là mã thành viên viết thường (ví dụ hlc-mte-00001); mật khẩu là ngày sinh dạng ddmmyyyy hoặc mật khẩu mặc định đã nhập.</p>
            {result.skipped.length > 0 && <ul className="ml-4 list-disc">{result.skipped.map((item) => <li key={item.memberCode}>{item.memberCode}: {item.reason}</li>)}</ul>}
          </div>
        )
      });
    } catch (error) {
      message.error(errorMessage(error, 'Không thể tạo tài khoản'));
    } finally {
      setGenerating(false);
    }
  };

  const renderReport = (report: QuarterReport) => (
    <Table<ReportRow>
      rowKey="key"
      dataSource={report.rows}
      loading={loading}
      scroll={{ x: 'max-content' }}
      pagination={{ pageSize: 20 }}
      columns={[
        { title: 'STT', dataIndex: 'serial', width: 65, render: (value: number | null) => value ?? '' },
        { title: 'QUÝ', width: 100, render: () => `Q${report.quarter.quarter}/${report.quarter.year}` },
        { title: 'CHỨC DANH', dataIndex: 'role', width: 110, render: (role: string) => <Tag color={role === 'MENTOR' ? 'blue' : 'green'}>{role === 'MENTOR' ? 'Mentor' : 'Mentee'}</Tag> },
        { title: 'THÀNH VIÊN', width: 250, render: (_: unknown, row: ReportRow) => <div><strong>{row.member?.fullName}</strong><div className="text-xs text-gray-500">{row.member?.memberCode}</div></div> },
        { title: 'PROFILE', width: 120, render: (_: unknown, row: ReportRow) => <ProfileLink url={row.member?.profileUrl ?? undefined} /> },
        ...report.quarter.months.map((month) => ({
          title: `${pad(month)}/${report.quarter.year}`,
          children: [
            { title: 'MÃ THEO THÁNG', width: 240, render: (_: unknown, row: ReportRow) => row.months[month]?.code || '—' },
            {
              title: 'TRẠNG THÁI',
              width: 120,
              render: (_: unknown, row: ReportRow) => {
                const cell = row.months[month];
                return cell ? <Tag color={ROLE_STATUS_COLOR[cell.status]}>{ROLE_STATUS_LABEL[cell.status]}</Tag> : '—';
              }
            }
          ]
        }))
      ]}
    />
  );

  const memberTable = (items: MemberView[]) => (
    <Table<MemberView>
      rowKey="_id"
      size="small"
      loading={membersLoading}
      dataSource={items}
      scroll={{ x: 'max-content' }}
      pagination={{ pageSize: 10 }}
      columns={[
        { title: 'STT', render: (_: unknown, _member: MemberView, index: number) => index + 1, width: 65 },
        { title: 'HỌ VÀ TÊN', dataIndex: 'fullName' },
        { title: 'HLC ID', dataIndex: 'memberCode' },
        { title: 'SỐ ĐIỆN THOẠI / ZALO', render: (_: unknown, row: MemberView) => <PhoneLink phone={row.phone} hidden={row.phoneHidden} /> },
        { title: 'EMAIL', dataIndex: 'email', render: (value?: string) => value || '—' },
        {
          title: 'HOẠT ĐỘNG',
          dataIndex: 'status',
          render: (value: string, member: MemberView) => (
            <Switch
              size="small"
              checked={value === 'ACTIVE'}
              checkedChildren="Bật"
              unCheckedChildren="Tắt"
              onChange={async (checked) => {
                try {
                  await memberCrudApi.update(member._id, { status: checked ? 'ACTIVE' : 'INACTIVE' });
                  message.success(checked ? 'Đã bật thành viên' : 'Đã tắt thành viên (không ghép cặp, không tính điểm)');
                  await loadMembers();
                } catch (error) {
                  message.error(errorMessage(error));
                }
              }}
            />
          )
        },
        { title: 'PROFILE', dataIndex: 'profileUrl', render: (value?: string) => <ProfileLink url={value} /> },
        { title: 'TỈNH, THÀNH', render: (_: unknown, member: MemberView) => provinceNeedsReview(member as unknown as Member) ? <Tag color="orange">Cần chọn lại tỉnh</Tag> : null },
        { title: '', render: (_: unknown, member: MemberView) => <Button size="small" onClick={() => setEditingMember(member._id)}>Sửa hồ sơ</Button> }
      ]}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Typography.Title level={3} className="!mb-0">Thành viên & báo cáo mentoring</Typography.Title>
        <Button type="primary" onClick={() => { const next = !reportsVisible; setReportsVisible(next); if (next) void loadReports(); }}>
          {reportsVisible ? 'Ẩn danh sách' : 'Xem danh sách'}
        </Button>
      </div>
      {!reportsVisible ? (
        <Card><Typography.Text type="secondary">Bấm “Xem danh sách” để tải báo cáo các quý đã kết thúc (hoặc có dữ liệu import).</Typography.Text></Card>
      ) : loading ? (
        <Card className="flex justify-center py-12"><Spin size="large" /></Card>
      ) : reports.length === 0 ? (
        <Card><Alert type="info" showIcon title="Chưa có báo cáo quý đã hoàn tất" /></Card>
      ) : (
        <Card title="Danh sách mentoring">
          <Tabs items={reports.map((report) => ({
            key: report.quarter.code,
            label: `Danh sách Quý ${report.quarter.quarter} - ${report.quarter.year}`,
            children: (
              <div className="space-y-3">
                <div className="flex justify-end">
                  <Button
                    type="primary"
                    disabled={!report.quarter.hasEnded || (exporting !== null && exporting !== report.quarter.code)}
                    loading={exporting === report.quarter.code}
                    onClick={() => exportReport(report)}
                  >
                    {report.quarter.hasEnded ? 'Xuất file .xlsx' : 'Xuất được sau khi quý kết thúc'}
                  </Button>
                </div>
                {renderReport(report)}
              </div>
            )
          }))} />
        </Card>
      )}

      <Card
        title="Danh sách thành viên"
        extra={(
          <Space wrap>
            <Upload accept=".xlsx,.xls,.csv" showUploadList={false} disabled={importing} beforeUpload={(file) => { void importMembers(file); return Upload.LIST_IGNORE; }}>
              <Button icon={<InboxOutlined />} loading={importing}>Import Excel thành viên</Button>
            </Upload>
            {isSuperAdmin && <Button type="primary" icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>Thêm thành viên</Button>}
            <Button icon={<UserAddOutlined />} onClick={() => setAccountModalOpen(true)}>Tạo tài khoản</Button>
            <Dropdown
              menu={{
                items: [
                  { key: 'MENTEE', label: 'Xuất danh sách Mentee (MTE)' },
                  { key: 'MENTOR', label: 'Xuất danh sách Mentor (MTO)' },
                  { key: 'ALL', label: 'Xuất cả MTE và MTO' }
                ],
                onClick: async ({ key }) => {
                  try {
                    await memberExportApi.download(key === 'ALL' ? undefined : (key as 'MENTEE' | 'MENTOR'));
                    message.success('Đã xuất file. Việc xuất được ghi vào nhật ký.');
                  } catch (error) {
                    message.error(errorMessage(error, 'Không xuất được danh sách'));
                  }
                }
              }}
            >
              <Button icon={<DownloadOutlined />}>Xuất xlsx đầy đủ</Button>
            </Dropdown>
            <Button type="primary" onClick={() => { const next = !membersVisible; setMembersVisible(next); if (next) void loadMembers(); }}>
              {membersVisible ? 'Ẩn danh sách thành viên' : 'Xem danh sách thành viên'}
            </Button>
          </Space>
        )}
      >
        {!membersVisible ? (
          <Typography.Text type="secondary">
            Bấm “Xem danh sách thành viên” để tải danh sách Mentor và Mentee. File import dùng các cột: HLC ID, HỌ VÀ TÊN, NGÀY SINH, SĐT, EMAIL, SỐ TÀI KHOẢN, NGÂN HÀNG, PROFILE…
          </Typography.Text>
        ) : (
          <Tabs items={[
            { key: 'mentees', label: `Danh sách Mentee (${mentees.length})`, children: memberTable(mentees) },
            { key: 'mentors', label: `Danh sách Mentor (${mentors.length})`, children: memberTable(mentors) }
          ]} />
        )}
      </Card>

      <AddMemberModal open={addOpen} onClose={() => setAddOpen(false)} onCreated={() => { if (membersVisible) void loadMembers(); }} />
      <MemberEditModal memberId={editingMember} onClose={() => setEditingMember(null)} onSaved={() => void loadMembers()} />

      <Modal title="Tạo tài khoản cho thành viên" open={accountModalOpen} onCancel={() => setAccountModalOpen(false)} footer={null} destroyOnHidden>
        <Form layout="vertical" onFinish={generateAccounts}>
          <Typography.Paragraph type="secondary">
            Tạo tài khoản cho mọi thành viên đang hoạt động chưa có tài khoản. Tên đăng nhập = mã thành viên viết thường, mật khẩu = ngày sinh (ddmmyyyy).
            Thành viên chưa có ngày sinh sẽ dùng mật khẩu mặc định bên dưới (để trống thì bỏ qua họ).
          </Typography.Paragraph>
          <Form.Item name="defaultPassword" label="Mật khẩu mặc định (tùy chọn, tối thiểu 8 ký tự)" rules={[{ min: 8, message: 'Tối thiểu 8 ký tự' }]}>
            <Input.Password autoComplete="new-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={generating}>Tạo tài khoản</Button>
        </Form>
      </Modal>
    </div>
  );
}
