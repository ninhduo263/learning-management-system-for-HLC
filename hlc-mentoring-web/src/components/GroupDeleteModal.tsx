'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Descriptions, Input, Modal, Popconfirm, Select, Space, Steps, Tag, Typography } from 'antd';
import { errorMessage } from '@/lib/api';
import { groupApi, type GroupDeletePreview, type GroupView } from '@/services/hlcApi';

/**
 * Xóa nhóm 2 bước: (1) chuyển toàn bộ thành viên sang nhóm khác cùng loại (mỗi thành viên luôn có 1 nhóm),
 * (2) xóa nhóm đã trống. Nhóm có dữ liệu đã chốt chỉ chuyển sang ngừng hoạt động để giữ lịch sử đối soát.
 */
export default function GroupDeleteModal({ group, onClose, onDone }: { group: GroupView | null; onClose: () => void; onDone: () => void }) {
  const { message } = App.useApp();
  const [preview, setPreview] = useState<GroupDeletePreview | null>(null);
  const [target, setTarget] = useState<string | undefined>();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async (id: string) => {
    try {
      setPreview(await groupApi.deletePreview(id));
    } catch (error) {
      message.error(errorMessage(error));
    }
  }, [message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      setPreview(null);
      setTarget(undefined);
      setReason('');
      if (group) void load(group._id);
    });
    return () => { active = false; };
  }, [group, load]);

  const transfer = async () => {
    if (!group || !target) return;
    setBusy('transfer');
    try {
      const result = await groupApi.transfer(group._id, { targetGroupId: target });
      message.success(`Đã chuyển ${result.moved} thành viên${result.contributors ? ` và ${result.contributors} thầy cô` : ''}`);
      setPreview(result.preview);
      onDone();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const remove = async () => {
    if (!group) return;
    setBusy('delete');
    try {
      const result = await groupApi.remove(group._id, reason.trim() || undefined);
      message.success(result.mode === 'DEACTIVATE' ? 'Nhóm có dữ liệu đã chốt: đã chuyển sang ngừng hoạt động' : 'Đã xóa nhóm');
      onDone();
      onClose();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  const counts = preview?.counts;
  const step = preview?.canDelete ? 1 : 0;
  return (
    <Modal title={group ? `Xóa nhóm · ${group.name}` : ''} open={Boolean(group)} onCancel={onClose} footer={null} width={640} destroyOnHidden>
      {!preview || !counts ? <Typography.Text type="secondary">Đang kiểm tra dữ liệu liên quan…</Typography.Text> : (
        <div className="space-y-4">
          <Steps size="small" current={step} items={[{ title: 'Chuyển thành viên sang nhóm khác' }, { title: 'Xóa nhóm đã trống' }]} />
          <Descriptions size="small" column={1} bordered items={[
            { key: 'm', label: 'Thành viên đang ở nhóm', children: <strong className={counts.members ? 'text-red-600' : ''}>{counts.members}</strong> },
            ...(counts.contributors ? [{ key: 'c', label: 'Thầy cô ngoài HLC', children: <strong className="text-red-600">{counts.contributors}</strong> }] : []),
            { key: 'r', label: 'Vai trò đang hiệu lực', children: counts.activeRoles },
            { key: 'h', label: 'Lịch sử thành viên / lần giữ vai trò', children: `${counts.membershipHistory} / ${counts.roleAssignments}` },
            { key: 'a', label: 'Module học tập gán theo nhóm', children: counts.moduleAudiences },
            { key: 'f', label: 'Dữ liệu đã chốt (điểm / khoản quỹ)', children: `${counts.finalizedPointEntries} / ${counts.finalizedContributions}` }
          ]} />
          {!preview.canDelete ? (
            <div className="space-y-2">
              <Alert type="warning" showIcon title="Mỗi thành viên bắt buộc thuộc một nhóm" description={`Chuyển toàn bộ ${counts.members} thành viên${counts.contributors ? ` và ${counts.contributors} thầy cô` : ''} sang nhóm khác trước khi xóa.`} />
              <div className="flex flex-wrap gap-1">{preview.members.slice(0, 30).map((item) => <Tag key={item._id}>{item.fullName}</Tag>)}{preview.members.length > 30 && <Tag>…</Tag>}</div>
              {preview.targets.length ? (
                <Space wrap>
                  <Select className="min-w-64" placeholder="Chọn nhóm đích" value={target} onChange={setTarget} options={preview.targets.map((item) => ({ value: item._id, label: item.name }))} />
                  <Button type="primary" disabled={!target} loading={busy === 'transfer'} onClick={transfer}>Chuyển toàn bộ</Button>
                </Space>
              ) : <Alert type="error" showIcon title="Chưa có nhóm cùng loại để chuyển: hãy tạo nhóm mới trước." />}
            </div>
          ) : (
            <div className="space-y-2">
              {preview.mode === 'DEACTIVATE'
                ? <Alert type="info" showIcon title="Nhóm có dữ liệu đã chốt" description="Nhóm sẽ chuyển sang ngừng hoạt động (không xóa cứng) để giữ lịch sử đối soát; vai trò và ủy quyền còn hiệu lực được kết thúc hôm nay." />
                : <Alert type="warning" showIcon title="Nhóm sẽ bị xóa hẳn" description="Lịch sử thành viên và vai trò của nhóm này bị xóa. Thao tác được ghi nhật ký." />}
              <Input.TextArea rows={2} placeholder="Lý do (ghi vào nhật ký)" value={reason} onChange={(event) => setReason(event.target.value)} />
              <Popconfirm title={preview.mode === 'DEACTIVATE' ? `Ngừng hoạt động ${preview.group.name}?` : `Xóa hẳn ${preview.group.name}?`} onConfirm={remove}>
                <Button danger type="primary" loading={busy === 'delete'}>{preview.mode === 'DEACTIVATE' ? 'Ngừng hoạt động nhóm' : 'Xóa nhóm'}</Button>
              </Popconfirm>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
