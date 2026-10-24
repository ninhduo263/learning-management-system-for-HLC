'use client';

import { useCallback, useEffect, useState } from 'react';
import { Alert, App, Button, Card, Empty, Progress, Segmented, Select, Spin, Table, Tag } from 'antd';
import { AuditOutlined, BookOutlined, FileDoneOutlined, StarOutlined, TeamOutlined } from '@ant-design/icons';
import { CategoryScale, Chart as ChartJS, Legend, LinearScale, LineElement, PointElement, BarElement, Tooltip } from 'chart.js';
import { Bar, Line } from 'react-chartjs-2';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import ProposalModal, { type ProposalPreset } from '@/components/ProposalModal';
import { Avatar, DashHeader, KpiCard } from '@/components/dashboard/DashParts';
import { CHART_COLORS, applyChartTheme } from '@/lib/chartTheme';
import { errorMessage } from '@/lib/api';
import {
  dashboardApi, periodLabel, proposalApi,
  type AverageMemberRow, type LearningAverage, type ProposalType
} from '@/services/hlcApi';
import { getCurrentTime, quarterOf } from '@/utils/time';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);
applyChartTheme();

const fmt = (value: number | null | undefined) => (value === null || value === undefined ? '—' : value.toLocaleString('vi-VN', { maximumFractionDigits: 2 }));
/** Màu theo mức điểm (thang 100) */
const levelColor = (value: number | null) => (value === null ? '#b8c0d0' : value >= 80 ? '#22a06b' : value >= 60 ? '#f5a524' : '#e5484d');

function quarterOptions() {
  const now = quarterOf(getCurrentTime());
  const year = Number(now.code.slice(0, 4));
  const q = Number(now.code.slice(-1));
  return Array.from({ length: 8 }, (_, index) => {
    const total = year * 4 + (q - 1) - index;
    const y = Math.floor(total / 4);
    const quarter = (total % 4) + 1;
    return { value: `${y}Q${quarter}`, label: `Quý ${quarter}/${y}` };
  });
}

/**
 * Dashboard điểm học tập trung bình = trung bình điểm các module học tập và điểm recap mentoring (thang 100).
 * Admin toàn cục, Trưởng ban Học tập xem tất cả; Admin module nhỏ chỉ xem module của mình.
 * Phần mentoring chỉ để xem; muốn điều chỉnh thì gửi đề xuất cho Trưởng ban Mentoring.
 */
