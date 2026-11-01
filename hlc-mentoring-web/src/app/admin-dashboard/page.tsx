'use client';

import { useEffect, useState } from 'react';
import { Alert, App, Card, Empty, Progress, Spin, Table, Tag } from 'antd';
import {
  CheckCircleOutlined,
  DollarOutlined,
  ReadOutlined,
  ScheduleOutlined,
  TeamOutlined,
  WalletOutlined
} from '@ant-design/icons';
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, BarElement, Tooltip } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import { Avatar, DashHeader, KpiCard, StatusBar, deltaOf } from '@/components/dashboard/DashParts';
import { CHART_COLORS, applyChartTheme } from '@/lib/chartTheme';
import { errorMessage } from '@/lib/api';
import { PAIR_STATUS_COLOR, PAIR_STATUS_LABEL, formatDateTime } from '@/services/mentoringApi';
import { PERIOD_STATUS_COLOR, PERIOD_STATUS_LABEL, dashboardApi, money, periodLabel, points, type AdminDashboard, type DashboardPair } from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';
import PhoneLink from '@/components/PhoneLink';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);
applyChartTheme();

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
    {
      title: 'Cặp',
      dataIndex: 'code',
      render: (value: string, row: DashboardPair) => (
        <div className="flex flex-wrap items-center gap-2">
          {row.rank ? <Tag color="gold" className="!m-0">{RANK[row.rank]}</Tag> : null}
          <code className="text-xs">{value}</code>
        </div>
      )
    },
    {
      title: 'Mentor · Mentee',
      render: (_: unknown, row: DashboardPair) => (
        <div className="leading-snug">
          <div><span className="text-gray-500">Mentor:</span> <strong>{row.mentor?.fullName}</strong> <PhoneLink phone={row.mentor?.phone} hidden={row.mentor?.phoneHidden} empty="" /></div>
          <div><span className="text-gray-500">Mentee:</span> <strong>{row.mentee?.fullName}</strong> <PhoneLink phone={row.mentee?.phone} hidden={row.mentee?.phoneHidden} empty="" /></div>
        </div>
      )
    },
    { title: 'Lịch', render: (_: unknown, row: DashboardPair) => formatDateTime(row.scheduledStartAt) },
    { title: 'Trạng thái', render: (_: unknown, row: DashboardPair) => <Tag color={PAIR_STATUS_COLOR[row.status]}>{PAIR_STATUS_LABEL[row.status]}</Tag> }
  ];

  // Kỳ liền trước (theo mã YYYY-MM) trong dữ liệu xu hướng, dùng để tính mức tăng giảm
  const previous = data?.trend.filter((item) => item.period < code).sort((a, b) => a.period.localeCompare(b.period)).at(-1);
  const sessions = data?.mentoring.sessions ?? 0;
  const prevDoneRate = previous && previous.mentoringSessions ? (previous.mentoringDone / previous.mentoringSessions) * 100 : undefined;
  const submissionsTotal = data?.learning.reduce((sum, item) => sum + item.submissions, 0) ?? 0;

  return (
    <div className="dash">
      <DashHeader title="Dashboard tháng" subtitle={data ? `Tổng quan hoạt động ${periodLabel(data.period.code).toLowerCase()}` : 'Tổng quan hoạt động trong tháng'}>
        <MonthPicker value={code} onChange={setCode} />
        {data && <Tag color={PERIOD_STATUS_COLOR[data.period.status]} className="!m-0 !px-3 !py-1 !text-sm">{PERIOD_STATUS_LABEL[data.period.status]}</Tag>}
      </DashHeader>

      {loading && !data ? <Card className="flex justify-center py-12"><Spin size="large" /></Card> : data && (
        <>
          <div className="kpi-grid kpi-3">
            <KpiCard tone="purple" icon={<TeamOutlined />} label="Thành viên hoạt động" value={data.members.total} hint={`${data.members.mentees} mentee · ${data.members.mentors} mentor`} />
            <KpiCard tone="blue" icon={<ScheduleOutlined />} label="Buổi mentoring" value={sessions} delta={deltaOf(sessions, previous?.mentoringSessions)} hint="Chưa có dữ liệu tháng trước" />
            <KpiCard tone="green" icon={<CheckCircleOutlined />} label="Tỉ lệ cặp đã xong" value={data.mentoring.doneRate} unit="%" delta={deltaOf(data.mentoring.doneRate, prevDoneRate, true)} hint="Chưa có dữ liệu tháng trước" />
            <KpiCard tone="orange" icon={<ReadOutlined />} label="Bài nộp học tập" value={submissionsTotal} delta={deltaOf(submissionsTotal, previous?.submissions)} hint="Chưa có dữ liệu tháng trước" />
            <KpiCard tone="teal" icon={<WalletOutlined />} label="Quỹ đã ghi nhận" value={money(data.fund.totals.approvedAmount)} delta={deltaOf(data.fund.totals.approvedAmount, previous?.fundAmount)} hint="Chưa có dữ liệu tháng trước" />
            <KpiCard tone="rose" icon={<DollarOutlined />} label="Tổng chi phụ cấp" value={money(data.points.totals.amount)} delta={deltaOf(data.points.totals.amount, previous?.totalAmount)} hint="Chưa có dữ liệu tháng trước" />
          </div>

          {data.points.totals.pendingAdjustments > 0 && <Alert type="warning" showIcon title={`Có ${data.points.totals.pendingAdjustments} khiếu nại điểm đang chờ xử lý.`} />}

          <div className="dash-grid cols-21">
            <Card title="Mentoring trong tháng">
              {sessions ? <StatusBar counts={data.mentoring.statusCount} /> : <p className="dash-note">Chưa có buổi mentoring trong tháng.</p>}
              <h3 className="dash-subtitle">Cặp xuất sắc</h3>
              <Table rowKey="sessionId" pagination={false} dataSource={data.mentoring.bestPairs} columns={pairColumns} locale={{ emptyText: 'Chưa xếp giải (bấm “Tính lại” ở trang Điểm)' }} scroll={{ x: 'max-content' }} />
              <h3 className="dash-subtitle">Cặp chưa hoạt động / chưa xong</h3>
              <Table rowKey="sessionId" pagination={{ pageSize: 5, hideOnSinglePage: true }} dataSource={data.mentoring.inactivePairs} columns={pairColumns} locale={{ emptyText: 'Không có' }} scroll={{ x: 'max-content' }} />
            </Card>

            <div className="flex flex-col gap-5">
              <Card title="Top thành viên">
                {data.points.topMembers.length ? (
                  <ol className="rank-list">
                    {data.points.topMembers.map((row, index) => (
                      <li key={row.member._id} className="rank-item">
                        <span className="rank-no">{index + 1}</span>
                        <Avatar name={row.member.fullName} />
                        <span className="rank-name">{row.member.fullName}</span>
                        <span className="rank-score">{points(row.totalPoints)} <span className="font-normal text-gray-500">điểm</span></span>
                      </li>
                    ))}
                  </ol>
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              </Card>
              <Card title="Cần cải thiện">
                {data.points.needImprovement.length ? (
                  <ol className="rank-list">
                    {data.points.needImprovement.map((row) => (
                      <li key={row.member._id} className="rank-item">
                        <Avatar name={row.member.fullName} />
                        <span className="rank-name">{row.member.fullName}</span>
                        <span className="rank-score bad">{points(row.totalPoints)} <span className="font-normal text-gray-500">điểm</span></span>
                      </li>
                    ))}
                  </ol>
                ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />}
              </Card>
            </div>
          </div>

          <div className="dash-grid cols-32">
            <Card title="Học tập">
              <Table rowKey={(row) => row.module._id} pagination={false} dataSource={data.learning} locale={{ emptyText: 'Chưa có module' }} columns={[
                { title: 'Module', render: (_: unknown, row: AdminDashboard['learning'][number]) => <div className="leading-snug"><strong>{row.module.name}</strong><div className="text-xs text-gray-500">{row.submitters} người nộp</div></div> },
                { title: 'Bài nộp', dataIndex: 'submissions', align: 'right' as const },
                { title: 'Đã duyệt', render: (_: unknown, row: AdminDashboard['learning'][number]) => <Progress percent={row.submissions ? Math.round((row.approved / row.submissions) * 100) : 0} size={[70, 8]} /> },
                { title: 'Chờ duyệt', dataIndex: 'pending', align: 'right' as const, render: (value: number) => value ? <Tag color="gold" className="!m-0">{value}</Tag> : 0 },
                { title: 'Điểm TB', dataIndex: 'averageScore', align: 'right' as const, render: (value: number | null) => value === null ? '—' : points(value) }
              ]} />
            </Card>

            <Card title={`HLC Fund · mức ${money(data.fund.target.minApprovedAmount)}`}>
              <div className="fund-box">
                <Progress type="dashboard" size={150} percent={data.fund.totals.mentees ? Math.round((data.fund.totals.reached / data.fund.totals.mentees) * 100) : 0} />
                <div className="fund-stats">
                  <div><span className="dash-note">Tổng đã ghi nhận</span><strong className="!text-2xl">{money(data.fund.totals.approvedAmount)}</strong></div>
                  <div><span className="dash-note">Mentee đạt mức</span><strong>{data.fund.totals.reached}/{data.fund.totals.mentees}</strong></div>
                  <div><span className="dash-note">Chưa có ghi nhận</span><strong>{data.fund.totals.notContributed}</strong></div>
                  <div><span className="dash-note">Khoản đang chờ xác nhận</span><strong>{data.fund.totals.pending}</strong></div>
                </div>
              </div>
            </Card>
          </div>

          {data.trend.length > 1 && (
            <div className="dash-grid cols-2">
              <Card title="Xu hướng điểm & chi phụ cấp">
                <div className="chart-box">
                  <Line
                    data={{
                      labels: data.trend.map((item) => periodLabel(item.period).replace('Tháng ', 'T')),
                      datasets: [
                        { label: 'Tổng điểm', data: data.trend.map((item) => item.totalPoints), borderColor: CHART_COLORS.primary, backgroundColor: CHART_COLORS.primary, yAxisID: 'y', tension: 0.35, borderWidth: 3, pointRadius: 4, pointHoverRadius: 6 },
                        { label: 'Chi phụ cấp (nghìn đ)', data: data.trend.map((item) => Math.round(item.totalAmount / 1000)), borderColor: CHART_COLORS.green, backgroundColor: CHART_COLORS.green, yAxisID: 'y1', tension: 0.35, borderWidth: 3, pointRadius: 4, pointHoverRadius: 6 }
                      ]
                    }}
                    options={{ maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { position: 'left', beginAtZero: true }, y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false } }, x: { grid: { display: false } } } }}
                  />
                </div>
              </Card>
              <Card title="Hoạt động theo tháng">
                <div className="chart-box">
                  <Bar
                    data={{
                      labels: data.trend.map((item) => periodLabel(item.period).replace('Tháng ', 'T')),
                      datasets: [
                        { label: 'Buổi mentoring', data: data.trend.map((item) => item.mentoringSessions), backgroundColor: CHART_COLORS.primarySoft, borderRadius: 6, maxBarThickness: 30 },
                        { label: 'Cặp đã xong', data: data.trend.map((item) => item.mentoringDone), backgroundColor: CHART_COLORS.primary, borderRadius: 6, maxBarThickness: 30 },
                        { label: 'Bài nộp học tập', data: data.trend.map((item) => item.submissions), backgroundColor: CHART_COLORS.navy, borderRadius: 6, maxBarThickness: 30 }
                      ]
                    }}
                    options={{ maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { beginAtZero: true }, x: { grid: { display: false } } } }}
                  />
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
