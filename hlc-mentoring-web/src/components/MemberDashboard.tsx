'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, App, Button, Card, Empty, Form, Input, InputNumber, Modal, Progress, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { TrophyOutlined } from '@ant-design/icons';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { errorMessage } from '@/lib/api';
import { PAIR_STATUS_COLOR, PAIR_STATUS_LABEL, ROLE_STATUS_COLOR, ROLE_STATUS_LABEL, formatDateTime } from '@/services/mentoringApi';
import { SOURCE_TYPE_LABEL, dashboardApi, money, periodLabel, pointApi, points, type MyDashboard, type MyPoints, type PointEntryView } from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

const RANK = ['', 'Giải nhất', 'Giải nhì', 'Giải ba'];

export default function MemberDashboard({ role }: { role: 'MENTOR' | 'MENTEE' }) {
  const { message } = App.useApp();
  const [code, setCode] = useState(() => currentPeriodCode(getCurrentTime()));
  const [data, setData] = useState<MyDashboard | null>(null);
  const [appeals, setAppeals] = useState<MyPoints['adjustments']>([]);
  const [loading, setLoading] = useState(true);
  const [appealOpen, setAppealOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm();

  const load = useCallback(async () => {
    try {
      const [dashboard, mine] = await Promise.all([dashboardApi.mine(code), pointApi.mine(code)]);
      setData(dashboard);
      setAppeals(mine.adjustments.filter((item) => item.kind === 'APPEAL'));
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được tổng quan'));
    } finally {
      setLoading(false);
    }
  }, [code, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const sendAppeal = async (values: { points: number; reason: string }) => {
    setSaving(true);
    try {
      await pointApi.appeal(code, values);
      message.success('Đã gửi khiếu nại, chờ admin xử lý');
      setAppealOpen(false);
      await load();
    } catch (error) {
      message.error(errorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) return <Card className="flex justify-center py-12"><Spin size="large" /></Card>;
  if (!data) return <Card><Empty description="Chưa có dữ liệu" /></Card>;
  const base = role === 'MENTOR' ? '/mentor' : '/mentee';
  const fundPercent = Math.min(100, Math.round((data.fund.approvedAmount / Math.max(1, data.fund.target.minApprovedAmount)) * 100));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Typography.Title level={3} className="!mb-0">Tổng quan {periodLabel(data.period.code).toLowerCase()}</Typography.Title>
        <MonthPicker value={code} onChange={setCode} />
        {data.period.isLocked && <Tag color="purple">Đã chốt điểm</Tag>}
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Card size="small"><Statistic title="Điểm phụ cấp" value={points(data.points.totalPoints)} prefix={<TrophyOutlined />} /></Card>
        <Card size="small"><Statistic title="Phụ cấp dự kiến" value={money(data.points.amount)} /></Card>
        <Card size="small"><Statistic title="Buổi mentoring" value={data.mentoring.length} /></Card>
        <Card size="small"><Statistic title="Bài học tập chờ duyệt" value={data.learning.reduce((sum, item) => sum + item.pending, 0)} /></Card>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <Card title="Mentoring tháng này" extra={<Link href={`${base}-mentoring`}>Mở</Link>}>
          {data.mentoring.length ? data.mentoring.map((item) => (
            <div key={item.sessionId} className="mb-2 rounded-lg border border-gray-100 p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{item.partner?.fullName ?? '—'}</strong>
                <div className="flex gap-1">
                  {item.awardRank && <Tag color="gold">{RANK[item.awardRank]}</Tag>}
                  <Tag color={PAIR_STATUS_COLOR[item.status]}>Cặp: {PAIR_STATUS_LABEL[item.status]}</Tag>
                </div>
              </div>
              <div className="text-sm text-gray-500">Lịch: {formatDateTime(item.scheduledStartAt)} · Hạn recap: {formatDateTime(item.recapDeadlineAt)}</div>
              <div className="mt-1 text-sm">Recap của bạn: <Tag color={ROLE_STATUS_COLOR[item.myStatus]}>{ROLE_STATUS_LABEL[item.myStatus]}</Tag></div>
            </div>
          )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có buổi mentoring trong tháng" />}
        </Card>

        <Card title="Học tập" extra={<Link href={`${base}-learning`}>Mở</Link>}>
          {data.learning.length ? data.learning.map((item) => {
            const goal = item.currentCycle.min || item.currentCycle.max || 1;
            return (
              <div key={item.module._id} className="mb-2">
                <div className="flex justify-between text-sm"><span>{item.module.name} <span className="text-gray-400">({item.currentCycle.cycleKey})</span></span>{item.lastScore !== null && <span>Điểm gần nhất: <strong>{points(item.lastScore)}</strong></span>}</div>
                <Progress size="small" percent={Math.min(100, Math.round((item.currentCycle.submitted / goal) * 100))} format={() => (item.currentCycle.submitted >= goal ? `${item.currentCycle.submitted} bài` : `${item.currentCycle.submitted}/${goal}`)} status={item.currentCycle.min && item.currentCycle.submitted >= item.currentCycle.min ? 'success' : 'active'} />
              </div>
            );
          }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
        </Card>

        {role === 'MENTEE' && (
          <Card title="HLC Fund" extra={<Link href="/mentee-fund">Gửi minh chứng</Link>}>
            <div className="flex flex-wrap items-center gap-4">
              <Progress type="circle" size={90} percent={fundPercent} status={data.fund.reached ? 'success' : 'active'} />
              <div>
                <div>Đã duyệt <strong>{money(data.fund.approvedAmount)}</strong> / {money(data.fund.target.minApprovedAmount)}</div>
                {data.fund.pendingAmount > 0 && <div className="text-gray-500">Chờ duyệt {money(data.fund.pendingAmount)}</div>}
                {data.fund.reached ? <Tag color="green">Đã đạt +{data.fund.target.points} điểm</Tag> : <Tag color="gold">Chưa đạt mức</Tag>}
              </div>
            </div>
          </Card>
        )}

        <Card title="Lịch sử phụ cấp">
          <Table rowKey="periodCode" size="small" pagination={false} dataSource={data.points.history} locale={{ emptyText: 'Chưa có' }} columns={[
            { title: 'Kỳ', dataIndex: 'periodCode', render: (value: string) => periodLabel(value) },
            { title: 'Điểm', dataIndex: 'totalPoints', render: (value: number) => points(value) },
            { title: 'Thành tiền', dataIndex: 'amount', render: (value: number) => money(value) },
            { title: '', dataIndex: 'status', render: (value: string) => <Tag color={value === 'PAID' ? 'green' : value === 'LOCKED' ? 'purple' : 'default'}>{value === 'PAID' ? 'Đã chi' : value === 'LOCKED' ? 'Đã chốt' : 'Tạm tính'}</Tag> }
          ]} />
        </Card>
      </div>

      <Card title="Chi tiết điểm tháng" extra={<Button size="small" disabled={data.period.isLocked} onClick={() => { form.resetFields(); setAppealOpen(true); }}>Khiếu nại điểm</Button>}>
        <Table<PointEntryView> rowKey="_id" size="small" pagination={false} dataSource={data.points.entries} locale={{ emptyText: 'Chưa có điểm trong tháng' }} scroll={{ x: 'max-content' }} columns={[
          { title: 'Loại', render: (_: unknown, row: PointEntryView) => <div>{row.pointType?.name}<div className="text-xs text-gray-500">{SOURCE_TYPE_LABEL[row.sourceType] ?? row.sourceType}</div></div> },
          { title: 'Diễn giải', dataIndex: 'description' },
          { title: 'Điểm', align: 'right' as const, render: (_: unknown, row: PointEntryView) => <strong className={row.points < 0 ? 'text-red-500' : 'text-green-600'}>{row.points > 0 ? '+' : ''}{points(row.points)}</strong> }
        ]} />
        {appeals.length > 0 && (
          <div className="mt-4 space-y-2">
            <Typography.Text strong>Khiếu nại đã gửi</Typography.Text>
            {appeals.map((item) => (
              <Alert key={item._id} type={item.status === 'APPROVED' ? 'success' : item.status === 'REJECTED' ? 'error' : 'info'} showIcon
                title={`${item.points > 0 ? '+' : ''}${points(item.points)} điểm · ${item.status === 'PENDING' ? 'Chờ xử lý' : item.status === 'APPROVED' ? 'Đã chấp nhận' : 'Không chấp nhận'}`}
                description={<div>{item.reason}{item.reviewNote && <div className="text-xs">Phản hồi: {item.reviewNote}</div>}</div>} />
            ))}
          </div>
        )}
      </Card>

      <Modal title="Khiếu nại điểm" open={appealOpen} onCancel={() => setAppealOpen(false)} onOk={() => form.submit()} okText="Gửi" confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={sendAppeal}>
          <Form.Item name="points" label="Số điểm đề nghị cộng (âm nếu đề nghị trừ)" rules={[{ required: true }]}><InputNumber className="w-full" step={0.5} /></Form.Item>
          <Form.Item name="reason" label="Lý do / minh chứng" rules={[{ required: true, message: 'Nhập lý do' }]}><Input.TextArea rows={4} placeholder="Ví dụ: Buổi T10... em đã nộp recap ngày 05/10 nhưng chưa được tính điểm sớm" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
