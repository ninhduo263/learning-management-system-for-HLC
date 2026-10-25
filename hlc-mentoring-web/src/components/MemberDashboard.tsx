'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, App, Button, Card, Empty, Form, Input, InputNumber, Modal, Progress, Spin, Table, Tag, Typography } from 'antd';
import { DollarOutlined, ReadOutlined, ScheduleOutlined, TrophyOutlined } from '@ant-design/icons';
import { Avatar, DashHeader, KpiCard } from '@/components/dashboard/DashParts';
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
    <div className="dash">
      <DashHeader title={`Tổng quan ${periodLabel(data.period.code).toLowerCase()}`} subtitle={`Xin chào ${data.member.fullName}, đây là tình hình hoạt động của bạn`}>
        <MonthPicker value={code} onChange={setCode} />
        {data.period.isLocked && <Tag color="purple" className="!m-0 !px-3 !py-1 !text-sm">Đã chốt điểm</Tag>}
      </DashHeader>

      <div className="kpi-grid">
        <KpiCard tone="purple" icon={<TrophyOutlined />} label="Điểm phụ cấp" value={points(data.points.totalPoints)} unit="điểm" hint="Cộng dồn trong tháng" />
        <KpiCard tone="teal" icon={<DollarOutlined />} label="Phụ cấp dự kiến" value={money(data.points.amount)} hint={data.period.isLocked ? 'Đã chốt' : 'Tạm tính, có thể thay đổi'} />
        <KpiCard tone="blue" icon={<ScheduleOutlined />} label="Buổi mentoring" value={data.mentoring.length} hint="Trong tháng này" />
        <KpiCard tone="orange" icon={<ReadOutlined />} label="Bài học tập chờ duyệt" value={data.learning.reduce((sum, item) => sum + item.pending, 0)} hint="Đang chờ admin duyệt" />
      </div>

      <div className="dash-grid cols-2">
        <Card title="Mentoring tháng này" extra={<Link href={`${base}-mentoring`}>Mở trang mentoring</Link>}>
          {data.mentoring.length ? data.mentoring.map((item) => (
            <div key={item.sessionId} className="session-item">
              <Avatar name={item.partner?.fullName} />
              <div className="session-main">
                <div className="session-name">{item.partner?.fullName ?? '—'}</div>
                <div className="session-meta">
                  <span>Lịch: <b>{formatDateTime(item.scheduledStartAt)}</b></span>
                  <span>Hạn recap: <b>{formatDateTime(item.recapDeadlineAt)}</b></span>
                </div>
                <div className="session-tags">
                  {item.awardRank && <Tag color="gold" className="!m-0">{RANK[item.awardRank]}</Tag>}
                  <Tag color={PAIR_STATUS_COLOR[item.status]} className="!m-0">Cặp: {PAIR_STATUS_LABEL[item.status]}</Tag>
                  <Tag color={ROLE_STATUS_COLOR[item.myStatus]} className="!m-0">Recap của bạn: {ROLE_STATUS_LABEL[item.myStatus]}</Tag>
                </div>
              </div>
            </div>
          )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có buổi mentoring trong tháng" />}
        </Card>

        <div className="flex flex-col gap-5">
          <Card title="Học tập" extra={<Link href={`${base}-learning`}>Mở trang học tập</Link>}>
            {data.learning.length ? data.learning.map((item) => {
              const goal = item.currentCycle.min || item.currentCycle.max || 1;
              return (
                <div key={item.module._id} className="learn-row">
                  <div className="learn-head">
                    <span><strong>{item.module.name}</strong> <em>({item.currentCycle.cycleKey})</em></span>
                    {item.lastScore !== null && <span>Điểm gần nhất: <strong>{points(item.lastScore)}</strong></span>}
                  </div>
                  <Progress percent={Math.min(100, Math.round((item.currentCycle.submitted / goal) * 100))} format={() => (item.currentCycle.submitted >= goal ? `${item.currentCycle.submitted} bài` : `${item.currentCycle.submitted}/${goal}`)} status={item.currentCycle.min && item.currentCycle.submitted >= item.currentCycle.min ? 'success' : 'active'} />
                </div>
              );
            }) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
          </Card>

          {role === 'MENTEE' && (
            <Card title="HLC Fund" extra={<Link href="/mentee-fund">Gửi minh chứng</Link>}>
              <div className="fund-box">
                <Progress type="circle" size={110} percent={fundPercent} status={data.fund.reached ? 'success' : 'active'} />
                <div className="fund-stats">
                  <div><span className="dash-note">Đã ghi nhận</span><strong>{money(data.fund.approvedAmount)}</strong><span className="dash-note">/ {money(data.fund.target.minApprovedAmount)}</span></div>
                  {data.fund.pendingAmount > 0 && <div><span className="dash-note">Đang chờ xác nhận</span><strong>{money(data.fund.pendingAmount)}</strong></div>}
                  <div>{data.fund.reached ? <Tag color="green" className="!m-0">Đã đạt +{data.fund.target.points} điểm</Tag> : <Tag color="gold" className="!m-0">Chưa đạt mức</Tag>}</div>
                </div>
              </div>
            </Card>
          )}
        </div>
      </div>

      <div className="dash-grid cols-2">
        <Card title="Lịch sử phụ cấp">
          <Table rowKey="periodCode" pagination={false} dataSource={data.points.history} locale={{ emptyText: 'Chưa có' }} columns={[
            { title: 'Kỳ', dataIndex: 'periodCode', render: (value: string) => periodLabel(value) },
            { title: 'Điểm', dataIndex: 'totalPoints', align: 'right' as const, render: (value: number) => points(value) },
            { title: 'Thành tiền', dataIndex: 'amount', align: 'right' as const, render: (value: number) => money(value) },
            { title: '', dataIndex: 'status', render: (value: string) => <Tag color={value === 'PAID' ? 'green' : value === 'LOCKED' ? 'purple' : 'default'} className="!m-0">{value === 'PAID' ? 'Đã chi' : value === 'LOCKED' ? 'Đã chốt' : 'Tạm tính'}</Tag> }
          ]} />
        </Card>

        <Card title="Chi tiết điểm tháng" extra={<Button disabled={data.period.isLocked} onClick={() => { form.resetFields(); setAppealOpen(true); }}>Khiếu nại điểm</Button>}>
          <Table<PointEntryView> rowKey="_id" pagination={false} dataSource={data.points.entries} locale={{ emptyText: 'Chưa có điểm trong tháng' }} scroll={{ x: 'max-content' }} columns={[
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
      </div>

      <Modal title="Khiếu nại điểm" open={appealOpen} onCancel={() => setAppealOpen(false)} onOk={() => form.submit()} okText="Gửi" confirmLoading={saving} destroyOnHidden>
        <Form form={form} layout="vertical" onFinish={sendAppeal}>
          <Form.Item name="points" label="Số điểm đề nghị cộng (âm nếu đề nghị trừ)" rules={[{ required: true }]}><InputNumber className="w-full" step={0.5} /></Form.Item>
          <Form.Item name="reason" label="Lý do / minh chứng" rules={[{ required: true, message: 'Nhập lý do' }]}><Input.TextArea rows={4} placeholder="Ví dụ: Buổi T10... em đã nộp recap ngày 05/10 nhưng chưa được tính điểm sớm" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
