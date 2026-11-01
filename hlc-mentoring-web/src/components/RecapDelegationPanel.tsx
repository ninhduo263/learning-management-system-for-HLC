'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Checkbox, DatePicker, Form, Input, Modal, Popconfirm, Select, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import dayjs, { type Dayjs } from 'dayjs';
import { errorMessage } from '@/lib/api';
import {
  RECAP_ACTION_LABEL, RECAP_DELEGATION_STATUS, formatDateTime, recapDelegationApi,
  type RecapDelegationAction, type RecapDelegationScope, type RecapDelegationView, type SessionView
} from '@/services/mentoringApi';
import { memberDirectoryApi } from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

interface Values {
  scopeType: RecapDelegationScope;
  scopeId: string;
  toMemberId: string;
  actions: RecapDelegationAction[];
  range: [Dayjs, Dayjs];
  reason: string;
}

/**
 * Ủy quyền duyệt hộ / nộp hộ recap MTO (chỉ Trưởng ban Mentoring và Admin toàn cục cấp). Mặc định MTE trong cặp,
 * Leader nhóm và Trưởng ban MTE chỉ XEM recap MTO; có ủy quyền (theo cặp hoặc nhóm, có thời hạn, lý do) mới duyệt / nộp hộ.
 */
export default function RecapDelegationPanel({ sessions }: { sessions: SessionView[] }) {
  const { message } = App.useApp();
  const [rows, setRows] = useState<RecapDelegationView[]>([]);
  const [groups, setGroups] = useState<{ _id: string; name: string }[]>([]);
  const [recipients, setRecipients] = useState<{ _id: string; memberCode: string; fullName: string }[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<Values>();
  const scopeType = Form.useWatch('scopeType', form) as RecapDelegationScope | undefined;
  const scopeId = Form.useWatch('scopeId', form) as string | undefined;

  const load = useCallback(async () => {
    try {
      setRows(await recapDelegationApi.list());
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được ủy quyền recap'));
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    memberDirectoryApi.groups().then((list) => { if (active) setGroups(list.filter((item) => item.groupKind === 'MENTEE')); }).catch(() => undefined);
    return () => { active = false; };
  }, [load]);

  useEffect(() => {
    if (!scopeType || !scopeId) return;
    let active = true;
    recapDelegationApi.eligible(scopeType, scopeId).then((list) => { if (active) setRecipients(list); }).catch(() => { if (active) setRecipients([]); });
    return () => { active = false; };
  }, [scopeType, scopeId]);

  const pairs = useMemo(() => {
    const seen = new Map<string, string>();
    for (const item of sessions)
      if (item.status === 'ACTIVE' && item.pair?.status === 'ACTIVE' && !seen.has(item.pair._id))
        seen.set(item.pair._id, `${item.pair.code}: ${item.mentor?.fullName ?? '—'} – ${item.mentee?.fullName ?? '—'}`);
    return [...seen.entries()].map(([value, label]) => ({ value, label }));
  }, [sessions]);

  const create = async (values: Values) => {
    setSaving(true);
    try {
      await recapDelegationApi.create({
        toMemberId: values.toMemberId,
        scopeType: values.scopeType,
        scopeId: values.scopeId,
        actions: values.actions,
        startDate: values.range[0].format('YYYY-MM-DD'),
        endDate: values.range[1].format('YYYY-MM-DD'),
        reason: values.reason
      });
      message.success('Đã cấp ủy quyền (có ghi nhật ký)');
      setOpen(false);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <Alert type="info" showIcon title="Mặc định chỉ Trưởng ban Mentoring và Admin toàn cục duyệt / nộp hộ recap MTO"
        description="MTE trong cặp, Leader nhóm và Trưởng ban MTE luôn XEM được recap MTO. Muốn họ duyệt hộ hoặc nộp hộ, hãy ủy quyền có phạm vi (một cặp hoặc một nhóm), thời hạn và lý do; hết hạn tự mất hiệu lực. Mọi thao tác làm thay đều ghi rõ “làm thay cho ai, theo ủy quyền của ai”. Nộp hộ recap MTE chỉ Trưởng ban Mentoring và Admin toàn cục." />
      <div className="flex justify-end">
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ scopeType: 'PAIR', actions: ['REVIEW'], range: [dayjs(getCurrentTime()), dayjs(getCurrentTime()).add(14, 'day')] }); setRecipients([]); setOpen(true); }}>Cấp ủy quyền</Button>
      </div>
      <Table<RecapDelegationView>
        rowKey="_id"
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10, hideOnSinglePage: true }}
        locale={{ emptyText: 'Chưa có ủy quyền nào' }}
        columns={[
          { title: 'Người nhận', render: (_: unknown, row: RecapDelegationView) => <div><strong>{row.to?.fullName ?? '—'}</strong><div className="text-xs text-gray-500">{row.to?.memberCode}</div></div> },
          { title: 'Phạm vi', render: (_: unknown, row: RecapDelegationView) => <div>{row.scope.label}{row.scope.mentor && <div className="text-xs text-gray-500">{row.scope.mentor.fullName} – {row.scope.mentee?.fullName}</div>}</div> },
          { title: 'Quyền', render: (_: unknown, row: RecapDelegationView) => <div className="flex flex-wrap gap-1">{row.actions.map((item) => <Tag key={item} className="!m-0">{RECAP_ACTION_LABEL[item]}</Tag>)}</div> },
          { title: 'Thời hạn', render: (_: unknown, row: RecapDelegationView) => `${row.startDate.split('-').reverse().join('/')} → ${row.endDate.split('-').reverse().join('/')}` },
          { title: 'Lý do', dataIndex: 'reason' },
          { title: 'Cấp bởi', render: (_: unknown, row: RecapDelegationView) => <div>{row.grantedByName}<div className="text-xs text-gray-500">{formatDateTime(row.createdAt)}</div></div> },
          { title: 'Trạng thái', render: (_: unknown, row: RecapDelegationView) => <Tag color={RECAP_DELEGATION_STATUS[row.status].color} className="!m-0">{RECAP_DELEGATION_STATUS[row.status].label}</Tag> },
          {
            title: '', render: (_: unknown, row: RecapDelegationView) => ['ACTIVE', 'UPCOMING'].includes(row.status) ? (
              <Popconfirm title="Thu hồi ủy quyền này?" okText="Thu hồi" cancelText="Không" onConfirm={async () => { try { await recapDelegationApi.revoke(row._id); message.success('Đã thu hồi'); await load(); } catch (error) { message.error(errorMessage(error)); } }}>
                <Button size="small" danger>Thu hồi</Button>
              </Popconfirm>
            ) : null
          }
        ]}
      />
      <Modal title="Cấp ủy quyền recap MTO" open={open} onCancel={() => setOpen(false)} onOk={() => form.submit()} okText="Cấp ủy quyền" cancelText="Hủy" confirmLoading={saving} width={620} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={create}>
          <Form.Item name="scopeType" label="Phạm vi ủy quyền" rules={[{ required: true }]}>
            <Select onChange={() => { form.setFieldsValue({ scopeId: undefined, toMemberId: undefined }); setRecipients([]); }}
              options={[{ value: 'PAIR', label: 'Một cặp mentoring (cho MTE trong cặp)' }, { value: 'GROUP', label: 'Một nhóm MTE (cho Leader / Phó nhóm hoặc Trưởng ban MTE)' }]} />
          </Form.Item>
          <Form.Item name="scopeId" label={scopeType === 'GROUP' ? 'Nhóm MTE' : 'Cặp mentoring'} rules={[{ required: true, message: 'Chọn phạm vi' }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} onChange={() => form.setFieldValue('toMemberId', undefined)}
              options={scopeType === 'GROUP' ? groups.map((item) => ({ value: item._id, label: item.name })) : pairs} />
          </Form.Item>
          <Form.Item name="toMemberId" label="Người nhận ủy quyền" rules={[{ required: true, message: 'Chọn người nhận' }]} extra="Chỉ hiện người đúng quan hệ với phạm vi đã chọn">
            <Select showSearch={{ optionFilterProp: 'label' }} disabled={!scopeId} options={recipients.map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName}` }))} />
          </Form.Item>
          <Form.Item name="actions" label="Quyền được ủy quyền" rules={[{ required: true, message: 'Chọn ít nhất một quyền' }]}>
            <Checkbox.Group options={(Object.keys(RECAP_ACTION_LABEL) as RecapDelegationAction[]).map((value) => ({ value, label: RECAP_ACTION_LABEL[value] }))} />
          </Form.Item>
          <Form.Item name="range" label="Thời hạn hiệu lực" rules={[{ required: true, message: 'Chọn thời hạn' }]}><DatePicker.RangePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="reason" label="Lý do ủy quyền" rules={[{ required: true, whitespace: true, message: 'Nhập lý do' }]}><Input.TextArea rows={3} placeholder="VD: Trưởng ban Mentoring đi công tác, ủy quyền duyệt recap tháng này" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
