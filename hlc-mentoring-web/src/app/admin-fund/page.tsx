'use client';

import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, DatePicker, Input, Modal, Progress, Segmented, Space, Statistic, Table, Tag, Typography } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import FileThumbs from '@/components/FileThumbs';
import FundGroupReport from '@/components/FundGroupReport';
import ResponsiveTabs from '@/components/ResponsiveTabs';
import FundLedgerPanel from '@/components/FundLedgerPanel';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import { FUND_STATUS_COLOR, FUND_STATUS_LABEL, formatDate, fundApi, money, type ContributionView, type FundStats } from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

export default function AdminFundPage() {
  const { message } = App.useApp();
  const [code, setCode] = useState(() => currentPeriodCode(getCurrentTime()));
  const [date, setDate] = useState<string>('');
  const [status, setStatus] = useState<string>('PENDING');
  const [rows, setRows] = useState<ContributionView[]>([]);
  const [stats, setStats] = useState<FundStats | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState<string[] | null>(null);
  const [note, setNote] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, nextStats] = await Promise.all([
        fundApi.list({ period: date ? undefined : code, date: date || undefined, status: status === 'ALL' ? undefined : status }),
        fundApi.stats(date ? date.slice(0, 7) : code)
      ]);
      setRows(list);
      setStats(nextStats);
      setSelected([]);
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được minh chứng'));
    } finally {
      setLoading(false);
    }
  }, [code, date, status, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const review = async (ids: string[], nextStatus: 'DONE' | 'NOT_DONE', reviewNote?: string) => {
    setSaving(true);
    try {
      const result = ids.length === 1 ? await fundApi.review(ids[0], nextStatus, reviewNote) : await fundApi.bulkReview(ids, nextStatus, reviewNote);
      message.success(`Đã ${nextStatus === 'DONE' ? 'duyệt' : 'từ chối'} ${result.updated} minh chứng`);
      setRejecting(null);
      setNote('');
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const locked = Boolean(stats?.period.isLocked);
  const listTab = (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <DatePicker format="DD/MM/YYYY" placeholder="Lọc theo ngày đóng" value={date ? dayjs(date) : null} onChange={(value) => setDate(value ? value.format('YYYY-MM-DD') : '')} />
        <Segmented value={status} onChange={(value) => setStatus(String(value))} options={[
          { value: 'PENDING', label: 'Chờ duyệt' }, { value: 'DONE', label: 'Đã duyệt' }, { value: 'NOT_DONE', label: 'Không hợp lệ' }, { value: 'ALL', label: 'Tất cả' }
        ]} />
        <div className="flex-1" />
        <Space wrap>
          <Button type="primary" icon={<CheckOutlined />} disabled={!selected.length || locked} loading={saving} onClick={() => review(selected, 'DONE')}>Duyệt {selected.length || ''} mục</Button>
          <Button danger icon={<CloseOutlined />} disabled={!selected.length || locked} onClick={() => setRejecting(selected)}>Từ chối</Button>
        </Space>
      </div>
      <Table<ContributionView>
        rowKey="_id"
        size="small"
        loading={loading}
        dataSource={rows}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 50 }}
        rowSelection={locked ? undefined : { selectedRowKeys: selected, onChange: (keys) => setSelected(keys.map(String)) }}
        columns={[
          { title: 'Ngày đóng', width: 110, render: (_: unknown, row: ContributionView) => formatDate(row.contributionDate) },
          { title: 'Thành viên', width: 200, render: (_: unknown, row: ContributionView) => <div><strong>{row.member?.fullName}</strong><div className="text-xs text-gray-500">{row.member?.memberCode}</div></div> },
          { title: 'Số tiền', width: 120, align: 'right' as const, render: (_: unknown, row: ContributionView) => <strong>{money(row.amount)}</strong> },
          { title: 'Minh chứng', width: 220, render: (_: unknown, row: ContributionView) => <FileThumbs files={row.files} /> },
          { title: 'Ghi chú', render: (_: unknown, row: ContributionView) => <div className="max-w-xs whitespace-pre-wrap text-sm">{row.note || '—'}{row.reviewNote && <div className="text-xs text-red-500">Phản hồi: {row.reviewNote}</div>}</div> },
          { title: 'Gửi lúc', width: 140, render: (_: unknown, row: ContributionView) => formatDateTime(row.submittedAt) },
          { title: 'Trạng thái', width: 120, render: (_: unknown, row: ContributionView) => <Tag color={FUND_STATUS_COLOR[row.status]}>{FUND_STATUS_LABEL[row.status]}</Tag> },
          {
            title: '', width: 150, render: (_: unknown, row: ContributionView) => locked ? null : (
              <Space>
                {row.status !== 'DONE' && <Button size="small" type="primary" onClick={() => review([row._id], 'DONE')}>Duyệt</Button>}
                {row.status !== 'NOT_DONE' && <Button size="small" danger onClick={() => setRejecting([row._id])}>Từ chối</Button>}
              </Space>
            )
          }
        ]}
      />
    </div>
  );

  const statsTab = stats && (
    <div className="space-y-4">
      <Table
        rowKey="date"
        size="small"
        title={() => <strong>Theo ngày</strong>}
        dataSource={stats.byDate}
        pagination={false}
        onRow={(row) => ({ onClick: () => { setDate(row.date); setStatus('ALL'); }, className: 'cursor-pointer' })}
        columns={[
          { title: 'Ngày', dataIndex: 'date', render: (value: string) => formatDate(value) },
          { title: 'Số minh chứng', dataIndex: 'total' },
          { title: 'Chờ duyệt', dataIndex: 'pending', render: (value: number) => value ? <Tag color="gold">{value}</Tag> : 0 },
          { title: 'Đã duyệt', dataIndex: 'done' },
          { title: 'Không hợp lệ', dataIndex: 'notDone' },
          { title: 'Tiền đã duyệt', dataIndex: 'amount', align: 'right' as const, render: (value: number) => money(value) }
        ]}
      />
      <Table
        rowKey={(row) => row.member._id}
        size="small"
        title={() => <strong>Theo mentee (mức {money(stats.target.minApprovedAmount)}/tháng)</strong>}
        dataSource={stats.members}
        pagination={{ pageSize: 30 }}
        columns={[
          { title: 'Mentee', render: (_: unknown, row: FundStats['members'][number]) => <div>{row.member.fullName}<div className="text-xs text-gray-500">{row.member.memberCode}</div></div> },
          { title: 'Đã duyệt', align: 'right' as const, sorter: (a: FundStats['members'][number], b: FundStats['members'][number]) => a.approved - b.approved, render: (_: unknown, row: FundStats['members'][number]) => money(row.approved) },
          { title: 'Chờ duyệt', align: 'right' as const, render: (_: unknown, row: FundStats['members'][number]) => money(row.pending) },
          { title: 'Tiến độ', width: 200, render: (_: unknown, row: FundStats['members'][number]) => <Progress size="small" percent={Math.min(100, Math.round((row.approved / Math.max(1, stats.target.minApprovedAmount)) * 100))} status={row.reached ? 'success' : 'active'} /> },
          { title: '', render: (_: unknown, row: FundStats['members'][number]) => row.count === 0 ? <Tag color="red">Chưa đóng</Tag> : row.reached ? <Tag color="green">Đạt</Tag> : <Tag color="gold">Chưa đủ</Tag> }
        ]}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Typography.Title level={3} className="!mb-0">Duyệt HLC Fund</Typography.Title>
        <MonthPicker value={code} onChange={(value) => { setCode(value); setDate(''); }} />
        {locked && <Tag color="purple">Kỳ đã chốt</Tag>}
      </div>
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <Card size="small"><Statistic title="Chờ duyệt" value={stats.totals.pending} /></Card>
          <Card size="small"><Statistic title="Tiền đã duyệt" value={money(stats.totals.approvedAmount)} /></Card>
          <Card size="small"><Statistic title="Mentee đạt mức" value={stats.totals.reached} suffix={`/ ${stats.totals.mentees}`} /></Card>
          <Card size="small"><Statistic title="Chưa đóng" value={stats.totals.notContributed} /></Card>
          <Card size="small"><Statistic title="Tổng minh chứng" value={stats.totals.contributions} /></Card>
        </div>
      )}
      <Card>
        <ResponsiveTabs defaultActiveKey={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') ?? 'list' : 'list'} items={[
          { key: 'list', label: date ? `Minh chứng ngày ${formatDate(date)}` : 'Minh chứng', children: listTab },
          { key: 'stats', label: 'Thống kê tháng', children: statsTab },
          { key: 'fund-groups', label: 'Nhóm MTO & thầy cô', children: <FundGroupReport fixedKind="FUND" /> },
          { key: 'mte-groups', label: 'Nhóm MTE', children: <FundGroupReport fixedKind="MENTEE" /> },
          { key: 'ledger', label: 'Dashboard thu chi', children: <FundLedgerPanel /> }
        ]} />
      </Card>
      <Modal title={`Từ chối ${rejecting?.length ?? 0} minh chứng`} open={Boolean(rejecting)} onCancel={() => setRejecting(null)} onOk={() => rejecting && review(rejecting, 'NOT_DONE', note)} okText="Từ chối" okButtonProps={{ danger: true }} confirmLoading={saving} destroyOnHidden>
        <Input.TextArea rows={3} placeholder="Lý do (mentee sẽ thấy để gửi lại)" value={note} onChange={(event) => setNote(event.target.value)} />
      </Modal>
    </div>
  );
}
