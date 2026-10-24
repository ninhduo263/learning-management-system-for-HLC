'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, DatePicker, Empty, Form, Input, Modal, Select, Space, Switch, Table, Tabs, Tag, Typography } from 'antd';
import { ClusterOutlined, CrownOutlined, DeleteOutlined, HistoryOutlined, PlusOutlined, UserAddOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import GroupDeleteModal from '@/components/GroupDeleteModal';
import GroupPlanModal from '@/components/GroupPlanModal';
import type { Dayjs } from 'dayjs';
import { errorMessage } from '@/lib/api';
import {
  GROUP_KIND_LABEL, formatDate, fundApi, groupApi, memberDirectoryApi, roleApi,
  type FundContributor, type GroupHistory, type GroupKind, type GroupMember, type GroupRoleAssignment, type GroupView, type DirectoryMember, type RoleView
} from '@/services/hlcApi';

const typeTag = (type?: string) => <Tag color={type === 'MENTOR' ? 'blue' : 'green'}>{type === 'MENTOR' ? 'MTO' : 'MTE'}</Tag>;

/**
 * Quản lý 1 loại nhóm (danh sách và màn hình riêng, không lẫn thành viên):
 * - Nhóm MTE: thành viên là mentee.
 * - Nhóm HLC Fund: thành viên là MTO và thầy cô ngoài HLC; Leader/Phó (MTE) chỉ quản lý, không là thành viên.
 * Gán vai trò = gán chức vụ kèm quyền hạn và điểm theo cấu hình vai trò, có thời gian hiệu lực.
 */
export default function GroupManager({ kind, canDelete = true }: { kind: GroupKind; canDelete?: boolean }) {
  const { message } = App.useApp();
  const [groups, setGroups] = useState<GroupView[]>([]);
  const [members, setMembers] = useState<DirectoryMember[]>([]);
  const [unassigned, setUnassigned] = useState<GroupMember[]>([]);
  const [roles, setRoles] = useState<RoleView[]>([]);
  const [contributors, setContributors] = useState<FundContributor[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<GroupView | 'new' | null>(null);
  const [adding, setAdding] = useState<GroupView | null>(null);
  const [addIds, setAddIds] = useState<string[]>([]);
  const [assigning, setAssigning] = useState<GroupView | null>(null);
  const [contributor, setContributor] = useState<{ group: GroupView; item?: FundContributor } | null>(null);
  const [history, setHistory] = useState<{ group: GroupView; data: GroupHistory } | null>(null);
  const [deleting, setDeleting] = useState<GroupView | null>(null);
  const [planOpen, setPlanOpen] = useState(false);
  const [moving, setMoving] = useState<{ group: GroupView; member: GroupMember } | null>(null);
  const [moveTarget, setMoveTarget] = useState<string | undefined>();
  const [ending, setEnding] = useState<{ group: GroupView; row: GroupRoleAssignment } | null>(null);
  const [endForm] = Form.useForm<{ endDate?: Dayjs; reason?: string }>();
  const [form] = Form.useForm();
  const [assignForm] = Form.useForm<{ memberId: string; positionId: string; startDate?: Dayjs; endDate?: Dayjs; note?: string }>();
  const [contributorForm] = Form.useForm();
  const isFund = kind === 'FUND';
  const memberType = isFund ? 'MENTOR' : 'MENTEE';

  const load = useCallback(async () => {
    try {
      const [list, all, free, roleList, contributorList] = await Promise.all([
        groupApi.list(),
        memberDirectoryApi.list(),
        groupApi.unassigned(),
        roleApi.list().catch(() => [] as RoleView[]),
        isFund ? fundApi.contributors() : Promise.resolve([] as FundContributor[])
      ]);
      setGroups(list.filter((group) => group.groupKind === kind));
      setMembers(all);
      setUnassigned(free.filter((item) => item.memberType === memberType));
      setRoles(roleList.filter((role) => role.appliesTo === kind && role.isActive));
      setContributors(contributorList);
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được danh sách nhóm'));
    } finally {
      setLoading(false);
    }
  }, [message, kind, isFund, memberType]);

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

  const groupOf = (memberId: string) => groups.find((group) => group.members.some((item) => item._id === memberId));
  const menteeOptions = members.filter((member) => member.memberType === 'MENTEE').map((member) => ({ value: member._id, label: `${member.memberCode} – ${member.fullName}` }));
  const roleColumns = (group: GroupView) => [
    { title: 'Vai trò', render: (_: unknown, row: GroupRoleAssignment) => <Tag color="gold">{row.roleName}</Tag> },
    { title: 'Người giữ', render: (_: unknown, row: GroupRoleAssignment) => <span>{row.fullName} <span className="text-xs text-gray-400">{row.memberCode}</span></span> },
    { title: 'Hiệu lực', render: (_: unknown, row: GroupRoleAssignment) => <span>{formatDate(row.startDate)} → {row.endDate ? formatDate(row.endDate) : 'nay'}{!row.isActive && <Tag className="ml-1">Sắp hiệu lực</Tag>}</span> },
    {
      title: '', render: (_: unknown, row: GroupRoleAssignment) => !row.endDate ? (
        <Button size="small" type="link" danger onClick={() => { endForm.setFieldsValue({ endDate: dayjs(), reason: '' }); setEnding({ group, row }); }}>Gỡ chức vụ</Button>
      ) : null
    }
  ];

  return (
    <div className="space-y-3">
      <Alert
        type="info"
        showIcon
        title={isFund ? 'Nhóm HLC Fund của MTO và thầy cô ngoài HLC' : 'Nhóm MTE (mentoring, học tập, HLC Fund của mentee)'}
        description={isFund
          ? 'Thành viên đóng quỹ là MTO và thầy cô. Leader / Phó nhóm là MTE giữ vai trò quản lý: duyệt và nộp hộ minh chứng, không nằm trong danh sách thành viên và không tính vào tỷ lệ hoàn thành.'
          : 'Thành viên là mentee. Leader / Phó nhóm chấm recap MTE, theo dõi tiến độ và duyệt quỹ của nhóm.'}
      />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Typography.Text type="secondary">{groups.length} nhóm · {unassigned.length} {isFund ? 'MTO' : 'MTE'} chưa có nhóm</Typography.Text>
        <Space wrap>
          <Button icon={<ClusterOutlined />} onClick={() => setPlanOpen(true)}>Gợi ý chia nhóm cân bằng</Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => { form.resetFields(); form.setFieldsValue({ deputyCanReview: true }); setEditing('new'); }}>Tạo nhóm mới</Button>
        </Space>
      </div>
      {unassigned.length > 0 && <Alert type="warning" showIcon title={`Chưa có nhóm: ${unassigned.slice(0, 12).map((item) => item.fullName).join(', ')}${unassigned.length > 12 ? '…' : ''}`} />}
      {!loading && !groups.length && <Empty description="Chưa có nhóm nào" />}
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        {groups.map((group) => {
          const groupContributors = contributors.filter((item) => item.groupId === group._id);
          return (
            <Card
              key={group._id}
              size="small"
              title={<span>{group.name} <span className="text-xs font-normal text-gray-400">{group.code}</span>{!group.isActive && <Tag className="ml-2">Ngừng</Tag>}</span>}
              extra={(
                <Space size="small">
                  <Button size="small" icon={<HistoryOutlined />} onClick={async () => { try { setHistory({ group, data: await groupApi.history(group._id) }); } catch (error) { message.error(errorMessage(error)); } }}>Lịch sử</Button>
                  <Button size="small" onClick={() => { form.setFieldsValue({ name: group.name, isActive: group.isActive, deputyCanReview: group.deputyCanReview }); setEditing(group); }}>Sửa</Button>
                  {canDelete && <Button size="small" danger icon={<DeleteOutlined />} onClick={() => setDeleting(group)}>Xóa</Button>}
                </Space>
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <Typography.Text strong>Vai trò trong nhóm</Typography.Text>
                <Button size="small" icon={<CrownOutlined />} onClick={() => { assignForm.resetFields(); setAssigning(group); }}>Gán vai trò</Button>
              </div>
              <Table<GroupRoleAssignment> rowKey="assignmentId" size="small" pagination={false} dataSource={group.roles} columns={roleColumns(group)} locale={{ emptyText: 'Chưa gán Leader / Phó nhóm' }} />
              <div className="mb-2 mt-3 flex items-center justify-between">
                <Typography.Text strong>{isFund ? `${group.counts.mentors} MTO đóng quỹ` : `${group.counts.mentees} MTE`}</Typography.Text>
                <Button size="small" icon={<UserAddOutlined />} onClick={() => { setAddIds([]); setAdding(group); }}>Thêm {isFund ? 'MTO' : 'MTE'}</Button>
              </div>
              <Table<GroupMember>
                rowKey="_id"
                size="small"
                pagination={false}
                dataSource={group.members}
                scroll={{ x: 'max-content', y: 240 }}
                columns={[
                  { title: 'Thành viên', render: (_: unknown, row: GroupMember) => <span>{row.fullName} <span className="text-xs text-gray-400">{row.memberCode}</span></span> },
                  { title: 'Loại', render: (_: unknown, row: GroupMember) => typeTag(row.memberType) },
                  { title: 'Vào nhóm', dataIndex: 'joinedGroupAt', render: (value: string) => formatDate(value) },
                  { title: '', render: (_: unknown, row: GroupMember) => <Button size="small" type="link" onClick={() => { setMoveTarget(undefined); setMoving({ group, member: row }); }}>Chuyển nhóm</Button> }
                ]}
              />
              {isFund && (
                <>
                  <div className="mb-2 mt-3 flex items-center justify-between">
                    <Typography.Text strong>{groupContributors.length} thầy cô ngoài HLC</Typography.Text>
                    <Button size="small" icon={<UserAddOutlined />} onClick={() => { contributorForm.resetFields(); contributorForm.setFieldsValue({ isActive: true }); setContributor({ group }); }}>Thêm thầy cô</Button>
                  </div>
                  <Table<FundContributor> rowKey="_id" size="small" pagination={false} dataSource={groupContributors} locale={{ emptyText: 'Chưa có' }} columns={[
                    { title: 'Họ tên', dataIndex: 'fullName' },
                    { title: 'Đơn vị', dataIndex: 'organization', render: (value: string | null) => value ?? '—' },
                    { title: 'Liên hệ', dataIndex: 'contact', render: (value: string | null) => value ?? '—' },
                    { title: '', render: (_: unknown, row: FundContributor) => <Space>{!row.isActive && <Tag>Ngừng</Tag>}<Button size="small" type="link" onClick={() => { contributorForm.setFieldsValue(row); setContributor({ group, item: row }); }}>Sửa</Button></Space> }
                  ]} />
                </>
              )}
            </Card>
          );
        })}
      </div>

      <Modal title={editing && editing !== 'new' ? 'Sửa nhóm' : `Tạo ${GROUP_KIND_LABEL[kind]}`} open={Boolean(editing)} onCancel={() => setEditing(null)} onOk={() => form.submit()} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={async (values) => {
          const ok = await run(() => (editing && editing !== 'new' ? groupApi.update(editing._id, values) : groupApi.create({ ...values, groupKind: kind })), 'Đã lưu nhóm');
          if (ok) setEditing(null);
        }}>
          <Form.Item name="name" label="Tên nhóm" rules={[{ required: true, message: 'Nhập tên nhóm' }]}><Input placeholder={isFund ? 'VD: Quỹ MTO nhóm 1' : 'VD: Nhóm MTE 1'} /></Form.Item>
          <Form.Item name="deputyCanReview" label="Phó nhóm được chấm / duyệt thay Leader" valuePropName="checked" extra="Tắt thì chỉ Leader của nhóm có quyền chấm recap và duyệt minh chứng."><Switch /></Form.Item>
          {editing && editing !== 'new' && <Form.Item name="isActive" label="Đang hoạt động" valuePropName="checked"><Switch /></Form.Item>}
        </Form>
      </Modal>

      <Modal title={assigning ? `Gán vai trò · ${assigning.name}` : ''} open={Boolean(assigning)} onCancel={() => setAssigning(null)} onOk={() => assignForm.submit()} destroyOnHidden>
        <Form form={assignForm} layout="vertical" onFinish={async (values) => {
          if (!assigning) return;
          const ok = await run(() => groupApi.assign(assigning._id, {
            memberId: values.memberId,
            positionId: values.positionId,
            startDate: values.startDate?.format('YYYY-MM-DD'),
            endDate: values.endDate?.format('YYYY-MM-DD'),
            note: values.note
          }), 'Đã gán vai trò');
          if (ok) setAssigning(null);
        }}>
          <Typography.Paragraph type="secondary">Người giữ vai trò có ngay quyền hạn và điểm phụ cấp theo cấu hình vai trò. Người đang giữ vai trò này sẽ được kết thúc trước ngày bắt đầu mới.</Typography.Paragraph>
          <Form.Item name="positionId" label="Vai trò" rules={[{ required: true, message: 'Chọn vai trò' }]}>
            <Select options={roles.map((role) => ({ value: role._id, label: `${role.name} · ${role.allowancePoints} điểm${role.bonusPoints ? ` (+${role.bonusPoints} thưởng)` : ''}` }))} />
          </Form.Item>
          <Form.Item name="memberId" label="Thành viên (MTE)" rules={[{ required: true, message: 'Chọn thành viên' }]}>
            <Select showSearch={{ optionFilterProp: 'label' }} options={menteeOptions} />
          </Form.Item>
          <div className="grid grid-cols-2 gap-3">
            <Form.Item name="startDate" label="Từ ngày (trống = hôm nay)"><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
            <Form.Item name="endDate" label="Đến ngày (trống = chưa hết hạn)"><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
          </div>
          <Form.Item name="note" label="Ghi chú"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title={adding ? `Thêm ${isFund ? 'MTO' : 'MTE'} vào ${adding.name}` : ''} open={Boolean(adding)} onCancel={() => setAdding(null)} okText="Thêm" okButtonProps={{ disabled: !addIds.length }} destroyOnHidden
        onOk={async () => { if (adding && await run(() => groupApi.addMembers(adding._id, addIds), 'Đã thêm vào nhóm')) setAdding(null); }}>
        <Typography.Paragraph type="secondary">Người đang ở {GROUP_KIND_LABEL[kind].toLowerCase()} khác sẽ được chuyển sang nhóm này (lịch sử nhóm cũ vẫn giữ).</Typography.Paragraph>
        <Select
          mode="multiple"
          className="w-full"
          showSearch={{ optionFilterProp: 'label' }}
          value={addIds}
          onChange={setAddIds}
          options={[
            { label: 'Chưa có nhóm', options: unassigned.map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName}` })) },
            { label: 'Đang ở nhóm khác', options: members.filter((item) => item.memberType === memberType && groupOf(item._id) && groupOf(item._id)?._id !== adding?._id).map((item) => ({ value: item._id, label: `${item.memberCode} – ${item.fullName} (${groupOf(item._id)?.name})` })) }
          ]}
        />
      </Modal>

      <Modal title={contributor?.item ? 'Sửa thầy cô' : `Thêm thầy cô vào ${contributor?.group.name ?? ''}`} open={Boolean(contributor)} onCancel={() => setContributor(null)} onOk={() => contributorForm.submit()} destroyOnHidden>
        <Form form={contributorForm} layout="vertical" onFinish={async (values) => {
          if (!contributor) return;
          const ok = await run(() => fundApi.saveContributor({ ...values, groupId: values.groupId ?? contributor.group._id }, contributor.item?._id), 'Đã lưu thầy cô');
          if (ok) setContributor(null);
        }}>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, message: 'Nhập họ tên' }]}><Input /></Form.Item>
          <Form.Item name="organization" label="Đơn vị"><Input /></Form.Item>
          <Form.Item name="contact" label="Liên hệ"><Input /></Form.Item>
          {contributor?.item && <Form.Item name="groupId" label="Nhóm"><Select options={groups.map((group) => ({ value: group._id, label: group.name }))} /></Form.Item>}
          {contributor?.item && <Form.Item name="isActive" label="Đang đóng quỹ" valuePropName="checked"><Switch /></Form.Item>}
        </Form>
      </Modal>

      <GroupDeleteModal group={deleting} onClose={() => setDeleting(null)} onDone={() => void load()} />
      <GroupPlanModal kind={kind} open={planOpen} onClose={() => setPlanOpen(false)} onApplied={() => void load()} />

      <Modal title={moving ? `Chuyển ${moving.member.fullName} sang nhóm khác` : ''} open={Boolean(moving)} onCancel={() => setMoving(null)} okText="Chuyển" okButtonProps={{ disabled: !moveTarget }} destroyOnHidden
        onOk={async () => { if (moving && moveTarget && await run(() => groupApi.addMembers(moveTarget, [moving.member._id]), 'Đã chuyển nhóm')) setMoving(null); }}>
        <Typography.Paragraph type="secondary">Mỗi thành viên luôn thuộc đúng một nhóm: chọn nhóm mới thay vì gỡ khỏi nhóm. Vai trò đang giữ ở nhóm cũ được kết thúc hôm nay.</Typography.Paragraph>
        <Select className="w-full" placeholder="Chọn nhóm mới" value={moveTarget} onChange={setMoveTarget} options={groups.filter((item) => item._id !== moving?.group._id && item.isActive).map((item) => ({ value: item._id, label: item.name }))} />
      </Modal>

      <Modal title={ending ? `Gỡ chức vụ ${ending.row.roleName} · ${ending.row.fullName}` : ''} open={Boolean(ending)} onCancel={() => setEnding(null)} onOk={() => endForm.submit()} okText="Gỡ chức vụ" okButtonProps={{ danger: true }} destroyOnHidden>
        <Form form={endForm} layout="vertical" onFinish={async (values) => {
          if (!ending) return;
          const ok = await run(() => groupApi.endAssignment(ending.row.assignmentId, values.endDate?.format('YYYY-MM-DD'), values.reason), `Đã gỡ chức vụ ở ${ending.group.name}`);
          if (ok) setEnding(null);
        }}>
          <Typography.Paragraph type="secondary">Ghi ngày kết thúc hiệu lực (không xóa lịch sử) để phụ cấp của kỳ vẫn tính đúng theo thời gian giữ chức. Thao tác được ghi nhật ký.</Typography.Paragraph>
          <Form.Item name="endDate" label="Hiệu lực đến hết ngày" rules={[{ required: true, message: 'Chọn ngày kết thúc' }]}><DatePicker className="w-full" format="DD/MM/YYYY" /></Form.Item>
          <Form.Item name="reason" label="Lý do"><Input /></Form.Item>
        </Form>
      </Modal>

      <Modal title={history ? `Lịch sử ${history.group.name}` : ''} open={Boolean(history)} onCancel={() => setHistory(null)} footer={null} width={760}>
        {history && (
          <Tabs items={[
            {
              key: 'roles', label: 'Vai trò', children: (
                <Table rowKey="_id" size="small" pagination={false} dataSource={history.data.roles} columns={[
                  { title: 'Vai trò', render: (_: unknown, row: GroupHistory['roles'][number]) => <Tag color="gold">{row.roleName || row.role}</Tag> },
                  { title: 'Người giữ', render: (_: unknown, row: GroupHistory['roles'][number]) => row.member?.fullName },
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
