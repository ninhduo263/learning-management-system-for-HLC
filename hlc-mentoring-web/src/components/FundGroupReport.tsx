'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, App, Button, Card, Empty, Input, Modal, Select, Space, Table, Tag, Typography } from 'antd';
import FileThumbs from '@/components/FileThumbs';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import {
  FUND_STATUS_COLOR, FUND_STATUS_LABEL, WEEK_STATUS_COLOR, WEEK_STATUS_LABEL, formatDate, fundApi, money,
  type ContributionView, type FundGroupReport as Report
} from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

const weekLabel = (week: { weekKey: string; from: string; to: string }) => `${week.weekKey.slice(-3)} (${formatDate(week.from).slice(0, 5)}–${formatDate(week.to).slice(0, 5)})`;

/** Báo cáo quỹ theo nhóm và theo tuần; Leader/Phó duyệt minh chứng nhóm mình, Admin xem toàn bộ */
export default function FundGroupReport() {
  const { message } = App.useApp();
  const [code, setCode] = useState(() => currentPeriodCode(getCurrentTime()));
  const [groupId, setGroupId] = useState<string>('');
  const [data, setData] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewing, setViewing] = useState<{ title: string; ids: string[] } | null>(null);
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await fundApi.groupReport({ period: code }));
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được báo cáo quỹ'));
    } finally {
      setLoading(false);
    }
  }, [code, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const review = async (ids: string[], status: 'DONE' | 'NOT_DONE', reviewNote?: string) => {
    setSaving(true);
    try {
      const result = await fundApi.groupReview(ids, status, reviewNote);
      message.success(`Đã cập nhật ${result.updated} minh chứng: ${status === 'DONE' ? 'Đã xong' : 'Chưa xong'}`);
      setRejecting(null);
      setNote('');
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const byId = useMemo(() => new Map((data?.contributions ?? []).map((item) => [item._id, item])), [data]);
  const groups = (data?.groups ?? []).filter((group) => !groupId || group._id === groupId);
  const locked = Boolean(data?.period.isLocked);
  const viewingRows = (viewing?.ids ?? []).map((id) => byId.get(id)).filter(Boolean) as ContributionView[];

  const contributionTable = (rows: ContributionView[], canReview: boolean) => (
    <Table<ContributionView>
      rowKey="_id"
      size="small"
      pagination={false}
      dataSource={rows}
      scroll={{ x: 'max-content' }}
      columns={[
        { title: 'Thành viên', render: (_: unknown, row: ContributionView) => row.member?.fullName },
        { title: 'Ngày đóng', render: (_: unknown, row: ContributionView) => formatDate(row.contributionDate) },
        { title: 'Số tiền', align: 'right' as const, render: (_: unknown, row: ContributionView) => money(row.amount) },
        { title: 'Ảnh', render: (_: unknown, row: ContributionView) => <FileThumbs files={row.files} size={48} /> },
        { title: 'Gửi lúc', render: (_: unknown, row: ContributionView) => formatDateTime(row.submittedAt) },
        { title: 'Trạng thái', render: (_: unknown, row: ContributionView) => <div><Tag color={FUND_STATUS_COLOR[row.status]}>{FUND_STATUS_LABEL[row.status]}</Tag>{row.reviewNote && <div className="text-xs text-red-500">{row.reviewNote}</div>}</div> },
        {
          title: '', render: (_: unknown, row: ContributionView) => canReview && !locked ? (
            <Space>
              {row.status !== 'DONE' && <Button size="small" type="primary" loading={saving} onClick={() => review([row._id], 'DONE')}>Đã xong</Button>}
              {row.status !== 'NOT_DONE' && <Button size="small" danger onClick={() => setRejecting([row._id])}>Chưa xong</Button>}
            </Space>
          ) : null
        }
      ]}
    />
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <MonthPicker value={code} onChange={setCode} />
        {(data?.groups.length ?? 0) > 1 && (
          <Select className="min-w-56" allowClear placeholder="Tất cả nhóm" value={groupId || undefined} onChange={(value) => setGroupId(value ?? '')} options={data?.groups.map((group) => ({ value: group._id, label: `${group.name}${group.pending ? ` (${group.pending} chờ)` : ''}` }))} />
        )}
        {locked && <Tag color="purple">Kỳ đã chốt</Tag>}
      </div>
      <Typography.Text type="secondary">Mentor gửi minh chứng mỗi tuần. Leader nhóm duyệt: Chờ → Đã xong / Chưa xong. Bấm vào ô tuần để xem ảnh và duyệt.</Typography.Text>
      {!loading && !groups.length && <Empty description="Chưa có nhóm" />}
      {groups.map((group) => {
        const pendingRows = (data?.contributions ?? []).filter((item) => item.status === 'PENDING' && group.members.some((row) => row.member._id === item.memberId));
        return (
          <Card
            key={group._id}
            size="small"
            loading={loading}
            title={<span>{group.name} <span className="text-xs font-normal text-gray-500">Leader: {group.leader?.fullName ?? '—'} · Phó: {group.deputy?.fullName ?? '—'}</span></span>}
            extra={group.pending ? <Tag color="gold">{group.pending} chờ duyệt</Tag> : <Tag color="green">Không còn mục chờ</Tag>}
          >
            {!group.canReview && <Alert className="mb-2" type="info" showIcon title="Bạn chỉ được xem nhóm này (Phó nhóm chưa được bật quyền duyệt)." />}
            <Table
              rowKey={(row) => row.member._id}
              size="small"
              pagination={false}
              dataSource={group.members}
              scroll={{ x: 'max-content' }}
              columns={[
                { title: 'Thành viên', fixed: 'left' as const, render: (_: unknown, row: Report['groups'][number]['members'][number]) => <div>{row.member.fullName}<div><Tag color={row.member.memberType === 'MENTOR' ? 'blue' : 'green'}>{row.member.memberType === 'MENTOR' ? 'Mentor' : 'Mentee'}</Tag></div></div> },
                ...(data?.weeks ?? []).map((week) => ({
                  title: weekLabel(week),
                  render: (_: unknown, row: Report['groups'][number]['members'][number]) => {
                    const cell = row.weeks[week.weekKey];
                    return (
                      <Tag
                        color={WEEK_STATUS_COLOR[cell.status]}
                        className={cell.ids.length ? 'cursor-pointer' : ''}
                        onClick={() => cell.ids.length && setViewing({ title: `${row.member.fullName} · ${weekLabel(week)}`, ids: cell.ids })}
                      >
                        {WEEK_STATUS_LABEL[cell.status]}{cell.amount ? ` · ${money(cell.amount)}` : ''}
                      </Tag>
                    );
                  }
                })),
                { title: 'Đã duyệt', align: 'right' as const, render: (_: unknown, row: Report['groups'][number]['members'][number]) => money(row.total) }
              ]}
            />
            {pendingRows.length > 0 && (
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Typography.Text strong>Minh chứng chờ duyệt</Typography.Text>
                  {group.canReview && !locked && <Button size="small" type="primary" loading={saving} onClick={() => review(pendingRows.map((row) => row._id), 'DONE')}>Đánh dấu tất cả Đã xong</Button>}
                </div>
                {contributionTable(pendingRows, group.canReview)}
              </div>
            )}
          </Card>
        );
      })}
      <Modal title={viewing?.title} open={Boolean(viewing)} onCancel={() => setViewing(null)} footer={null} width="min(900px, calc(100vw - 24px))">
        {viewing && contributionTable(viewingRows, Boolean(groups.find((group) => group.members.some((row) => viewingRows.some((item) => item.memberId === row.member._id)))?.canReview))}
      </Modal>
      <Modal title="Đánh dấu Chưa xong" open={Boolean(rejecting)} onCancel={() => setRejecting(null)} onOk={() => rejecting && review(rejecting, 'NOT_DONE', note)} okText="Lưu" okButtonProps={{ danger: true }} confirmLoading={saving} destroyOnHidden>
        <Input.TextArea rows={3} placeholder="Lý do (người nộp sẽ thấy để gửi lại)" value={note} onChange={(event) => setNote(event.target.value)} />
      </Modal>
    </div>
  );
}
