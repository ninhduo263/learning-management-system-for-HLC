'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Checkbox, Drawer, Empty, Form, Grid, Input, InputNumber, Popconfirm, Segmented, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { errorMessage } from '@/lib/api';
import { ADMIN_SCOPE_LABEL, GLOBAL_PERMISSIONS, GROUP_KIND_LABEL, GROUP_PERMISSIONS, ROLE_APPLIES_LABEL, ROLE_PERMISSION_LABEL, roleApi, type GroupKind, type RoleAppliesTo, type RoleView } from '@/services/hlcApi';

const APPLIES_COLOR: Record<RoleAppliesTo, string> = { MENTEE: 'purple', FUND: 'gold', BAN: 'blue' };

function useRoles() {
  const { message } = App.useApp();
  const [roles, setRoles] = useState<RoleView[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setRoles(await roleApi.list());
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được chức vụ'));
    } finally {
      setLoading(false);
    }
  }, [message]);
  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);
  return { roles, loading, load };
}

/** Bộ lọc dùng chung: tìm kiếm + loại nhóm + trạng thái */
function useRoleFilter(roles: RoleView[]) {
  const [keyword, setKeyword] = useState('');
  const [applies, setApplies] = useState<RoleAppliesTo | 'ALL'>('ALL');
  const [status, setStatus] = useState<'ACTIVE' | 'INACTIVE' | 'ALL'>('ACTIVE');
  const filtered = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return roles.filter((role) =>
      (applies === 'ALL' || role.appliesTo === applies) &&
      (status === 'ALL' || (status === 'ACTIVE' ? role.isActive : !role.isActive)) &&
      (!query || `${role.name} ${role.code} ${role.permissions.map((item) => ROLE_PERMISSION_LABEL[item] ?? item).join(' ')}`.toLowerCase().includes(query)));
  }, [roles, keyword, applies, status]);
  const toolbar = (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      <Input allowClear prefix={<SearchOutlined />} placeholder="Tìm chức vụ, mã, quyền" className="sm:!w-64" value={keyword} onChange={(event) => setKeyword(event.target.value)} />
      <Select className="sm:!w-56" value={applies} onChange={setApplies} options={[{ value: 'ALL', label: 'Mọi loại nhóm' }, ...Object.entries(ROLE_APPLIES_LABEL).map(([value, label]) => ({ value, label }))]} />
      <Segmented value={status} onChange={(value) => setStatus(value as typeof status)} options={[{ value: 'ACTIVE', label: 'Đang dùng' }, { value: 'INACTIVE', label: 'Ngừng' }, { value: 'ALL', label: 'Tất cả' }]} />
    </div>
  );
  return { filtered, toolbar };
}

/** Tag tự xuống dòng (không tràn khỏi thẻ trên điện thoại) */
const WRAP = '!m-0 !h-auto !max-w-full !whitespace-normal !break-words';
const permissionTags = (role: RoleView) => (
  <div className="flex min-w-0 flex-wrap gap-1">
    {role.appliesTo !== 'BAN' && <Tag className={WRAP} color="cyan">Trong nhóm của mình</Tag>}
    {role.appliesTo === 'BAN' && (role.scopeKinds ?? []).map((kind) => <Tag key={kind} className={WRAP} color="cyan">Mọi {GROUP_KIND_LABEL[kind].toLowerCase()}</Tag>)}
    {role.permissions.map((item) => <Tag key={item} className={WRAP} color={GLOBAL_PERMISSIONS.includes(item) ? 'magenta' : undefined}>{ROLE_PERMISSION_LABEL[item] ?? item}</Tag>)}
    {role.adminScope && <Tag className={WRAP} color="red">{ADMIN_SCOPE_LABEL[role.adminScope] ?? role.adminScope}</Tag>}
    {!role.permissions.length && !role.adminScope && role.appliesTo === 'BAN' && <Typography.Text type="secondary" className="text-xs">Chưa có quyền</Typography.Text>}
  </div>
);

/**
 * Chức vụ & quyền: bảng dễ đọc (chức vụ, áp dụng cho, quyền, số người giữ), tìm kiếm, lọc theo loại nhóm và trạng
 * thái. Thêm / sửa trong ngăn kéo bên phải (không chồng nhiều cửa sổ). Điểm theo chức vụ nằm ở màn hình riêng.
 */
