'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, DatePicker, Empty, Form, Grid, Input, Modal, Popconfirm, Select, Space, Table, Tabs, Tag, Typography } from 'antd';
import type { Dayjs } from 'dayjs';
import { useCatalog } from '@/components/CatalogSelect';
import { errorMessage } from '@/lib/api';
import { useAccess } from '@/lib/useAccess';
import { formatDateTime } from '@/services/mentoringApi';
import {
  DELEGATION_STATUS, PROFILE_CHANGE_STATUS, PROFILE_FIELD_LABEL, formatDate, memberDirectoryApi, profileApprovalApi,
  type DirectoryMember, type ProfileApprover, type ProfileChangeRequest
} from '@/services/hlcApi';

const SCOPE_LABEL: Record<string, string> = { ALL: 'Mọi thành viên', MENTEE: 'MTE', MENTOR: 'MTO' };

/** Duyệt thay đổi hồ sơ nhạy cảm (số tài khoản, ngân hàng, CCCD): Admin toàn cục và người được ủy quyền */
export default function ProfileApprovalsPage() {
  const { message } = App.useApp();
  const access = useAccess();
  const screens = Grid.useBreakpoint();
  const banks = useCatalog('BANK');
  const [status, setStatus] = useState('PENDING');
  const [rows, setRows] = useState<ProfileChangeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [denied, setDenied] = useState(false);
  const [rejecting, setRejecting] = useState<ProfileChangeRequest | null>(null);
  const [reason, setReason] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await profileApprovalApi.list(status));
    } catch (error) {
      if ((error as { status?: number }).status === 403) setDenied(true);
      else message.error(errorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [status, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const decide = async (row: ProfileChangeRequest, approve: boolean, note?: string) => {
    try {
      const result = await profileApprovalApi.decide(row._id, approve, note);
      message.success(approve ? `Đã duyệt${result.effectivePeriodCode ? `, ngân hàng áp dụng từ kỳ PC-${result.effectivePeriodCode}` : ''}` : 'Đã từ chối');
      setRejecting(null);
      setReason('');
      window.dispatchEvent(new Event('hlc-profile-request-change'));
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    }
  };

  const show = (field: string, value: string | null) => {
    if (!value) return <Typography.Text type="secondary">(trống)</Typography.Text>;
    if (field === 'bankCode') return banks.find((item) => item.code === value)?.shortName ?? value;
    return value;
  };
  const changes = (row: ProfileChangeRequest) => (
    <div className="space-y-1">
      {row.changes.filter((change) => change.field !== 'bankName').map((change) => (
        <div key={change.field} className="text-sm">
          <strong>{PROFILE_FIELD_LABEL[change.field] ?? change.field}: </strong>
          <span className="text-gray-500 line-through">{show(change.field, change.oldValue)}</span> → <span className="font-semibold text-green-700">{show(change.field, change.newValue)}</span>
        </div>
      ))}
    </div>
  );
  const actions = (row: ProfileChangeRequest) => row.status === 'PENDING' ? (
    <Space wrap>
      <Popconfirm title="Duyệt thay đổi này?" description="Thông tin mới thành chính thức; ngân hàng áp dụng theo kỳ (đang có kỳ chờ chi thì từ kỳ sau)." onConfirm={() => decide(row, true)}>
        <Button type="primary" size="small">Duyệt</Button>
      </Popconfirm>
      <Button danger size="small" onClick={() => { setReason(''); setRejecting(row); }}>Từ chối</Button>
    </Space>
  ) : (
    <div className="text-xs text-gray-500">
      {row.decidedByName && <div>{PROFILE_CHANGE_STATUS[row.status].label} bởi {row.decidedByName}{row.decidedAt ? ` · ${formatDateTime(row.decidedAt)}` : ''}</div>}
      {row.onBehalfOf && <div className="text-orange-600">Duyệt thay cho {row.onBehalfOf}</div>}
      {row.effectivePeriodCode && <div>Áp dụng từ kỳ PC-{row.effectivePeriodCode}</div>}
      {row.reason && <div>Lý do: {row.reason}</div>}
    </div>
  );

  if (denied) return <Card><Alert type="warning" showIcon title="Bạn chưa được giao quyền duyệt thay đổi hồ sơ" /></Card>;

  const list = screens.md ? (
    <Table<ProfileChangeRequest>
      rowKey="_id"
      size="small"
      loading={loading}
      dataSource={rows}
      scroll={{ x: 'max-content' }}
      locale={{ emptyText: status === 'PENDING' ? 'Không có thay đổi chờ duyệt' : 'Không có dữ liệu' }}
      columns={[
        { title: 'Thành viên', render: (_: unknown, row: ProfileChangeRequest) => <div><strong>{row.member?.fullName}</strong><div className="text-xs text-gray-500">{row.member?.memberCode} · {row.member?.memberType === 'MENTOR' ? 'MTO' : 'MTE'}</div></div> },
        { title: 'Giá trị cũ → mới', render: (_: unknown, row: ProfileChangeRequest) => changes(row) },
        { title: 'Gửi lúc', render: (_: unknown, row: ProfileChangeRequest) => formatDateTime(row.createdAt) },
        { title: 'Trạng thái', render: (_: unknown, row: ProfileChangeRequest) => <Tag color={PROFILE_CHANGE_STATUS[row.status].color}>{PROFILE_CHANGE_STATUS[row.status].label}</Tag> },
        { title: '', render: (_: unknown, row: ProfileChangeRequest) => actions(row) }
      ]}
    />
  ) : (
    // Điện thoại: mỗi yêu cầu là 1 thẻ, nút bấm đủ lớn
    <div className="space-y-3">
      {!loading && !rows.length && <Empty description={status === 'PENDING' ? 'Không có thay đổi chờ duyệt' : 'Không có dữ liệu'} />}
      {rows.map((row) => (
        <Card key={row._id} size="small" title={<span>{row.member?.fullName} <span className="text-xs font-normal text-gray-500">{row.member?.memberCode}</span></span>} extra={<Tag color={PROFILE_CHANGE_STATUS[row.status].color}>{PROFILE_CHANGE_STATUS[row.status].label}</Tag>}>
          {changes(row)}
          <div className="mt-2 text-xs text-gray-500">Gửi lúc {formatDateTime(row.createdAt)}</div>
          <div className="mt-3">{actions(row)}</div>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-4">
      <Typography.Title level={3} className="!mb-0">Duyệt thay đổi hồ sơ</Typography.Title>
      <Alert type="info" showIcon title="Chỉ số tài khoản, ngân hàng, số CCCD cần duyệt" description="Duyệt thì thông tin mới thành chính thức và các trang khác (bảng phụ cấp, file xuất) dùng theo; từ chối thì giữ thông tin cũ và người sửa thấy lý do. Không tự duyệt thay đổi của chính mình." />
      <Card>
        <Tabs items={[
          {
            key: 'requests', label: 'Yêu cầu', children: (
              <div className="space-y-3">
                <Select className="w-full sm:w-56" value={status} onChange={setStatus} options={[
                  { value: 'PENDING', label: 'Chờ duyệt' }, { value: 'APPROVED', label: 'Đã duyệt' }, { value: 'REJECTED', label: 'Bị từ chối' },
                  { value: 'CANCELLED', label: 'Đã hủy' }, { value: 'ALL', label: 'Tất cả' }
                ]} />
                {list}
              </div>
            )
          },
          ...(access?.isSuperAdmin ? [{ key: 'approvers', label: 'Ủy quyền duyệt', children: <ApproversPanel /> }] : [])
        ]} />
      </Card>
      <Modal title={rejecting ? `Từ chối thay đổi của ${rejecting.member?.fullName}` : ''} open={Boolean(rejecting)} onCancel={() => setRejecting(null)} okText="Từ chối" okButtonProps={{ danger: true, disabled: !reason.trim() }} onOk={() => rejecting && decide(rejecting, false, reason)} destroyOnHidden>
        <Input.TextArea rows={3} placeholder="Lý do từ chối (bắt buộc, người sửa sẽ thấy)" value={reason} onChange={(event) => setReason(event.target.value)} />
      </Modal>
    </div>
  );
}

/** Admin toàn cục chỉ định người duyệt thay: phạm vi (MTE / MTO / tất cả), thời hạn */
function ApproversPanel() {
  const { message } = App.useApp();
  const [rows, setRows] = useState<ProfileApprover[]>([]);
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<{ memberId: string; scope: string; range: [Dayjs, Dayjs]; note?: string }>();

  const load = useCallback(async () => {
    try {
      const [list, all] = await Promise.all([profileApprovalApi.approvers(), memberDirectoryApi.list()]);
      setRows(list);
      setMembers(all);
    } catch (error) {
      message.error(errorMessage(error));
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  return (
    <div className="space-y-3">
      <div className="flex justify-end"><Button type="primary" onClick={() => { form.resetFields(); form.setFieldsValue({ scope: 'ALL' }); setOpen(true); }}>Ủy quyền duyệt</Button></div>
      <Table<ProfileApprover> rowKey="_id" size="small" dataSource={rows} scroll={{ x: 'max-content' }} locale={{ emptyText: 'Chưa ủy quyền cho ai' }} columns={[
        { title: 'Người duyệt thay', render: (_: unknown, row: ProfileApprover) => row.member?.fullName ?? '—' },
        { title: 'Phạm vi', dataIndex: 'scope', render: (value: string) => SCOPE_LABEL[value] ?? value },
        { title: 'Thời hạn', render: (_: unknown, row: ProfileApprover) => `${formatDate(row.startDate)} → ${formatDate(row.endDate)}` },
        { title: 'Trạng thái', render: (_: unknown, row: ProfileApprover) => <Tag color={DELEGATION_STATUS[row.status].color}>{DELEGATION_STATUS[row.status].label}</Tag> },
        { title: '', render: (_: unknown, row: ProfileApprover) => ['ACTIVE', 'UPCOMING'].includes(row.status) ? <Popconfirm title="Thu hồi quyền duyệt?" onConfirm={async () => { try { await profileApprovalApi.revokeApprover(row._id); await load(); } catch (error) { message.error(errorMessage(error)); } }}><Button size="small" danger>Thu hồi</Button></Popconfirm> : null }
      ]} />
      <Modal title="Ủy quyền duyệt thay đổi hồ sơ" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} name="approver" layout="vertical" onFinish={async (values) => {
          try {
            await profileApprovalApi.addApprover({ memberId: values.memberId, scope: values.scope, startDate: values.range[0].format('YYYY-MM-DD'), endDate: values.range[1].format('YYYY-MM-DD'), note: values.note });
            message.success('Đã ủy quyền');
            setOpen(false);
            await load();
          } catch (error) {
            message.error(errorMessage(error));
          }
        }}>
          <Form.Item name="memberId" label="Người được ủy quyền" rules={[{ required: true, message: 'Chọn người' }]}><Select showSearch optionFilterProp="label" options={members.map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName}` }))} /></Form.Item>
          <Form.Item name="scope" label="Phạm vi" rules={[{ required: true }]}><Select options={Object.entries(SCOPE_LABEL).map(([value, label]) => ({ value, label }))} /></Form.Item>
          <Form.Item name="range" label="Thời hạn" rules={[{ required: true, message: 'Chọn thời hạn' }]}><DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" inputReadOnly /></Form.Item>
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
