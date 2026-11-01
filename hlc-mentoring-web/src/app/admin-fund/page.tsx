'use client';

import { useCallback, useEffect, useState } from 'react';
import { App, Button, Card, DatePicker, Input, Modal, Progress, Segmented, Space, Statistic, Table, Tag, Typography } from 'antd';
import { CheckOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import FundGroupReport from '@/components/FundGroupReport';
import PhoneLink from '@/components/PhoneLink';
import { EvidenceButton, FundStatusTag } from '@/components/fund/FundStatus';
import ResponsiveTabs from '@/components/ResponsiveTabs';
import FundLedgerPanel from '@/components/FundLedgerPanel';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { errorMessage } from '@/lib/api';
import { formatDateTime } from '@/services/mentoringApi';
import { formatDate, fundApi, money, periodLabel, type ContributionView, type FundStats } from '@/services/hlcApi';
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
      message.success(nextStatus === 'DONE' ? `Đã ghi nhận ${result.updated} khoản đóng góp vào sổ quỹ` : `Đã chuyển ${result.updated} khoản về "Chưa ghi nhận" để người nộp bổ sung`);
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
          { value: 'PENDING', label: 'Đang chờ xác nhận' }, { value: 'DONE', label: 'Đã ghi nhận' }, { value: 'NOT_DONE', label: 'Chưa ghi nhận (cần bổ sung)' }, { value: 'ALL', label: 'Tất cả' }
        ]} />
        <div className="flex-1" />
        <Space wrap>
          <Button type="primary" icon={<CheckOutlined />} disabled={!selected.length || locked} loading={saving} onClick={() => review(selected, 'DONE')}>Ghi nhận {selected.length || ''} khoản</Button>
          <Button disabled={!selected.length || locked} onClick={() => setRejecting(selected)}>Chưa ghi nhận</Button>
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
          { title: 'Ảnh minh chứng', width: 200, render: (_: unknown, row: ContributionView) => <EvidenceButton files={row.files} /> },
          { title: 'Ghi chú', render: (_: unknown, row: ContributionView) => <div className="max-w-xs whitespace-pre-wrap text-sm">{row.note || '—'}{row.reviewNote && <div className="text-sm text-gray-600">Lời nhắn: {row.reviewNote}</div>}</div> },
          { title: 'Gửi lúc', width: 140, render: (_: unknown, row: ContributionView) => formatDateTime(row.submittedAt) },
          { title: 'Trạng thái', width: 190, render: (_: unknown, row: ContributionView) => <FundStatusTag status={row.status} detail /> },
          {
            title: '', width: 150, render: (_: unknown, row: ContributionView) => locked ? null : (
              <Space>
                {row.status !== 'DONE' && <Button type="primary" onClick={() => review([row._id], 'DONE')}>Ghi nhận</Button>}
                {row.status === 'PENDING' && <Button onClick={() => setRejecting([row._id])}>Chưa ghi nhận</Button>}
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
          { title: 'Số khoản', dataIndex: 'total' },
          { title: 'Đang chờ xác nhận', dataIndex: 'pending', render: (value: number) => value || '—' },
          { title: 'Đã ghi nhận', dataIndex: 'done' },
          { title: 'Chưa ghi nhận', dataIndex: 'notDone', render: (value: number) => value || '—' },
          { title: 'Tiền đã ghi nhận', dataIndex: 'amount', align: 'right' as const, render: (value: number) => money(value) }
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
          { title: 'SĐT / Zalo', render: (_: unknown, row: FundStats['members'][number]) => <PhoneLink phone={row.member.phone} hidden={row.member.phoneHidden} empty="" /> },
          { title: 'Đã ghi nhận', align: 'right' as const, sorter: (a: FundStats['members'][number], b: FundStats['members'][number]) => a.approved - b.approved, render: (_: unknown, row: FundStats['members'][number]) => money(row.approved) },
          { title: 'Đang chờ xác nhận', align: 'right' as const, render: (_: unknown, row: FundStats['members'][number]) => row.pending ? money(row.pending) : '—' },
          { title: 'Tiến độ', width: 200, render: (_: unknown, row: FundStats['members'][number]) => <Progress size="small" percent={Math.min(100, Math.round((row.approved / Math.max(1, stats.target.minApprovedAmount)) * 100))} status={row.reached ? 'success' : 'active'} /> },
          { title: '', render: (_: unknown, row: FundStats['members'][number]) => row.count === 0 ? <span className="text-gray-500">Chưa có ghi nhận</span> : row.reached ? <Tag color="green">Đạt mức</Tag> : <span className="text-gray-500">Chưa đủ mức</span> }
        ]}
      />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Typography.Title level={3} className="!mb-0">HLC Fund</Typography.Title>
        <MonthPicker value={code} onChange={(value) => { setCode(value); setDate(''); }} />
        {locked && <Tag color="purple">Kỳ đã chốt</Tag>}
      </div>
      {stats && (
        <>
          {/* Tổng đã ghi nhận nổi bật: minh bạch với nhà tài trợ */}
          <section className="fund-hero" aria-label="Tổng đã ghi nhận">
            <div>
              <div className="fund-hero-label">Tổng đã ghi nhận vào sổ quỹ · {periodLabel(stats.period.code)}</div>
              <div className="fund-hero-value">{money(stats.totals.approvedAmount)}</div>
              <div className="fund-hero-note">{stats.totals.contributions} khoản đóng góp tình nguyện trong tháng</div>
            </div>
            <div className="fund-hero-side">
              <div className="fund-hero-chip">Đang chờ xác nhận<b>{stats.totals.pending} khoản</b></div>
              <div className="fund-hero-chip is-green">Mentee đạt mức<b>{stats.totals.reached} / {stats.totals.mentees}</b></div>
            </div>
          </section>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <Card size="small"><Statistic title="Đang chờ xác nhận" value={stats.totals.pending} suffix="khoản" /></Card>
            <Card size="small"><Statistic title="Tổng số khoản" value={stats.totals.contributions} /></Card>
            <Card size="small"><Statistic title="Mentee chưa có ghi nhận" value={stats.totals.notContributed} /></Card>
          </div>
        </>
      )}
      <Card>
        <ResponsiveTabs defaultActiveKey={typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') ?? 'list' : 'list'} items={[
          { key: 'list', label: date ? `Khoản đóng góp ngày ${formatDate(date)}` : 'Khoản đóng góp', children: listTab },
          { key: 'stats', label: 'Thống kê tháng', children: statsTab },
          { key: 'fund-groups', label: 'Nhóm MTO & thầy cô', children: <FundGroupReport fixedKind="FUND" /> },
          { key: 'mte-groups', label: 'Nhóm MTE', children: <FundGroupReport fixedKind="MENTEE" /> },
          { key: 'ledger', label: 'Dashboard thu chi', children: <FundLedgerPanel /> }
        ]} />
      </Card>
      <Modal title={`Chưa ghi nhận ${rejecting?.length ?? 0} khoản`} open={Boolean(rejecting)} onCancel={() => setRejecting(null)} onOk={() => rejecting && review(rejecting, 'NOT_DONE', note)} okText="Lưu" cancelText="Hủy" confirmLoading={saving} destroyOnHidden>
        <Typography.Paragraph type="secondary">Dùng khi ảnh minh chứng chưa khớp. Người nộp sẽ thấy lời nhắn để bổ sung.</Typography.Paragraph>
        <Input.TextArea rows={3} placeholder="Lời nhắn cho người nộp (ví dụ: ảnh chưa rõ số tiền, nhờ gửi lại giúp)" value={note} onChange={(event) => setNote(event.target.value)} />
      </Modal>
    </div>
  );
}
