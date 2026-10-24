'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, DatePicker, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tabs, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import GroupManager from '@/components/GroupManager';
import RolesPanel from '@/components/RolesPanel';
import ActivityLogPanel from '@/components/ActivityLogPanel';
import DelegationPanel from '@/components/DelegationPanel';
import SystemConfigPanel from '@/components/SystemConfigPanel';
import { useAccess } from '@/lib/useAccess';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import {
  SCOPE_LABEL, accessApi, departmentApi, formatDate, groupApi, learningApi, memberCrudApi, memberPositionApi, positionApi,
  type AdminScope, type Department, type LearningModule, type Member, type MemberPosition, type PermissionView, type Position
} from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

const DEPARTMENT_TYPE: Record<string, string> = { ACADEMIC: 'Học tập', FUND: 'HLC Fund', MENTORING: 'Mentoring', GROUP: 'Nhóm', OTHER: 'Khác' };

export default function AdminOrganizationPage() {
  const { message } = App.useApp();
  const access = useAccess();
  const [departments, setDepartments] = useState<Department[]>([]);
  const groupIds = new Set(departments.filter((item) => item.type === 'GROUP').map((item) => item._id));
  const [positions, setPositions] = useState<Position[]>([]);
  const [assignments, setAssignments] = useState<MemberPosition[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [permissions, setPermissions] = useState<PermissionView[]>([]);
  const [modules, setModules] = useState<LearningModule[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!access?.isSuperAdmin) return;
    try {
      const [nextDepartments, nextPositions, nextAssignments, nextMembers, nextPermissions, nextModules] = await Promise.all([
        departmentApi.many(undefined, { code: 1 }),
        positionApi.many(undefined, { sortOrder: 1 }),
        memberPositionApi.many(undefined, { startDate: -1 }),
        memberCrudApi.many(undefined, { memberCode: 1 }),
        accessApi.list(),
        learningApi.modules()
      ]);
      setDepartments(nextDepartments);
      setPositions(nextPositions);
      setAssignments(nextAssignments);
      setMembers(nextMembers);
      setPermissions(nextPermissions);
      setModules(nextModules);
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được dữ liệu tổ chức'));
    } finally {
      setLoading(false);
    }
  }, [message, access]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  if (!access) return null;
  // Trưởng ban MTE: chỉ quản lý các nhóm MTE (không xóa nhóm, không phân quyền)
  if (!access.isSuperAdmin)
    return (
      <div className="space-y-4">
        <Typography.Title level={3} className="!mb-0">Nhóm MTE</Typography.Title>
        <Card><GroupManager kind="MENTEE" canDelete={false} /></Card>
      </div>
    );

  return (
    <div className="space-y-4">
      <Typography.Title level={3} className="!mb-0">Tổ chức & phân quyền</Typography.Title>
      <Card loading={loading}>
        <Tabs items={[
          { key: 'mte', label: 'Nhóm MTE', children: <GroupManager kind="MENTEE" /> },
          { key: 'fund', label: 'Nhóm HLC Fund', children: <GroupManager kind="FUND" /> },
          { key: 'roles', label: 'Vai trò & điểm', children: <RolesPanel /> },
          { key: 'assign', label: 'Chức vụ ban', children: <AssignmentPanel assignments={assignments.filter((row) => !groupIds.has(row.departmentId))} members={members} departments={departments.filter((item) => item.type !== 'GROUP')} positions={positions.filter((item) => !(item as Position & { groupKind?: string | null }).groupKind)} onChanged={load} /> },
          { key: 'permission', label: 'Quyền module', children: <PermissionPanel permissions={permissions} members={members} modules={modules} onChanged={load} /> },
          { key: 'catalog', label: 'Danh sách ban', children: <CatalogPanel departments={departments.filter((item) => item.type !== 'GROUP')} onChanged={load} /> },
          { key: 'delegation', label: 'Ủy quyền', children: <DelegationPanel mode="admin" /> },
          { key: 'logs', label: 'Nhật ký', children: <ActivityLogPanel /> },
          { key: 'config', label: 'Cấu hình', children: <SystemConfigPanel /> }
        ]} />
      </Card>
    </div>
  );
}

