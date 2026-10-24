'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Checkbox, Form, Input, InputNumber, Modal, Popconfirm, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { errorMessage } from '@/lib/api';
import { ADMIN_SCOPE_LABEL, GLOBAL_PERMISSIONS, GROUP_KIND_LABEL, GROUP_PERMISSIONS, ROLE_APPLIES_LABEL, ROLE_PERMISSION_LABEL, roleApi, type GroupKind, type RoleAppliesTo, type RoleView } from '@/services/hlcApi';

/**
 * Vai trò = chức vụ + quyền hạn + điểm phụ cấp + điểm thưởng.
 * Gán vai trò cho ai thì người đó có ngay quyền và điểm tương ứng. Ngưỡng % thưởng đặt theo loại nhóm.
 */
export default function RolesPanel() {
  const { message } = App.useApp();
  const [roles, setRoles] = useState<RoleView[]>([]);
  const [thresholds, setThresholds] = useState<Record<GroupKind, number>>({ MENTEE: 90, FUND: 90 });
  const [editing, setEditing] = useState<RoleView | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const appliesTo = Form.useWatch('appliesTo', form) as RoleAppliesTo | undefined;
  const scopeKinds = (Form.useWatch('scopeKinds', form) as GroupKind[] | undefined) ?? [];

  const load = useCallback(async () => {
    try {
      const [list, values] = await Promise.all([roleApi.list(), roleApi.thresholds()]);
      setRoles(list);
      setThresholds(values);
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được vai trò'));
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const save = async (values: Partial<RoleView> & { globalPermissions?: string[] }) => {
    setSaving(true);
    try {
      const { globalPermissions, ...rest } = values;
      const body = {
        ...rest,
        permissions: [...(rest.permissions ?? []), ...(rest.appliesTo === 'BAN' ? globalPermissions ?? [] : [])],
        scopeKinds: rest.appliesTo === 'BAN' ? rest.scopeKinds ?? [] : []
      };
      await roleApi.save(body, editing && editing !== 'new' ? editing._id : undefined);
      message.success('Đã lưu vai trò');
      setEditing(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const saveThresholds = async () => {
    try {
      setThresholds(await roleApi.saveThresholds({ MENTEE: Number(thresholds.MENTEE), FUND: Number(thresholds.FUND) }));
      message.success('Đã lưu ngưỡng thưởng (áp dụng từ lần Tính lại tiếp theo)');
    } catch (error) {
      message.error(errorMessage(error));
    }
  };

  // Vai trò trong nhóm: chỉ quyền theo nhóm (chấm recap chỉ nhóm MTE).
  // Vai trò cấp ban: quyền cấp hệ thống + quyền theo nhóm áp dụng cho mọi nhóm của loại được chọn
  const groupPermissionOptions = GROUP_PERMISSIONS
    .filter((value) => (appliesTo === 'BAN' ? scopeKinds.includes('MENTEE') : appliesTo === 'MENTEE') || value !== 'SCORE_RECAP')
    .map((value) => ({ value, label: ROLE_PERMISSION_LABEL[value] }));
  const globalPermissionOptions = GLOBAL_PERMISSIONS.map((value) => ({ value, label: ROLE_PERMISSION_LABEL[value] }));

  const remove = async (row: RoleView) => {
    try {
      const result = await roleApi.remove(row._id);
      message.success(result.mode === 'DELETE' ? `Đã xóa vai trò ${row.name}` : `Vai trò ${row.name} đã từng được gán: chuyển sang ngừng dùng để giữ lịch sử phụ cấp`);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    }
  };

  return (
    <div className="space-y-4">
      <Alert type="info" showIcon title="Gộp phân quyền và chức vụ" description="Mỗi vai trò thuộc một loại nhóm (nhóm MTE, nhóm HLC Fund) hoặc là chức vụ của ban. Gán vai trò cho ai (ở màn hình nhóm) thì người đó có ngay quyền hạn và điểm phụ cấp của vai trò; điểm thưởng được cộng khi tỷ lệ thành viên hoàn thành vượt ngưỡng của loại nhóm." />
      <Card size="small" title="Ngưỡng % thưởng theo loại nhóm">
        <Space wrap align="end">
          <div><div className="text-xs text-gray-500">Nhóm MTE: thưởng khi hoàn thành vượt</div><InputNumber<number> min={0} max={100} value={thresholds.MENTEE} onChange={(value) => setThresholds({ ...thresholds, MENTEE: value ?? 0 })} addonAfter="%" /></div>
          <div><div className="text-xs text-gray-500">Nhóm HLC Fund (MTO & thầy cô): vượt</div><InputNumber<number> min={0} max={100} value={thresholds.FUND} onChange={(value) => setThresholds({ ...thresholds, FUND: value ?? 0 })} addonAfter="%" /></div>
          <Button type="primary" onClick={saveThresholds}>Lưu ngưỡng</Button>
        </Space>
      </Card>
      <Card size="small" title="Vai trò" extra={<Button size="small" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ appliesTo: 'MENTEE', permissions: ['VIEW_PROGRESS'], allowancePoints: 0, bonusPoints: 0, isActive: true }); setEditing('new'); }}>Thêm vai trò</Button>}>
        <Table<RoleView>
          rowKey="_id"
          size="small"
          pagination={false}
          dataSource={roles}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Vai trò', render: (_: unknown, row: RoleView) => <div><strong>{row.name}</strong><div className="text-xs text-gray-400">{row.code}</div></div> },
            { title: 'Áp dụng cho', dataIndex: 'appliesTo', render: (value: RoleAppliesTo) => <Tag color={value === 'FUND' ? 'gold' : value === 'MENTEE' ? 'purple' : 'default'}>{ROLE_APPLIES_LABEL[value]}</Tag> },
            {
              title: 'Phạm vi · quyền hạn', render: (_: unknown, row: RoleView) => (
                <div className="flex max-w-md flex-wrap gap-1">
                  {row.appliesTo !== 'BAN' && <Tag color="cyan">Trong nhóm của mình</Tag>}
                  {row.appliesTo === 'BAN' && (row.scopeKinds ?? []).map((kind) => <Tag key={kind} color="cyan">Mọi {GROUP_KIND_LABEL[kind].toLowerCase()}</Tag>)}
                  {row.permissions.map((item) => <Tag key={item} color={GLOBAL_PERMISSIONS.includes(item) ? 'magenta' : undefined}>{ROLE_PERMISSION_LABEL[item] ?? item}</Tag>)}
                  {row.adminScope && <Tag color="red">{ADMIN_SCOPE_LABEL[row.adminScope] ?? row.adminScope}</Tag>}
                </div>
              )
            },
            { title: 'Phụ cấp', dataIndex: 'allowancePoints', align: 'right' as const, render: (value: number) => `${value} điểm` },
            { title: 'Thưởng', dataIndex: 'bonusPoints', align: 'right' as const, render: (value: number, row: RoleView) => row.appliesTo === 'BAN' ? '—' : `${value} điểm` },
            { title: 'Đang giữ', render: (_: unknown, row: RoleView) => <span>{row.activeHolderCount ?? 0} người<div className="text-xs text-gray-400">{row.assignmentCount} lần gán</div></span> },
            { title: '', dataIndex: 'isActive', render: (value: boolean) => value ? null : <Tag>Tắt</Tag> },
            {
              title: '', render: (_: unknown, row: RoleView) => (
                <Space size="small">
                  <Button size="small" onClick={() => { form.setFieldsValue({
                    ...row,
                    adminScope: row.adminScope ?? undefined,
                    scopeKinds: row.scopeKinds ?? [],
                    permissions: row.permissions.filter((item) => GROUP_PERMISSIONS.includes(item)),
                    globalPermissions: row.permissions.filter((item) => GLOBAL_PERMISSIONS.includes(item))
                  }); setEditing(row); }}>Sửa</Button>
                  {!row.isSystem && (
                    row.activeHolderCount
                      ? <Button size="small" danger disabled title={`Còn ${row.activeHolderCount} người đang giữ: gỡ chức vụ trước`}>Xóa</Button>
                      : <Popconfirm title={`Xóa vai trò ${row.name}?`} description={row.assignmentCount ? 'Đã từng gán: vai trò chuyển sang ngừng dùng để giữ lịch sử.' : 'Chưa từng gán: xóa hẳn.'} onConfirm={() => remove(row)}><Button size="small" danger>Xóa</Button></Popconfirm>
                  )}
                </Space>
              )
            }
          ]}
        />
      </Card>
      <Modal title={editing && editing !== 'new' ? `Sửa vai trò ${editing.code}` : 'Thêm vai trò'} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} confirmLoading={saving} width={620} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save}>
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <Form.Item name="code" label="Mã vai trò" rules={[{ required: editing === 'new', pattern: /^[A-Z0-9_]{2,50}$/, message: 'Chữ in hoa, số, dấu _' }]}><Input disabled={editing !== 'new'} placeholder="VD: THU_KY_NHOM" /></Form.Item>
            <Form.Item name="name" label="Tên vai trò" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item>
          </div>
          <Form.Item name="appliesTo" label="Loại nhóm áp dụng (bắt buộc)" rules={[{ required: true, message: 'Chọn loại nhóm' }]} extra="Vai trò của nhóm MTE không dùng được cho nhóm HLC Fund và ngược lại.">
            <Select disabled={editing !== 'new' && Boolean((editing as RoleView | null)?.assignmentCount)} options={Object.entries(ROLE_APPLIES_LABEL).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          {appliesTo === 'BAN' && (
            <Form.Item name="scopeKinds" label="Phạm vi theo loại nhóm (tùy chọn)" extra="Chọn loại nhóm thì quyền theo nhóm bên dưới áp dụng cho MỌI nhóm của loại đó (ví dụ Phó ban MTE duyệt mọi nhóm MTE). Chức vụ thuộc nhóm MTE không tự có quyền ở nhóm HLC Fund và ngược lại.">
              <Checkbox.Group options={(['MENTEE', 'FUND'] as GroupKind[]).map((kind) => ({ value: kind, label: `Mọi ${GROUP_KIND_LABEL[kind].toLowerCase()}` }))} />
            </Form.Item>
          )}
          {(appliesTo !== 'BAN' || scopeKinds.length > 0) && (
            <Form.Item name="permissions" label={appliesTo === 'BAN' ? 'Quyền theo nhóm (trong phạm vi đã chọn)' : 'Quyền hạn trong nhóm của mình'}>
              <Checkbox.Group options={groupPermissionOptions} />
            </Form.Item>
          )}
          {appliesTo === 'BAN' && (
            <Form.Item name="globalPermissions" label="Quyền tách riêng cấp hệ thống" extra="Chốt kỳ và sửa điểm luôn ghi nhật ký; không ai tự chấm / duyệt điểm của chính mình.">
              <Checkbox.Group options={globalPermissionOptions} />
            </Form.Item>
          )}
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <Form.Item name="allowancePoints" label="Điểm phụ cấp mặc định / tháng"><InputNumber<number> className="w-full" min={0} max={100} step={0.5} /></Form.Item>
            {appliesTo !== 'BAN' && <Form.Item name="bonusPoints" label="Điểm thưởng khi vượt ngưỡng %"><InputNumber<number> className="w-full" min={0} max={100} step={0.5} /></Form.Item>}
          </div>
          {appliesTo === 'BAN' && (
            <Form.Item name="adminScope" label="Quyền quản trị hệ thống (tùy chọn)">
              <Select allowClear options={Object.entries(ADMIN_SCOPE_LABEL).map(([value, label]) => ({ value, label }))} />
            </Form.Item>
          )}
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="sortOrder" label="Thứ tự hiển thị" extra="Số nhỏ hiện trước trong danh sách vai trò."><InputNumber<number> className="w-full" min={0} /></Form.Item>
          <Form.Item name="isActive" label="Đang dùng" valuePropName="checked"><Switch /></Form.Item>
          <Typography.Text type="secondary" className="text-xs">Thay đổi điểm có hiệu lực ở lần “Tính lại” tiếp theo của các kỳ chưa chốt.</Typography.Text>
        </Form>
      </Modal>
    </div>
  );
}