export default function LearningDashboardPage() {
  const { message } = App.useApp();
  const [mode, setMode] = useState<'MONTH' | 'QUARTER'>('MONTH');
  const [month, setMonth] = useState(() => currentPeriodCode(getCurrentTime()));
  const [quarter, setQuarter] = useState(() => quarterOf(getCurrentTime()).code);
  const [groupId, setGroupId] = useState<string | undefined>();
  const [moduleId, setModuleId] = useState<string | undefined>();
  const [memberType, setMemberType] = useState<string | undefined>();
  const [data, setData] = useState<LearningAverage | null>(null);
  const [loading, setLoading] = useState(true);
  const [canPropose, setCanPropose] = useState<ProposalType[]>([]);
  const [proposal, setProposal] = useState<ProposalPreset | null>(null);

  useEffect(() => {
    proposalApi.summary().then((summary) => setCanPropose(summary.canPropose)).catch(() => undefined);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await dashboardApi.learningAverage({
        ...(mode === 'MONTH' ? { period: month } : { quarter }),
        groupId, moduleId, memberType
      }));
    } catch (error) {
      message.error(errorMessage(error, 'Không tải được dashboard điểm học tập'));
    } finally {
      setLoading(false);
    }
  }, [mode, month, quarter, groupId, moduleId, memberType, message]);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => { if (active) void load(); });
    return () => { active = false; };
  }, [load]);

  const canSuggest = canPropose.includes('MENTORING_DATA');
  const rankList = (rows: AverageMemberRow[], bad = false) => rows.length ? (
    <ol className="rank-list">
      {rows.map((row, index) => (
        <li key={row.member._id} className="rank-item">
          <span className="rank-no">{bad ? '!' : index + 1}</span>
          <Avatar name={row.member.fullName} />
          <span className="rank-name">{row.member.fullName}<span className="block text-xs font-normal text-gray-500">{row.group?.name ?? (row.member.memberType === 'MENTOR' ? 'MTO' : 'Chưa có nhóm')}</span></span>
          <span className={`rank-score${bad ? ' bad' : ''}`}>{fmt(row.average)}</span>
        </li>
      ))}
    </ol>
  ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có điểm" />;

  return (
    <div className="dash">
      <DashHeader title="Điểm học tập trung bình" subtitle={data ? `${data.range.label} · tính từ điểm module học tập và điểm recap mentoring (thang 100)` : 'Tính từ điểm module học tập và điểm recap mentoring (thang 100)'}>
        <Segmented value={mode} onChange={(value) => setMode(value as 'MONTH' | 'QUARTER')} options={[{ value: 'MONTH', label: 'Theo tháng' }, { value: 'QUARTER', label: 'Theo quý' }]} />
        {mode === 'MONTH' ? <MonthPicker value={month} onChange={setMonth} /> : <Select className="w-40" value={quarter} onChange={setQuarter} options={quarterOptions()} />}
      </DashHeader>

      <Card>
        <div className="flex flex-wrap items-center gap-3">
          <Select allowClear placeholder="Mọi nhóm MTE" className="w-52" value={groupId} onChange={setGroupId} options={(data?.filters.groups ?? []).map((item) => ({ value: item._id, label: item.name }))} />
          <Select allowClear placeholder="Mọi module" className="w-64" value={moduleId} onChange={setModuleId} options={(data?.filters.modules ?? []).map((item) => ({ value: item._id, label: item.name }))} />
          <Select allowClear placeholder="MTE và MTO" className="w-40" value={memberType} onChange={setMemberType} options={[{ value: 'MENTEE', label: 'Chỉ MTE' }, { value: 'MENTOR', label: 'Chỉ MTO' }]} />
          <Button onClick={() => void load()}>Tải lại</Button>
        </div>
      </Card>

      {data && !data.canViewAll && <Alert type="info" showIcon title="Bạn là Admin module nhỏ" description="Dashboard chỉ tính điểm các module bạn quản lý, không gồm điểm recap mentoring và module khác." />}
      {data && data.canViewAll && <Alert type="info" showIcon title="Điểm recap mentoring lấy trực tiếp từ dữ liệu mentoring" description={`Bạn chỉ xem, không sửa hay duyệt phần mentoring.${canSuggest ? ' Thấy cần điều chỉnh thì bấm "Góp ý" để gửi đề xuất cho Trưởng ban Mentoring.' : ''}`} />}

      {loading && !data ? <Card className="flex justify-center py-12"><Spin size="large" /></Card> : data && (
        <>
          <div className="kpi-grid">
            <KpiCard tone="purple" icon={<StarOutlined />} label="Điểm trung bình chung" value={fmt(data.overall.average)} unit={data.overall.average === null ? undefined : '/100'} hint={`${data.overall.scoredItems} bài đã chấm`} />
            <KpiCard tone="teal" icon={<BookOutlined />} label="Trung bình module học tập" value={fmt(data.overall.learningAverage)} hint="Các bài học tập đã chấm" />
            <KpiCard tone="orange" icon={<FileDoneOutlined />} label="Trung bình recap mentoring" value={fmt(data.overall.recapAverage)} hint={data.canViewAll ? 'Recap MTE đã chấm' : 'Không thuộc module bạn quản lý'} />
            <KpiCard tone="blue" icon={<TeamOutlined />} label="Thành viên có điểm" value={data.overall.members} hint={data.range.label} />
          </div>

          <div className="dash-grid cols-2">
            <Card title="Xu hướng 6 tháng gần nhất">
              <div className="chart-box">
                <Line
                  data={{
                    labels: data.byMonth.map((item) => periodLabel(item.period).replace('Tháng ', 'T')),
                    datasets: [
                      { label: 'Trung bình chung', data: data.byMonth.map((item) => item.average), borderColor: CHART_COLORS.purple, backgroundColor: CHART_COLORS.purple, tension: 0.35, borderWidth: 3, pointRadius: 4, spanGaps: true },
                      { label: 'Module học tập', data: data.byMonth.map((item) => item.learningAverage), borderColor: CHART_COLORS.teal, backgroundColor: CHART_COLORS.teal, tension: 0.35, borderWidth: 2, pointRadius: 3, spanGaps: true },
                      ...(data.canViewAll ? [{ label: 'Recap mentoring', data: data.byMonth.map((item) => item.recapAverage), borderColor: CHART_COLORS.orange, backgroundColor: CHART_COLORS.orange, tension: 0.35, borderWidth: 2, pointRadius: 3, spanGaps: true }] : [])
                    ]
                  }}
                  options={{ maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, scales: { y: { min: 0, max: 100 }, x: { grid: { display: false } } } }}
                />
              </div>
            </Card>
            <Card title="So sánh giữa các nhóm">
              {data.byGroup.length ? (
                <div className="chart-box">
                  <Bar
                    data={{
                      labels: data.byGroup.map((item) => item.group.name),
                      datasets: [{ label: 'Điểm trung bình', data: data.byGroup.map((item) => item.average), backgroundColor: data.byGroup.map((item) => levelColor(item.average)), borderRadius: 6, maxBarThickness: 36 }]
                    }}
                    options={{ maintainAspectRatio: false, indexAxis: 'y', plugins: { legend: { display: false } }, scales: { x: { min: 0, max: 100 }, y: { grid: { display: false } } } }}
                  />
                </div>
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có điểm trong kỳ này" />}
            </Card>
          </div>

          <div className="dash-grid cols-2">
            <Card title={<span><StarOutlined className="mr-2 text-green-600" />Điểm cao nhất</span>}>{rankList(data.top)}</Card>
            <Card title={<span><AuditOutlined className="mr-2 text-red-500" />Cần cải thiện</span>}>{rankList(data.needImprovement, true)}</Card>
          </div>

          <div className="dash-grid cols-21">
            <Card title="Theo từng thành viên">
              <Table<AverageMemberRow>
                rowKey={(row) => row.member._id}
                dataSource={data.byMember}
                pagination={{ pageSize: 10, hideOnSinglePage: true }}
                scroll={{ x: 'max-content' }}
                locale={{ emptyText: 'Chưa có điểm trong kỳ này' }}
                columns={[
                  { title: 'Thành viên', render: (_: unknown, row: AverageMemberRow) => <div className="flex items-center gap-2"><Avatar name={row.member.fullName} /><div><strong>{row.member.fullName}</strong><div className="text-xs text-gray-500">{row.member.memberCode} · {row.member.memberType === 'MENTOR' ? 'MTO' : 'MTE'}</div></div></div> },
                  { title: 'Nhóm', render: (_: unknown, row: AverageMemberRow) => row.group?.name ?? '—' },
                  { title: 'Điểm TB', sorter: (a: AverageMemberRow, b: AverageMemberRow) => (a.average ?? 0) - (b.average ?? 0), render: (_: unknown, row: AverageMemberRow) => <Progress percent={row.average ?? 0} size={[110, 8]} strokeColor={levelColor(row.average)} format={() => fmt(row.average)} /> },
                  { title: 'Học tập', align: 'right' as const, render: (_: unknown, row: AverageMemberRow) => fmt(row.learningAverage) },
                  { title: 'Recap', align: 'right' as const, render: (_: unknown, row: AverageMemberRow) => fmt(row.recapAverage) },
                  { title: 'Số bài', dataIndex: 'scoredItems', align: 'right' as const },
                  ...(canSuggest && data.canViewAll ? [{
                    title: '', render: (_: unknown, row: AverageMemberRow) => (
                      <Button size="small" onClick={() => setProposal({ type: 'MENTORING_DATA', memberId: row.member._id, dataTarget: 'MEMBER_SCORE' })}>Góp ý</Button>
                    )
                  }] : [])
                ]}
              />
            </Card>
            <Card title="Theo module">
              {data.byModule.length ? (
                <ul className="rank-list">
                  {data.byModule.map((row) => (
                    <li key={row.module._id} className="rank-item">
                      <span className="rank-name">{row.module.name}{row.module.isRecap && <Tag color="purple" className="!ml-2">Mentoring</Tag>}<span className="block text-xs font-normal text-gray-500">{row.members} người · {row.scoredItems} bài</span></span>
                      <span className="rank-score" style={{ color: levelColor(row.average) }}>{fmt(row.average)}</span>
                    </li>
                  ))}
                </ul>
              ) : <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Chưa có điểm" />}
            </Card>
          </div>
        </>
      )}

      <ProposalModal open={Boolean(proposal)} allowed={canPropose.filter((item) => item === 'MENTORING_DATA')} preset={proposal ?? undefined} onClose={() => setProposal(null)} onDone={() => setProposal(null)} />
    </div>
  );
}
