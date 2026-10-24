'use client';

import { useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Modal, Select, Table, Tag, Typography } from 'antd';
import { errorMessage } from '@/lib/api';
import type { GroupKind } from '@/services/hlcApi';
import { mentoringApi, type GroupPlan } from '@/services/mentoringApi';

type Row = GroupPlan['members'][number];

/**
 * Gợi ý chia nhóm cân bằng số người và mức hoạt động (điểm phụ cấp 3 tháng gần nhất).
 * Admin xem phương án, chỉnh tay từng người rồi mới xác nhận áp dụng.
 */
export default function GroupPlanModal({ kind, open, onClose, onApplied }: { kind: GroupKind; open: boolean; onClose: () => void; onApplied: () => void }) {
  const { message } = App.useApp();
  const [plan, setPlan] = useState<GroupPlan | null>(null);
  const [choice, setChoice] = useState<Record<string, string>>({});
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!open) return;
    let active = true;
    mentoringApi.groupPlan(kind).then((result) => {
      if (!active) return;
      setPlan(result);
      setChoice(Object.fromEntries(result.members.map((row) => [row.member._id, row.proposedGroupId])));
    }).catch((error) => message.error(errorMessage(error)));
    return () => { active = false; };
  }, [open, kind, message]);

  const stats = useMemo(() => (plan?.groups ?? []).map((group) => {
    const rows = (plan?.members ?? []).filter((row) => choice[row.member._id] === group._id);
    return { ...group, count: rows.length, activity: Math.round(rows.reduce((sum, row) => sum + row.activity, 0) * 100) / 100 };
  }), [plan, choice]);
  const changes = (plan?.members ?? []).filter((row) => choice[row.member._id] && choice[row.member._id] !== row.currentGroupId);
  const groupName = (id?: string | null) => plan?.groups.find((group) => group._id === id)?.name ?? '—';

  const apply = async () => {
    setApplying(true);
    try {
      const result = await mentoringApi.applyGroupPlan(kind, changes.map((row) => ({ memberId: row.member._id, groupId: choice[row.member._id] })));
      message.success(`Đã chuyển ${result.moved} thành viên`);
      onApplied();
      onClose();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setApplying(false);
    }
  };

  return (
    <Modal title="Gợi ý chia nhóm cân bằng" open={open} onCancel={onClose} width={900} destroyOnHidden
      footer={[<Button key="c" onClick={onClose}>Đóng</Button>, <Button key="a" type="primary" disabled={!changes.length} loading={applying} onClick={apply}>Áp dụng {changes.length} thay đổi</Button>]}>
      <Alert className="!mb-3" type="info" showIcon title="Hệ thống chỉ đề xuất" description={`Cân bằng số người và mức hoạt động (tổng điểm phụ cấp ${plan?.periods.join(', ') || '3 tháng gần nhất'}). Người đang giữ vai trò ở nhóm được giữ nguyên nhóm. Chỉnh cột "Nhóm đề xuất" rồi bấm Áp dụng.`} />
      <div className="mb-3 flex flex-wrap gap-2">
        {stats.map((group) => <Tag key={group._id} color="blue">{group.name}: {group.count} người · {group.activity} điểm</Tag>)}
      </div>
      <Table<Row>
        rowKey={(row) => row.member._id}
        size="small"
        loading={!plan}
        dataSource={plan?.members ?? []}
        pagination={{ pageSize: 15 }}
        scroll={{ x: 'max-content' }}
        columns={[
          { title: 'Thành viên', render: (_: unknown, row: Row) => <span>{row.member.fullName} <span className="text-xs text-gray-400">{row.member.memberCode}</span>{row.pinned && <Tag className="ml-1" color="gold">Giữ vai trò</Tag>}</span> },
          { title: 'Mức hoạt động', dataIndex: 'activity', align: 'right' as const, sorter: (a: Row, b: Row) => a.activity - b.activity },
          { title: 'Nhóm hiện tại', render: (_: unknown, row: Row) => groupName(row.currentGroupId) },
          {
            title: 'Nhóm đề xuất', render: (_: unknown, row: Row) => (
              <Select size="small" className="min-w-48" value={choice[row.member._id]} onChange={(value) => setChoice((prev) => ({ ...prev, [row.member._id]: value }))}
                options={(plan?.groups ?? []).map((group) => ({ value: group._id, label: group.name }))} />
            )
          },
          { title: '', render: (_: unknown, row: Row) => choice[row.member._id] !== row.currentGroupId ? <Tag color="orange">Chuyển</Tag> : null }
        ]}
      />
      <Typography.Text type="secondary">{changes.length} người sẽ được chuyển nhóm.</Typography.Text>
    </Modal>
  );
}