export default function RolesPanel() {
  const { message } = App.useApp();
  const screens = Grid.useBreakpoint();
  const { roles, loading, load } = useRoles();
  const { filtered, toolbar } = useRoleFilter(roles);
  const [editing, setEditing] = useState<RoleView | 'new' | null>(null);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();
  const appliesTo = Form.useWatch('appliesTo', form) as RoleAppliesTo | undefined;
  const scopeKinds = (Form.useWatch('scopeKinds', form) as GroupKind[] | undefined) ?? [];

  const open = (role: RoleView | 'new') => {
    form.resetFields();
    if (role === 'new') form.setFieldsValue({ appliesTo: 'MENTEE', permissions: ['VIEW_PROGRESS'], allowancePoints: 0, bonusPoints: 0, isActive: true });
    else form.setFieldsValue({
      ...role,
      adminScope: role.adminScope ?? undefined,
      scopeKinds: role.scopeKinds ?? [],
      permissions: role.permissions.filter((item) => GROUP_PERMISSIONS.includes(item)),
      globalPermissions: role.permissions.filter((item) => GLOBAL_PERMISSIONS.includes(item))
    });
    setEditing(role);
  };

  const save = async (values: Partial<RoleView> & { globalPermissions?: string[] }) => {
    setSaving(true);
    try {
      const { globalPermissions, ...rest } = values;
      await roleApi.save({
        ...rest,
        permissions: [...(rest.permissions ?? []), ...(rest.appliesTo === 'BAN' ? globalPermissions ?? [] : [])],
        scopeKinds: rest.appliesTo === 'BAN' ? rest.scopeKinds ?? [] : []
      }, editing && editing !== 'new' ? editing._id : undefined);
      message.success('Đã lưu chức vụ');
      setEditing(null);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: RoleView) => {
    try {
      const result = await roleApi.remove(row._id);
      message.success(result.mode === 'DELETE' ? `Đã xóa ${row.name}` : `${row.name} đã từng được gán: chuyển sang ngừng dùng để giữ lịch sử phụ cấp`);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    }
  };

  const groupPermissionOptions = GROUP_PERMISSIONS
    .filter((value) => (appliesTo === 'BAN' ? scopeKinds.includes('MENTEE') : appliesTo === 'MENTEE') || value !== 'SCORE_RECAP')
    .map((value) => ({ value, label: ROLE_PERMISSION_LABEL[value] }));

  const actions = (row: RoleView) => (
    <Space size="small" wrap>
      <Button size="small" disabled={row.isModuleAdmin} onClick={() => open(row)}>Sửa</Button>
      {!row.isSystem && (row.activeHolderCount
        ? <Button size="small" danger disabled title={`Còn ${row.activeHolderCount} người đang giữ: gỡ chức vụ trước`}>Xóa</Button>
        : (
          <Popconfirm
            title={`Xóa chức vụ "${row.name}"?`}
            description={row.assignmentCount ? 'Đã từng gán: chức vụ chuyển sang ngừng dùng để giữ lịch sử phụ cấp.' : 'Chưa từng gán: xóa hẳn, không hoàn tác.'}
            okText="Xóa" okButtonProps={{ danger: true }} cancelText="Không"
            onConfirm={() => remove(row)}
          >
            <Button size="small" danger>Xóa</Button>
          </Popconfirm>
        ))}
    </Space>
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        {toolbar}
        <Button type="primary" icon={<PlusOutlined />} onClick={() => open('new')}>Thêm chức vụ</Button>
      </div>
      {screens.md ? (
        <Table<RoleView>
          rowKey="_id"
          size="middle"
          loading={loading}
          dataSource={filtered}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'Không có chức vụ khớp bộ lọc' }}
          columns={[
            { title: 'Chức vụ', width: 210, fixed: 'left' as const, render: (_: unknown, row: RoleView) => <div><strong>{row.name}</strong>{!row.isActive && <Tag className="!ml-2">Ngừng</Tag>}{row.isModuleAdmin && <Tag color="blue" className="!ml-2">Quản lý ở Học tập</Tag>}<div className="text-xs text-gray-400">{row.code}</div></div> },
            { title: 'Áp dụng cho', width: 160, render: (_: unknown, row: RoleView) => <Tag color={APPLIES_COLOR[row.appliesTo]} className={WRAP}>{ROLE_APPLIES_LABEL[row.appliesTo]}</Tag> },
            { title: 'Điểm', width: 110, render: (_: unknown, row: RoleView) => <span className="text-sm"><strong>{row.allowancePoints}</strong> phụ cấp{row.appliesTo !== 'BAN' && <div className="text-xs text-gray-500">+{row.bonusPoints} thưởng</div>}</span> },
            { title: 'Đang giữ', width: 90, render: (_: unknown, row: RoleView) => <span>{row.activeHolderCount ?? 0} người</span> },
            { title: 'Quyền', render: (_: unknown, row: RoleView) => <div className="min-w-[280px] max-w-lg">{permissionTags(row)}</div> },
            { title: '', width: 120, fixed: 'right' as const, render: (_: unknown, row: RoleView) => actions(row) }
          ]}
        />
      ) : (
        <div className="space-y-3">
          {!loading && !filtered.length && <Empty description="Không có chức vụ khớp bộ lọc" />}
          {filtered.map((row) => (
            <Card key={row._id} size="small">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><strong>{row.name}</strong>{!row.isActive && <Tag className="!ml-2">Ngừng</Tag>}<div className="text-xs text-gray-400">{row.code} · {row.activeHolderCount ?? 0} người đang giữ</div></div>
                <Tag color={APPLIES_COLOR[row.appliesTo]} className={`${WRAP} max-w-[45%] text-right`}>{ROLE_APPLIES_LABEL[row.appliesTo]}</Tag>
              </div>
              <div className="mt-2">{permissionTags(row)}</div>
              <div className="mt-2 text-sm">Phụ cấp <strong>{row.allowancePoints}</strong> điểm{row.appliesTo !== 'BAN' && <> · thưởng <strong>{row.bonusPoints}</strong></>}</div>
              <div className="mt-3">{actions(row)}</div>
            </Card>
          ))}
        </div>
      )}

      <Drawer
        title={editing && editing !== 'new' ? `Sửa chức vụ: ${editing.name}` : 'Thêm chức vụ'}
        open={Boolean(editing)}
        onClose={() => setEditing(null)}
        size={screens.md ? 560 : '100%'}
        destroyOnHidden
        extra={<Button type="primary" loading={saving} onClick={() => form.submit()}>Lưu</Button>}
      >
        <Form form={form} name="role" layout="vertical" onFinish={save}>
          <div className="grid grid-cols-1 gap-x-3 sm:grid-cols-2">
            <Form.Item name="code" label="Mã" rules={[{ required: editing === 'new', pattern: /^[A-Z0-9_]{2,50}$/, message: 'Chữ in hoa, số, dấu _' }]}><Input disabled={editing !== 'new'} placeholder="VD: THU_KY_NHOM" /></Form.Item>
            <Form.Item name="name" label="Tên chức vụ" rules={[{ required: true, message: 'Nhập tên' }]}><Input /></Form.Item>
          </div>
          <Form.Item name="appliesTo" label="Áp dụng cho" rules={[{ required: true, message: 'Chọn loại nhóm' }]} extra="Chức vụ của nhóm MTE không dùng được cho nhóm HLC Fund và ngược lại.">
            <Select disabled={editing !== 'new' && Boolean((editing as RoleView | null)?.assignmentCount)} options={Object.entries(ROLE_APPLIES_LABEL).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          {appliesTo === 'BAN' && (
            <Form.Item name="scopeKinds" label="Phạm vi theo loại nhóm" extra="Quyền theo nhóm áp dụng cho MỌI nhóm của loại được chọn.">
              <Checkbox.Group options={(['MENTEE', 'FUND'] as GroupKind[]).map((kind) => ({ value: kind, label: `Mọi ${GROUP_KIND_LABEL[kind].toLowerCase()}` }))} />
            </Form.Item>
          )}
          {(appliesTo !== 'BAN' || scopeKinds.length > 0) && (
            <Form.Item name="permissions" label={appliesTo === 'BAN' ? 'Quyền theo nhóm (trong phạm vi đã chọn)' : 'Quyền trong nhóm của mình'}>
              <Checkbox.Group className="flex flex-col gap-1" options={groupPermissionOptions} />
            </Form.Item>
          )}
          {appliesTo === 'BAN' && (
            <>
              <Form.Item name="globalPermissions" label="Quyền cấp hệ thống" extra="Chốt kỳ, sửa điểm luôn ghi nhật ký; không ai tự duyệt điểm của chính mình.">
                <Checkbox.Group className="flex flex-col gap-1" options={GLOBAL_PERMISSIONS.map((value) => ({ value, label: ROLE_PERMISSION_LABEL[value] }))} />
              </Form.Item>
              <Form.Item name="adminScope" label="Quyền quản trị (tùy chọn)">
                <Select allowClear options={Object.entries(ADMIN_SCOPE_LABEL).map(([value, label]) => ({ value, label }))} />
              </Form.Item>
            </>
          )}
          <Alert className="!mb-3" type="info" showIcon title="Điểm phụ cấp và thưởng chỉnh ở tab “Điểm chức vụ”." />
          <Form.Item name="description" label="Mô tả"><Input.TextArea rows={2} /></Form.Item>
          <div className="grid grid-cols-2 gap-x-3">
            <Form.Item name="sortOrder" label="Thứ tự hiển thị"><InputNumber<number> className="w-full" min={0} /></Form.Item>
            <Form.Item name="isActive" label="Đang dùng" valuePropName="checked"><Switch /></Form.Item>
          </div>
        </Form>
      </Drawer>
    </div>
  );
}

