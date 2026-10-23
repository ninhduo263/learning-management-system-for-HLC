'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Empty, Form, Input, Modal, Popconfirm, Select, Space, Switch, Table, Tabs, Tag, Typography } from 'antd';
import { HistoryOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import { errorMessage } from '@/lib/api';
import { GROUP_KIND_LABEL, formatDate, groupApi, memberCrudApi, type GroupHistory, type GroupKind, type GroupMember, type GroupView, type Member } from '@/services/hlcApi';

const typeTag = (type?: string) => <Tag color={type === 'MENTOR' ? 'blue' : 'green'}>{type === 'MENTOR' ? 'Mentor' : 'Mentee'}</Tag>;

/** Admin chia nhóm: mỗi nhóm 1 Leader + 1 Phó nhóm (mentee); mentor và mentee đều thuộc nhóm */
export default function GroupManager() {
  const { message } = App.useApp();
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [unassigned, setUnassigned] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<GroupView | 'new' | null>(null);
  const [adding, setAdding] = useState<GroupView | null>(null);
  const [addIds, setAddIds] = useState<string[]>([]);
  const [history, setHistory] = useState<{ group: GroupView; data: GroupHistory } | null>(null);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try {
      const [list, all, free] = await Promise.all([groupApi.list(), memberCrudApi.many({ status: 'ACTIVE' }, { memberCode: 1 }), groupApi.unassigned()]);
      setGroups(list);
      setMembers(all);
      setUnassigned(free);
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được danh sách nhóm'));
    } finally {
      setLoading(false);
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const run = async (action: () => Promise<unknown>, success: string) => {
    try {
      await action();
      message.success(success);
      await load();
      return true;
    } catch (error) {
      message.error(errorMessage(error));
      return false;
    }
  };

  const [kindFilter, setKindFilter] = useState<GroupKind | 'ALL'>('ALL');
  /** Nhóm hiện tại của thành viên trong cùng loại nhóm */
  const groupOf = (memberId: string, kind?: GroupKind) => groups.find((group) => (!kind || group.groupKind === kind) && group.members.some((item) => item._id === memberId));
  const memberTypeFor = (group: GroupView) => (group.groupKind === 'FUND' ? 'MENTOR' : 'MENTEE');
  const menteeOptions = members.filter((member) => member.memberType === 'MENTEE').map((member) => ({ value: member._id, label: `${member.memberCode} – ${member.fullName}${groupOf(member._id, 'MENTEE') ? ` (${groupOf(member._id, 'MENTEE')?.name})` : ''}` }));

  return (
    <div className="space-y-3">
      <Alert type="info" showIcon title="Có 2 loại nhóm, mỗi nhóm có 1 Leader và 1 Phó nhóm (là MTE)" description="Nhóm MTE gồm các mentee: Leader/Phó chấm recap MTE, theo dõi học tập và duyệt quỹ của nhóm. Nhóm HLC Fund gồm các MTO (và thầy cô ngoài danh sách): Leader/Phó quan sát, duyệt và nộp hộ minh chứng, nhưng không phải thành viên đóng quỹ. Leader 2 điểm, Phó 1 điểm mỗi tháng, +1 khi thành viên hoàn tất trên 90%. Chuyển nhóm hay đổi Leader đều được lưu lịch sử." />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Space wrap>
          <Select className="w-52" value={kindFilter} onChange={setKindFilter} options={[{ value: 'ALL', label: 'Tất cả loại nhóm' }, { value: 'MENTEE', label: GROUP_KIND_LABEL.MENTEE }, { value: 'FUND', label: GROUP_KIND_LABEL.FUND }]} />
          <Typography.Text type="secondary">{groups.length} nhóm · {unassigned.length} thành viên chưa có nhóm</Typography.Text>
        </Space>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ deputyCanReview: true, groupKind: 'MENTEE' }); setEditing('new'); }}>Tạo nhóm</Button>
      </div>
      {unassigned.length > 0 && (
        <Alert type="warning" showIcon title={`Chưa có nhóm: ${unassigned.slice(0, 12).map((item) => item.fullName).join(', ')}${unassigned.length > 12 ? '…' : ''}`} />
      )}
      {!loading && !groups.length && <Empty description="Chưa có nhóm nào" />}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {groups.filter((group) => kindFilter === 'ALL' || group.groupKind === kindFilter).map((group) => (
          <Card
            key={group._id}
            size="small"
            title={<span>{group.name} <Tag color={group.groupKind === 'FUND' ? 'gold' : 'purple'} className="ml-1">{GROUP_KIND_LABEL[group.groupKind]}</Tag><span className="text-xs font-normal text-gray-400">{group.code}</span>{!group.isActive && <Tag className="ml-2">Ngừng</Tag>}</span>}
            extra={(
              <Space size="small">
                <Button size="small" icon={<HistoryOutlined />} onClick={async () => { try { setHistory({ group, data: await groupApi.history(group._id) }); } catch (error) { message.error(errorMessage(error)); } }}>Lịch sử</Button>
                <Button size="small" onClick={() => { form.setFieldsValue({ name: group.name, deputyCanReview: group.deputyCanReview, isActive: group.isActive }); setEditing(group); }}>Sửa</Button>
              </Space>
            )}
          >
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(['LEADER', 'DEPUTY'] as const).map((role) => {
                const current = role === 'LEADER' ? group.leader : group.deputy;
                return (
                  <div key={role}>
                    <div className="text-xs text-gray-500">{role === 'LEADER' ? 'Leader' : `Phó nhóm${group.deputyCanReview ? '' : ' (chỉ xem)'}`}</div>
                    <Select
                      className="w-full"
                      size="small"
                      allowClear
                      showSearch={{ optionFilterProp: 'label' }}
                      placeholder="Chọn mentee"
                      value={current?._id}
                      options={menteeOptions}
                      onChange={(value?: string) => void run(() => groupApi.setRole(group._id, role, value), value ? `Đã đặt ${role === 'LEADER' ? 'Leader' : 'Phó nhóm'}` : 'Đã gỡ vai trò')}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm">{group.groupKind === 'FUND' ? `${group.counts.mentors} MTO đóng quỹ (Leader/Phó không đóng quỹ trong nhóm)` : `${group.counts.mentees} MTE`}</span>
              <Button size="small" icon={<UserAddOutlined />} onClick={() => { setAddIds([]); setAdding(group); }}>Thêm thành viên</Button>
            </div>
            <Table<GroupMember>
              rowKey="_id"
              size="small"
              pagination={false}
              dataSource={group.members}
              scroll={{ x: 'max-content', y: 260 }}
              columns={[
                { title: 'Thành viên', render: (_: unknown, row: GroupMember) => <span>{row.fullName} <span className="text-xs text-gray-400">{row.memberCode}</span>{row._id === group.leader?._id && <Tag color="gold" className="ml-1">Leader</Tag>}{row._id === group.deputy?._id && <Tag color="orange" className="ml-1">Phó</Tag>}</span> },
                { title: 'Vai trò', render: (_: unknown, row: GroupMember) => typeTag(row.memberType) },
                { title: 'Vào nhóm', dataIndex: 'joinedGroupAt', render: (value: string) => formatDate(value) },
                { title: '', render: (_: unknown, row: GroupMember) => <Popconfirm title="Đưa khỏi nhóm?" onConfirm={() => run(() => groupApi.removeMember(group._id, row._id), 'Đã đưa khỏi nhóm')}><Button size="small" type="link" danger>Rời nhóm</Button></Popconfirm> }
              ]}
            />
          </Card>
        ))}
      </div>

      <Modal title={editing && editing !== 'new' ? 'Sửa nhóm' : 'Tạo nhóm'} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={async (values) => {
          const ok = await run(() => (editing && editing !== 'new' ? groupApi.update(editing._id, values) : groupApi.create(values)), 'Đã lưu nhóm');
          if (ok) setEditing(null);
        }}>
          <Form.Item name="name" label="Tên nhóm" rules={[{ required: true, message: 'Nhập tên nhóm' }]}><Input placeholder="VD: Nhóm 1 - Mentor Nguyễn A" /></Form.Item>
          <Form.Item name="deputyCanReview" label="Phó nhóm được chấm recap / duyệt quỹ độc lập" valuePropName="checked" extra="Tắt: Phó nhóm chỉ xem tiến độ, Leader và admin thực hiện chấm/duyệt."><Switch /></Form.Item>
          {editing === 'new' && (
            <Form.Item name="groupKind" label="Loại nhóm" rules={[{ required: true }]}>
              <Select options={[{ value: 'MENTEE', label: 'Nhóm MTE (mentee: mentoring, học tập, quỹ)' }, { value: 'FUND', label: 'Nhóm HLC Fund của MTO' }]} />
            </Form.Item>
          )}
          {editing && editing !== 'new' && <Form.Item name="isActive" label="Đang hoạt động" valuePropName="checked"><Switch /></Form.Item>}
        </Form>
      </Modal>

      <Modal title={adding ? `Thêm thành viên vào ${adding.name}` : ''} open={Boolean(adding)} onCancel={() => setAdding(null)} okText="Thêm" okButtonProps={{ disabled: !addIds.length }} destroyOnHidden
        onOk={async () => { if (adding && await run(() => groupApi.addMembers(adding._id, addIds), 'Đã thêm vào nhóm')) setAdding(null); }}>
        <Typography.Paragraph type="secondary">
          {adding?.groupKind === 'FUND' ? 'Nhóm HLC Fund chỉ nhận MTO.' : 'Nhóm MTE chỉ nhận mentee.'} Thành viên đang ở nhóm khác cùng loại sẽ được chuyển sang nhóm này (lịch sử nhóm cũ vẫn giữ).
        </Typography.Paragraph>
        <Select
          mode="multiple"
          className="w-full"
          showSearch={{ optionFilterProp: 'label' }}
          value={addIds}
          onChange={setAddIds}
          placeholder="Chọn mentor / mentee"
          options={[
            { label: 'Chưa có nhóm', options: unassigned.filter((item) => adding && item.memberType === memberTypeFor(adding)).map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName}` })) },
            { label: 'Đang ở nhóm khác', options: members.filter((item) => adding && item.memberType === memberTypeFor(adding) && groupOf(item._id, adding.groupKind) && groupOf(item._id, adding.groupKind)?._id !== adding._id).map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName} (${groupOf(item._id, adding?.groupKind)?.name})` })) }
          ]}
        />
      </Modal>

      <Modal title={history ? `Lịch sử ${history.group.name}` : ''} open={Boolean(history)} onCancel={() => setHistory(null)} footer={null} width={760}>
        {history && (
          <Tabs items={[
            {
              key: 'roles', label: 'Leader / Phó nhóm', children: (
                <Table rowKey="_id" size="small" pagination={false} dataSource={history.data.roles} columns={[
                  { title: 'Vai trò', dataIndex: 'role', render: (value: string) => <Tag color={value === 'LEADER' ? 'gold' : 'orange'}>{value === 'LEADER' ? 'Leader' : 'Phó nhóm'}</Tag> },
                  { title: 'Thành viên', render: (_: unknown, row: GroupHistory['roles'][number]) => row.member?.fullName },
                  { title: 'Từ', dataIndex: 'startDate', render: (value: string) => formatDate(value) },
                  { title: 'Đến', dataIndex: 'endDate', render: (value: string | null) => value ? formatDate(value) : <Tag color="green">Hiện tại</Tag> },
                  { title: 'Ghi chú', dataIndex: 'note' }
                ]} />
              )
            },
            {
              key: 'members', label: 'Thành viên vào / rời', children: (
                <Table rowKey="_id" size="small" pagination={{ pageSize: 10 }} dataSource={history.data.memberships} columns={[
                  { title: 'Thành viên', render: (_: unknown, row: GroupHistory['memberships'][number]) => <span>{row.member?.fullName} {typeTag(row.member?.memberType)}</span> },
                  { title: 'Vào nhóm', dataIndex: 'startDate', render: (value: string) => formatDate(value) },
                  { title: 'Rời nhóm', dataIndex: 'endDate', render: (value: string | null) => value ? formatDate(value) : <Tag color="green">Đang ở nhóm</Tag> },
                  { title: 'Ghi chú', dataIndex: 'note' }
                ]} />
              )
            }
          ]} />
        )}
      </Modal>
    </div>
  );
}
