'use client';

import { useEffect, useState } from 'react';
import { Alert, App, Card, Empty, Progress, Spin, Statistic, Table, Tag, Typography } from 'antd';
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, BarElement, Tooltip } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { errorMessage } from '@/lib/api';
import { PAIR_STATUS_COLOR, PAIR_STATUS_LABEL, formatDateTime, type PairRecapStatus } from '@/services/mentoringApi';
import { PERIOD_STATUS_COLOR, PERIOD_STATUS_LABEL, dashboardApi, money, periodLabel, points, type AdminDashboard, type DashboardPair } from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

const RANK = ['', '🥇 Nhất', '🥈 Nhì', '🥉 Ba'];

export default function AdminDashboardPage() {
  const { message } = App.useApp();
  const [code, setCode] = useState(() => currentPeriodCode(getCurrentTime()));
  const [data, setData] = useState<AdminDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => { if (active) setLoading(true); return dashboardApi.admin(code); })
      .then((result) => { if (active) setData(result); })
      .catch((error) => message.error(errorMessage(error, 'Không tải được dashboard')))
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [code, message]);

  const pairColumns = [
    { title: 'Mã', dataIndex: 'code', render: (value: string, row: DashboardPair) => <div>{row.rank ? <Tag color="gold">{RANK[row.rank]}</Tag> : null}<code className="text-xs">{value}</code></div> },
    { title: 'Mentor', render: (_: unknown, row: DashboardPair) => row.mentor?.fullName },
    { title: 'Mentee', render: (_: unknown, row: DashboardPair) => row.mentee?.fullName },
    { title: 'Lịch', render: (_: unknown, row: DashboardPair) => formatDateTime(row.scheduledStartAt) },
    { title: 'Trạng thái', render: (_: unknown, row: DashboardPair) => <Tag color={PAIR_STATUS_COLOR[row.status]}>{PAIR_STATUS_LABEL[row.status]}</Tag> }
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Typography.Title level={3} className="!mb-0">Dashboard tháng</Typography.Title>
        <MonthPicker value={code} onChange={setCode} />
        {data && <Tag color={PERIOD_STATUS_COLOR[data.period.status]}>{PERIOD_STATUS_LABEL[data.period.status]}</Tag>}
      </div>
      {loading && !data ? <Card className="flex justify-center py-12"><Spin size="large" /></Card> : data && (
        <>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            <Card size="small"><Statistic title="Thành viên hoạt động" value={data.members.total} suffix={<span className="text-xs text-gray-500">{data.members.mentees} mentee · {data.members.mentors} mentor</span>} /></Card>
            <Card size="small"><Statistic title="Buổi mentoring" value={data.mentoring.sessions} /></Card>
            <Card size="small"><Statistic title="Tỉ lệ cặp đã xong" value={data.mentoring.doneRate} suffix="%" /></Card>
            <Card size="small"><Statistic title="Bài nộp học tập" value={data.learning.reduce((sum, item) => sum + item.submissions, 0)} /></Card>
            <Card size="small"><Statistic title="Quỹ đã duyệt" value={money(data.fund.totals.approvedAmount)} /></Card>
            <Card size="small"><Statistic title="Tổng chi phụ cấp" value={money(data.points.totals.amount)} /></Card>
          </div>
          {data.points.totals.pendingAdjustments > 0 && <Alert type="warning" showIcon title={`Có ${data.points.totals.pendingAdjustments} khiếu nại điểm đang chờ xử lý.`} />}

          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            <Card title="Mentoring">
              <div className="mb-3 flex flex-wrap gap-2">
                {(Object.keys(PAIR_STATUS_LABEL) as PairRecapStatus[]).filter((key) => data.mentoring.statusCount[key]).map((key) => (
                  <Tag key={key} color={PAIR_STATUS_COLOR[key]}>{PAIR_STATUS_LABEL[key]}: {data.mentoring.statusCount[key]}</Tag>
                ))}
                {!data.mentoring.sessions && <Typography.Text type="secondary">Chưa có buổi mentoring trong tháng.</Typography.Text>}
              </div>
              <Typography.Title level={5}>Cặp xuất sắc</Typography.Title>
              <Table rowKey="sessionId" size="small" pagination={false} dataSource={data.mentoring.bestPairs} columns={pairColumns} locale={{ emptyText: 'Chưa xếp giải (bấm “Tính lại” ở trang Điểm)' }} scroll={{ x: 'max-content' }} />
              <Typography.Title level={5} className="!mt-4">Cặp chưa hoạt động / chưa xong</Typography.Title>
              <Table rowKey="sessionId" size="small" pagination={{ pageSize: 5 }} dataSource={data.mentoring.inactivePairs} columns={pairColumns} locale={{ emptyText: 'Không có' }} scroll={{ x: 'max-content' }} />
            </Card>

            <Card title="Điểm phụ cấp">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Typography.Title level={5}>Top thành viên</Typography.Title>
                  {data.points.topMembers.length ? data.points.topMembers.map((row, index) => (
                    <div key={row.member._id} className="flex items-center justify-between border-b border-gray-100 py-1">
                      <span>{index + 1}. {row.member.fullName}</span><strong>{points(row.totalPoints)} điểm</strong>
                    </div>
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                </div>
                <div>
                  <Typography.Title level={5}>Cần cải thiện</Typography.Title>
                  {data.points.needImprovement.length ? data.points.needImprovement.map((row) => (
                    <div key={row.member._id} className="flex items-center justify-between border-b border-gray-100 py-1">
                      <span>{row.member.fullName}</span><span className="text-red-500">{points(row.totalPoints)} điểm</span>
                    </div>
                  )) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
                </div>
              </div>
            </Card>

            <Card title="Học tập">
              <Table rowKey={(row) => row.module._id} size="small" pagination={false} dataSource={data.learning} scroll={{ x: 'max-content' }} columns={[
                { title: 'Module', render: (_: unknown, row: AdminDashboard['learning'][number]) => row.module.name },
                { title: 'Bài nộp', dataIndex: 'submissions' },
                { title: 'Người nộp', dataIndex: 'submitters' },
                { title: 'Chờ duyệt', dataIndex: 'pending', render: (value: number) => value ? <Tag color="gold">{value}</Tag> : 0 },
                { title: 'Điểm TB', dataIndex: 'averageScore', render: (value: number | null) => value === null ? '—' : points(value) }
              ]} />
            </Card>

            <Card title={`HLC Fund · mức ${money(data.fund.target.minApprovedAmount)}`}>
              <div className="flex flex-wrap items-center gap-6">
                <Progress type="dashboard" percent={data.fund.totals.mentees ? Math.round((data.fund.totals.reached / data.fund.totals.mentees) * 100) : 0} />
                <div className="space-y-1">
                  <div>Mentee đạt mức: <strong>{data.fund.totals.reached}/{data.fund.totals.mentees}</strong></div>
                  <div>Chưa đóng: <strong>{data.fund.totals.notContributed}</strong></div>
                  <div>Minh chứng chờ duyệt: <strong>{data.fund.totals.pending}</strong></div>
                </div>
              </div>
            </Card>
          </div>

          {data.trend.length > 1 && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
              <Card title="Xu hướng điểm & chi phụ cấp">
                <Line
                  data={{
                    labels: data.trend.map((item) => periodLabel(item.period).replace('Tháng ', 'T')),
                    datasets: [
                      { label: 'Tổng điểm', data: data.trend.map((item) => item.totalPoints), borderColor: '#6d5dfc', backgroundColor: '#6d5dfc', yAxisID: 'y' },
                      { label: 'Chi phụ cấp (nghìn đ)', data: data.trend.map((item) => Math.round(item.totalAmount / 1000)), borderColor: '#0e9f91', backgroundColor: '#0e9f91', yAxisID: 'y1' }
                    ]
                  }}
                  options={{ responsive: true, scales: { y: { position: 'left' }, y1: { position: 'right', grid: { drawOnChartArea: false } } } }}
                />
              </Card>
              <Card title="Hoạt động theo tháng">
                <Bar
                  data={{
                    labels: data.trend.map((item) => periodLabel(item.period).replace('Tháng ', 'T')),
                    datasets: [
                      { label: 'Buổi mentoring', data: data.trend.map((item) => item.mentoringSessions), backgroundColor: '#c7c0ff' },
                      { label: 'Cặp đã xong', data: data.trend.map((item) => item.mentoringDone), backgroundColor: '#6d5dfc' },
                      { label: 'Bài nộp học tập', data: data.trend.map((item) => item.submissions), backgroundColor: '#ec9a50' }
                    ]
                  }}
                  options={{ responsive: true }}
                />
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