/**
 * Điểm theo chức vụ: mỗi chức vụ nhận bao nhiêu điểm phụ cấp / thưởng, ngưỡng % thưởng theo loại nhóm.
 * Sửa trực tiếp trên bảng; bấm lưu thì hiện bảng xác nhận các thay đổi (cũ → mới).
 */
export function RolePointsPanel() {
  const { message, modal } = App.useApp();
  const screens = Grid.useBreakpoint();
  const { roles, loading, load } = useRoles();
  const { filtered, toolbar } = useRoleFilter(roles.filter((role) => !role.isModuleAdmin));
  const [draft, setDraft] = useState<Record<string, { allowancePoints: number; bonusPoints: number }>>({});
  const [thresholds, setThresholds] = useState<Record<GroupKind, number>>({ MENTEE: 90, FUND: 90 });
  const [savedThresholds, setSavedThresholds] = useState<Record<GroupKind, number>>({ MENTEE: 90, FUND: 90 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    roleApi.thresholds().then((values) => { if (active) { setThresholds(values); setSavedThresholds(values); } }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  const value = (role: RoleView) => draft[role._id] ?? { allowancePoints: role.allowancePoints, bonusPoints: role.bonusPoints };
  const changes = roles.filter((role) => draft[role._id] && (draft[role._id].allowancePoints !== role.allowancePoints || draft[role._id].bonusPoints !== role.bonusPoints));
  const thresholdChanged = thresholds.MENTEE !== savedThresholds.MENTEE || thresholds.FUND !== savedThresholds.FUND;
  const setPoint = (role: RoleView, field: 'allowancePoints' | 'bonusPoints', next: number | null) =>
    setDraft((prev) => ({ ...prev, [role._id]: { ...value(role), [field]: next ?? 0 } }));

  const confirmSave = () => {
    modal.confirm({
      title: 'Xác nhận đổi điểm',
      width: 560,
      content: (
        <div className="space-y-1 text-sm">
          {changes.map((role) => (
            <div key={role._id}><strong>{role.name}</strong>: phụ cấp {role.allowancePoints} → {draft[role._id].allowancePoints}{role.appliesTo !== 'BAN' && `, thưởng ${role.bonusPoints} → ${draft[role._id].bonusPoints}`}</div>
          ))}
          {thresholdChanged && <div><strong>Ngưỡng thưởng</strong>: nhóm MTE {savedThresholds.MENTEE}% → {thresholds.MENTEE}%, nhóm HLC Fund {savedThresholds.FUND}% → {thresholds.FUND}%</div>}
          <div className="pt-2 text-gray-500">Áp dụng ở lần “Tính lại” tiếp theo của các kỳ chưa chốt. Kỳ đã chốt không đổi.</div>
        </div>
      ),
      okText: 'Lưu thay đổi',
      cancelText: 'Xem lại',
      onOk: async () => {
        setSaving(true);
        try {
          for (const role of changes)
            await roleApi.save({
              code: role.code, name: role.name, appliesTo: role.appliesTo, permissions: role.permissions, scopeKinds: role.scopeKinds,
              adminScope: role.adminScope, description: role.description, sortOrder: role.sortOrder, isActive: role.isActive,
              allowancePoints: draft[role._id].allowancePoints, bonusPoints: draft[role._id].bonusPoints
            }, role._id);
          if (thresholdChanged) {
            const next = await roleApi.saveThresholds({ MENTEE: Number(thresholds.MENTEE), FUND: Number(thresholds.FUND) });
            setThresholds(next);
            setSavedThresholds(next);
          }
          message.success('Đã lưu điểm theo chức vụ');
          setDraft({});
          await load();
        } catch (error) {
          message.error(errorMessage(error));
        } finally {
          setSaving(false);
        }
      }
    });
  };

  const pointInput = (role: RoleView, field: 'allowancePoints' | 'bonusPoints') => {
    const changed = draft[role._id] && draft[role._id][field] !== role[field];
    return (
      <InputNumber<number>
        min={0} max={100} step={0.5} size="small"
        className={changed ? '!border-orange-400 !w-24' : '!w-24'}
        value={value(role)[field]}
        onChange={(next) => setPoint(role, field, next)}
        aria-label={`${field === 'allowancePoints' ? 'Điểm phụ cấp' : 'Điểm thưởng'} ${role.name}`}
      />
    );
  };

  return (
    <div className="space-y-4">
      <Card size="small" title="Ngưỡng % để Leader / Phó nhóm nhận thưởng">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(['MENTEE', 'FUND'] as GroupKind[]).map((kind) => (
            <div key={kind} className="flex items-center justify-between gap-3 rounded-lg border border-gray-100 p-3">
              <span className="text-sm">{GROUP_KIND_LABEL[kind]}: thưởng khi tỷ lệ hoàn thành vượt</span>
              <Space.Compact>
                <InputNumber<number> min={0} max={100} value={thresholds[kind]} onChange={(next) => setThresholds({ ...thresholds, [kind]: next ?? 0 })} className={thresholds[kind] !== savedThresholds[kind] ? '!border-orange-400 !w-20' : '!w-20'} />
                <Button disabled>%</Button>
              </Space.Compact>
            </div>
          ))}
        </div>
      </Card>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        {toolbar}
        <Space wrap>
          {(changes.length > 0 || thresholdChanged) && <Button onClick={() => { setDraft({}); setThresholds(savedThresholds); }}>Bỏ thay đổi</Button>}
          <Button type="primary" disabled={!changes.length && !thresholdChanged} loading={saving} onClick={confirmSave}>
            Lưu thay đổi điểm{changes.length + (thresholdChanged ? 1 : 0) ? ` (${changes.length + (thresholdChanged ? 1 : 0)})` : ''}
          </Button>
        </Space>
      </div>
      {screens.md ? (
        <Table<RoleView>
          rowKey="_id"
          size="middle"
          loading={loading}
          dataSource={filtered}
          pagination={false}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Chức vụ', render: (_: unknown, row: RoleView) => <div><strong>{row.name}</strong><div className="text-xs text-gray-400">{row.activeHolderCount ?? 0} người đang giữ</div></div> },
            { title: 'Áp dụng cho', render: (_: unknown, row: RoleView) => <Tag color={APPLIES_COLOR[row.appliesTo]}>{ROLE_APPLIES_LABEL[row.appliesTo]}</Tag> },
            { title: 'Điểm phụ cấp / tháng', render: (_: unknown, row: RoleView) => pointInput(row, 'allowancePoints') },
            { title: 'Điểm thưởng khi vượt ngưỡng', render: (_: unknown, row: RoleView) => row.appliesTo === 'BAN' ? <Typography.Text type="secondary">Không áp dụng</Typography.Text> : pointInput(row, 'bonusPoints') }
          ]}
        />
      ) : (
        <div className="space-y-2">
          {filtered.map((row) => (
            <Card key={row._id} size="small">
              <div className="mb-2 flex items-start justify-between gap-2"><strong className="min-w-0">{row.name}</strong><Tag color={APPLIES_COLOR[row.appliesTo]} className={`${WRAP} max-w-[45%]`}>{ROLE_APPLIES_LABEL[row.appliesTo]}</Tag></div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span>Phụ cấp {pointInput(row, 'allowancePoints')}</span>
                {row.appliesTo !== 'BAN' && <span>Thưởng {pointInput(row, 'bonusPoints')}</span>}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