function AssignmentPanel({ assignments, members, departments, positions, onChanged }: {
  assignments: MemberPosition[]; members: Member[]; departments: Department[]; positions: Position[]; onChanged: () => Promise<void>;
}) {
  const { message } = App.useApp();
  const [editing, setEditing] = useState<MemberPosition | 'new' | null>(null);
  const [showEnded, setShowEnded] = useState(false);
  const [ending, setEnding] = useState<MemberPosition | null>(null);
  const [endForm] = Form.useForm<{ endDate: Dayjs; reason?: string }>();
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const memberMap = useMemo(() => new Map(members.map((item) => [item._id, item])), [members]);
  const today = dayjs(getCurrentTime()).format('YYYY-MM-DD');
  const rows = assignments.filter((row) => showEnded || !row.endDate || row.endDate >= today);

  const save = async (values: { memberId: string; departmentId: string; positionId: string; startDate: Dayjs; endDate?: Dayjs; note?: string }) => {
    setSaving(true);
    try {
      const body = { ...values, startDate: values.startDate.format('YYYY-MM-DD'), endDate: values.endDate ? values.endDate.format('YYYY-MM-DD') : null };
      if (body.endDate && body.endDate < body.startDate) throw new Error('Ngày kết thúc phải sau ngày bắt đầu');
      if (editing && editing !== 'new') await memberPositionApi.update(editing._id, body);
      else await memberPositionApi.create(body);
      message.success('Đã lưu chức vụ');
      setEditing(null);
      await onChanged();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Alert type="info" showIcon title="Chức vụ của ban (không gắn nhóm), ví dụ Trưởng ban MTE, Trưởng ban HLC Fund, Kế toán. Quyền hạn và điểm phụ cấp lấy từ cấu hình vai trò (tab Vai trò & điểm). Leader / Phó nhóm gán ở màn hình từng loại nhóm." />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Space><Switch checked={showEnded} onChange={setShowEnded} /> Hiện cả chức vụ đã kết thúc</Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ startDate: dayjs(getCurrentTime()) }); setEditing('new'); }}>Gán chức vụ</Button>
      </div>
      <Table<MemberPosition>
        rowKey="_id"
        size="small"
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Thành viên', render: (_: unknown, row: MemberPosition) => <div><strong>{memberMap.get(row.memberId)?.fullName}</strong><div className="text-xs text-gray-500">{memberMap.get(row.memberId)?.memberCode}</div></div> },
          { title: 'Ban', render: (_: unknown, row: MemberPosition) => departments.find((item) => item._id === row.departmentId)?.name ?? '—' },
          { title: 'Chức vụ', render: (_: unknown, row: MemberPosition) => <Tag color="purple">{positions.find((item) => item._id === row.positionId)?.name ?? '—'}</Tag> },
          { title: 'Từ ngày', render: (_: unknown, row: MemberPosition) => formatDate(row.startDate) },
          { title: 'Đến ngày', render: (_: unknown, row: MemberPosition) => row.endDate ? formatDate(row.endDate) : <Tag color="green">Đang giữ</Tag> },
          { title: 'Ghi chú', dataIndex: 'note' },
          {
            title: '', render: (_: unknown, row: MemberPosition) => (
              <Space>
                <Button size="small" onClick={() => { form.setFieldsValue({ ...row, startDate: dayjs(row.startDate), endDate: row.endDate ? dayjs(row.endDate) : undefined }); setEditing(row); }}>Sửa</Button>
                {(!row.endDate || row.endDate >= today) && <Button size="small" danger onClick={() => { endForm.setFieldsValue({ endDate: dayjs(getCurrentTime()), reason: '' }); setEnding(row); }}>Gỡ chức vụ</Button>}
              </Space>
            )
          }
        ]}
      />
      <Modal title="Gỡ chức vụ" open={Boolean(ending)} onCancel={() => setEnding(null)} onOk={() => endForm.submit()} okText="Gỡ chức vụ" okButtonProps={{ danger: true }} destroyOnHidden>
        <Form form={endForm} layout="vertical" onFinish={async (values) => {
          if (!ending) return;
          try {
            await groupApi.endAssignment(ending._id, values.endDate.format('YYYY-MM-DD'), values.reason);
            message.success('Đã gỡ chức vụ (có nhật ký)');
            setEnding(null);
            await onChanged();
          } catch (error) {
            message.error(errorMessage(error));
          }
        }}>
          <Typography.Paragraph type="secondary">Ghi ngày kết thúc hiệu lực, không xóa lịch sử, để phụ cấp của kỳ vẫn tính đúng theo thời gian giữ chức.</Typography.Paragraph>
          <Form.Item name="endDate" label="Hiệu lực đến hết ngày" rules={[{ required: true, message: 'Chọn ngày' }]}><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="reason" label="Lý do"><Input /></Form.Item>
        </Form>
      </Modal>
      <Modal title={editing && editing !== 'new' ? 'Sửa chức vụ' : 'Gán chức vụ'} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="memberId" label="Thành viên" rules={[{ required: true }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} options={members.map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName}` }))} />
          </Form.Item>
          <Form.Item name="departmentId" label="Ban" rules={[{ required: true }]}><Select options={departments.filter((item) => item.isActive).map((item) => ({ value: item._id, label: item.name }))} /></Form.Item>
          <Form.Item name="positionId" label="Chức vụ" rules={[{ required: true }]}><Select options={positions.filter((item) => item.isActive).map((item) => ({ value: item._id, label: item.name }))} /></Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="startDate" label="Từ ngày" rules={[{ required: true }]}><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
            <Form.Item name="endDate" label="Đến ngày (trống = đang giữ)"><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
          </div>
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function PermissionPanel({ permissions, members, modules, onChanged }: { permissions: PermissionView[]; members: Member[]; modules: LearningModule[]; onChanged: () => Promise<void> }) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const scope = Form.useWatch('scope', form) as AdminScope | undefined;

  const grant = async (values: { account: string; scope: AdminScope; moduleId?: string; note?: string }) => {
    setSaving(true);
    try {
      await accessApi.grant(values);
      message.success('Đã giao quyền');
      setOpen(false);
      await onChanged();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Alert type="info" showIcon title="Quyền quản trị HLC Fund / Mentoring / Điểm nay gán bằng vai trò (ví dụ vai trò “Admin HLC Fund” ở tab Chức vụ ban). Tại đây chỉ còn cấp quyền quản lý từng module học tập; các quyền cũ vẫn hiển thị để thu hồi nếu cần." />
      <div className="flex justify-end"><Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); setOpen(true); }}>Giao quyền</Button></div>
      <Table<PermissionView>
        rowKey="_id"
        size="small"
        dataSource={permissions}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Người được giao', render: (_: unknown, row: PermissionView) => <div><strong>{row.member?.fullName ?? row.user?.fullname ?? row.user?.username}</strong><div className="text-xs text-gray-500">{row.member?.memberCode ?? row.user?.username}</div></div> },
          { title: 'Quyền', render: (_: unknown, row: PermissionView) => <Tag color="geekblue">{SCOPE_LABEL[row.scope]}</Tag> },
          { title: 'Module', render: (_: unknown, row: PermissionView) => row.module ? `${row.module.name} (${row.module.code})` : '—' },
          { title: 'Ghi chú', dataIndex: 'note' },
          { title: 'Giao lúc', render: (_: unknown, row: PermissionView) => formatDateTime(row.createdAt) },
          { title: '', render: (_: unknown, row: PermissionView) => <Popconfirm title="Thu hồi quyền này?" onConfirm={async () => { try { await accessApi.revoke(row._id); await onChanged(); } catch (error) { message.error(errorMessage(error)); } }}><Button size="small" danger>Thu hồi</Button></Popconfirm> }
        ]}
      />
      <Modal title="Giao quyền quản trị" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={grant}>
          <Form.Item name="account" label="Thành viên" rules={[{ required: true }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} options={members.filter((item) => item.userId).map((item) => ({ value: item.memberCode, label: `${item.memberCode} – ${item.fullName}` }))} placeholder="Chỉ hiện thành viên đã có tài khoản" />
          </Form.Item>
          <Form.Item name="scope" label="Quyền" rules={[{ required: true }]}><Select options={Object.entries(SCOPE_LABEL).filter(([value]) => value === 'LEARNING_MODULE').map(([value, label]) => ({ value, label }))} /></Form.Item>
          {scope === 'LEARNING_MODULE' && (
            <Form.Item name="moduleId" label="Module" rules={[{ required: true }]}><Select options={modules.map((item) => ({ value: item._id, label: item.name }))} /></Form.Item>
          )}
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

function CatalogPanel({ departments, onChanged }: { departments: Department[]; onChanged: () => Promise<void> }) {
  const { message } = App.useApp();
  const [editingDepartment, setEditingDepartment] = useState<Department | 'new' | null>(null);
  const [departmentForm] = Form.useForm();

  const save = async <T,>(action: () => Promise<T>, done: () => void) => {
    try {
      await action();
      message.success('Đã lưu');
      done();
      await onChanged();
    } catch (error) {
      message.error(errorMessage(error));
    }
  };

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card size="small" title="Ban" extra={<Button size="small" icon={<PlusOutlined />} onClick={() => { departmentForm.resetFields(); departmentForm.setFieldsValue({ type: 'OTHER', isActive: true }); setEditingDepartment('new'); }}>Thêm ban</Button>}>
        <Table<Department> rowKey="_id" size="small" pagination={false} dataSource={departments} columns={[
          { title: 'Mã', dataIndex: 'code' },
          { title: 'Tên', dataIndex: 'name' },
          { title: 'Loại', dataIndex: 'type', render: (value: string) => DEPARTMENT_TYPE[value] ?? value },
          { title: '', dataIndex: 'isActive', render: (value: boolean) => value ? <Tag color="green">Hoạt động</Tag> : <Tag>Ngừng</Tag> },
          { title: '', render: (_: unknown, row: Department) => <Button size="small" onClick={() => { departmentForm.setFieldsValue(row); setEditingDepartment(row); }}>Sửa</Button> }
        ]} />
      </Card>
      <Modal title={editingDepartment && editingDepartment !== 'new' ? 'Sửa ban' : 'Thêm ban'} open={Boolean(editingDepartment)} onCancel={() => setEditingDepartment(null)} onOk={() => departmentForm.submit()} destroyOnHidden>
        <Form form={departmentForm} layout="vertical" onFinish={(values) => save(() => (editingDepartment && editingDepartment !== 'new' ? departmentApi.update(editingDepartment._id, values) : departmentApi.create(values)), () => setEditingDepartment(null))}>
          <Form.Item name="code" label="Mã (VD: BAN_TRUYEN_THONG)" rules={[{ required: true, pattern: /^[A-Z0-9_]+$/, message: 'Chữ in hoa, số, _' }]}><Input disabled={Boolean(editingDepartment && editingDepartment !== 'new')} /></Form.Item>
          <Form.Item name="name" label="Tên" rules={[{ required: true }]}><Input /></Form.Item>
          <Form.Item name="type" label="Loại"><Select options={Object.entries(DEPARTMENT_TYPE).map(([value, label]) => ({ value, label }))} /></Form.Item>
          <Form.Item name="isActive" label="Hoạt động" valuePropName="checked"><Switch /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
