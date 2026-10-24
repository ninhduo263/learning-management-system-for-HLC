'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Checkbox, DatePicker, Form, Input, Modal, Popconfirm, Select, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { errorMessage } from '@/lib/api';
import { getCurrentTime } from '@/utils/time';
import {
  DELEGATION_STATUS, GROUP_PERMISSIONS, ROLE_PERMISSION_LABEL, delegationApi, formatDate, groupApi, memberCrudApi,
  type DelegationView, type LeaderGroupAccess, type Member
} from '@/services/hlcApi';

type Values = { groupId: string; fromMemberId?: string; toMemberId: string; permissions: string[]; range: [Dayjs, Dayjs]; reason?: string };

/**
 * Ủy quyền tạm thời (ví dụ Leader vắng thì Phó nhóm thay): chọn người nhận, quyền, thời gian; tự hết hiệu lực
 * khi hết hạn; người nhận chỉ có quyền trong nhóm của người ủy quyền; thao tác làm thay ghi "làm thay cho".
 * mode "admin": tạo thay cho người ủy quyền ở mọi nhóm; mode "leader": chỉ nhóm mình đang có quyền.
 */
export default function DelegationPanel({ mode, myGroups = [] }: { mode: 'admin' | 'leader'; myGroups?: LeaderGroupAccess[] }) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<DelegationView[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [groups, setGroups] = useState<{ _id: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<Values>();
  const groupId = Form.useWatch('groupId', form);
  const ownGroups = mode === 'leader' ? myGroups.filter((group) => group.source !== 'DELEGATION') : [];
  const permissionOptions = (mode === 'leader'
    ? ownGroups.find((group) => group._id === groupId)?.permissions ?? []
    : GROUP_PERMISSIONS
  ).filter((item) => GROUP_PERMISSIONS.includes(item)).map((value) => ({ value, label: ROLE_PERMISSION_LABEL[value] ?? value }));

  const load = useCallback(async () => {
    try {
      const [list, all] = await Promise.all([delegationApi.list(), memberCrudApi.many({ status: 'ACTIVE' }, { memberCode: 1 }).catch(() => [] as Member[])]);
      setRows(list);
      setMembers(all);
      if (mode === 'admin') {
        setGroups((await groupApi.list()).filter((group) => group.isActive).map((group) => ({ _id: group._id, name: group.name })));
      }
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được ủy quyền'));
    }
  }, [message, mode]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const save = async (values: Values) => {
    setSaving(true);
    try {
      await delegationApi.create({
        groupId: values.groupId,
        fromMemberId: values.fromMemberId,
        toMemberId: values.toMemberId,
        permissions: values.permissions,
        startDate: values.range[0].format('YYYY-MM-DD'),
        endDate: values.range[1].format('YYYY-MM-DD'),
        reason: values.reason
      });
      message.success('Đã ủy quyền');
      setOpen(false);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const groupOptions = mode === 'leader' ? ownGroups.map((group) => ({ value: group._id, label: group.name })) : groups.map((group) => ({ value: group._id, label: group.name }));
  const memberOptions = members.map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName}` }));

  return (
    <div className="space-y-3">
      <Alert type="info" showIcon title="Ủy quyền có thời hạn" description="Người nhận chỉ có các quyền được chọn, trong nhóm của người ủy quyền, từ ngày bắt đầu đến hết ngày kết thúc; tự hết hiệu lực khi hết hạn. Mọi thao tác làm thay được ghi rõ “làm thay cho ai”." />
      <div className="flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} disabled={!groupOptions.length} onClick={() => { form.resetFields(); form.setFieldsValue({ range: [dayjs(getCurrentTime()), dayjs(getCurrentTime()).add(7, 'day')] }); setOpen(true); }}>Ủy quyền</Button>
      </div>
      <Table<DelegationView>
        rowKey="_id"
        size="small"
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        locale={{ emptyText: 'Chưa có ủy quyền' }}
        columns={[
          { title: 'Nhóm', render: (_: unknown, row: DelegationView) => row.group?.name ?? '—' },
          { title: 'Người ủy quyền', render: (_: unknown, row: DelegationView) => row.from?.fullName ?? '—' },
          { title: 'Người nhận', render: (_: unknown, row: DelegationView) => row.to?.fullName ?? '—' },
          { title: 'Quyền', render: (_: unknown, row: DelegationView) => <div className="flex max-w-xs flex-wrap gap-1">{row.permissions.map((item) => <Tag key={item}>{ROLE_PERMISSION_LABEL[item] ?? item}</Tag>)}</div> },
          { title: 'Thời gian', render: (_: unknown, row: DelegationView) => `${formatDate(row.startDate)} → ${formatDate(row.endDate)}` },
          { title: 'Lý do', dataIndex: 'reason' },
          { title: 'Trạng thái', render: (_: unknown, row: DelegationView) => <Tag color={DELEGATION_STATUS[row.status].color}>{DELEGATION_STATUS[row.status].label}</Tag> },
          {
            title: '', render: (_: unknown, row: DelegationView) => ['ACTIVE', 'UPCOMING'].includes(row.status) ? (
              <Popconfirm title="Thu hồi ủy quyền?" onConfirm={async () => { try { await delegationApi.revoke(row._id); message.success('Đã thu hồi'); await load(); } catch (error) { message.error(errorMessage(error)); } }}>
                <Button size="small" danger>Thu hồi</Button>
              </Popconfirm>
            ) : null
          }
        ]}
      />
      <Modal title="Ủy quyền tạm thời" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="groupId" label="Nhóm" rules={[{ required: true, message: 'Chọn nhóm' }]}><Select options={groupOptions} /></Form.Item>
          {mode === 'admin' && <Form.Item name="fromMemberId" label="Người ủy quyền (đang có quyền ở nhóm)" rules={[{ required: true, message: 'Chọn người ủy quyền' }]}><Select showSearch={{ optionFilterProp: 'label' }} options={memberOptions} /></Form.Item>}
          <Form.Item name="toMemberId" label="Người nhận ủy quyền" rules={[{ required: true, message: 'Chọn người nhận' }]}><Select showSearch={{ optionFilterProp: 'label' }} options={memberOptions} /></Form.Item>
          <Form.Item name="permissions" label="Quyền được ủy quyền" rules={[{ required: true, message: 'Chọn ít nhất 1 quyền' }]} extra={mode === 'leader' ? 'Chỉ giao được quyền bạn đang có trong nhóm.' : undefined}>
            <Checkbox.Group options={permissionOptions} />
          </Form.Item>
          <Form.Item name="range" label="Thời gian hiệu lực" rules={[{ required: true, message: 'Chọn thời gian' }]}><DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="reason" label="Lý do"><Input placeholder="VD: Leader đi công tác" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
