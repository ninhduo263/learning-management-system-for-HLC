'use client';

import { useEffect, useState } from 'react';
import { Alert, App, Card, Empty, Spin, Table, Tabs, Tag, Tooltip, Typography } from 'antd';
import FundGroupReport from '@/components/FundGroupReport';
import MonthPicker, { currentPeriodCode } from '@/components/MonthPicker';
import RecapGradingPanel from '@/components/RecapGradingPanel';
import { errorMessage } from '@/lib/api';
import { PAIR_STATUS_COLOR, PAIR_STATUS_LABEL } from '@/services/mentoringApi';
import { GROUP_KIND_LABEL, WEEK_STATUS_COLOR, WEEK_STATUS_LABEL, completionApi, leaderApi, money, points, type GroupCompletion, type LeaderOverview } from '@/services/hlcApi';
import { getCurrentTime } from '@/utils/time';

type MemberRow = LeaderOverview['groups'][number]['members'][number];
const ROLE_LABEL = { LEADER: 'Leader', DEPUTY: 'Phó nhóm', ADMIN: 'Admin' };

/** Leader / Phó nhóm: tiến độ nhóm, chấm recap, duyệt minh chứng quỹ */
export default function LeaderPage() {
  const { message } = App.useApp();
  const [code, setCode] = useState(() => currentPeriodCode(getCurrentTime()));
  const [data, setData] = useState<LeaderOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);
  const [completion, setCompletion] = useState<GroupCompletion[]>([]);

  useEffect(() => {
    let active = true;
    Promise.resolve()
      .then(() => { if (active) setLoading(true); return leaderApi.overview(code); })
      .then((result) => { if (active) setData(result); return completionApi.mine(code).then((rows) => { if (active) setCompletion(rows); }).catch(() => undefined); })
      .catch((error) => {
        if (!active) return;
        if ((error as { status?: number }).status === 403) setDenied(true);
        else message.error(errorMessage(error, 'Không tải được dữ liệu nhóm'));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [code, message]);

  if (denied) return <Card><Alert type="warning" showIcon title="Bạn không phải Leader hoặc Phó nhóm" description="Chức năng này chỉ dành cho Leader / Phó nhóm do admin phân công." /></Card>;

  const progress = (
    <div className="space-y-4">
      <MonthPicker value={code} onChange={setCode} />
      {loading && !data ? <div className="flex justify-center py-10"><Spin /></div> : !data?.groups.length ? <Empty description="Chưa có nhóm" /> : data.groups.map((group) => {
        const mentees = group.members.filter((row) => row.member.memberType === 'MENTEE');
        const done = mentees.filter((row) => row.mentoring.some((item) => item.pairStatus === 'DONE')).length;
        return (
          <Card key={group._id} size="small" title={<span>{group.name} <Tag color="purple">{ROLE_LABEL[group.myRole as keyof typeof ROLE_LABEL] ?? group.myRole}</Tag></span>} extra={<span className="text-xs text-gray-500">Leader: {group.leader?.fullName ?? '—'} · Phó: {group.deputy?.fullName ?? '—'}</span>}>
            <div className="mb-3 flex flex-wrap gap-2">
              <Tag>{group.members.length} thành viên</Tag>
              <Tag color="green">Mentee đã xong mentoring: {done}/{mentees.length}</Tag>
              {!group.canReview && <Tag color="gold">Chỉ xem (chưa được bật quyền chấm/duyệt)</Tag>}
              {(() => {
                const item = completion.find((row) => row._id === group._id);
                if (!item) return null;
                return <Tag color={item.passed ? 'green' : 'orange'}>{GROUP_KIND_LABEL[item.groupKind]} · hoàn tất {item.total ? `${item.done}/${item.total} (${item.rate}%)` : 'chưa có dữ liệu'}{item.passed ? ` · vượt ngưỡng ${item.threshold}%: có thưởng` : ` · cần trên ${item.threshold}% để có thưởng`}</Tag>;
              })()}
            </div>
            <Table<MemberRow>
              rowKey={(row) => row.member._id}
              size="small"
              pagination={false}
              dataSource={group.members}
              scroll={{ x: 'max-content' }}
              columns={[
                { title: 'Thành viên', fixed: 'left' as const, render: (_: unknown, row: MemberRow) => <div><strong>{row.member.fullName}</strong><div className="text-xs text-gray-500">{row.member.memberCode} · {row.member.phone || 'chưa có SĐT'}</div></div> },
                { title: 'Vai trò', render: (_: unknown, row: MemberRow) => <Tag color={row.member.memberType === 'MENTOR' ? 'blue' : 'green'}>{row.member.memberType === 'MENTOR' ? 'Mentor' : 'Mentee'}</Tag> },
                {
                  title: 'Mentoring tháng', render: (_: unknown, row: MemberRow) => row.mentoring.length ? (
                    <div className="space-y-1">
                      {row.mentoring.map((item) => (
                        <div key={item.sessionCode} className="flex flex-wrap items-center gap-1">
                          <Tooltip title={item.sessionCode}><span className="text-xs">với {item.partner?.fullName}</span></Tooltip>
                          <Tag color={PAIR_STATUS_COLOR[item.pairStatus]}>{PAIR_STATUS_LABEL[item.pairStatus]}</Tag>
                          {item.recapScore !== null && <Tag color="geekblue">Recap {points(item.recapScore)}/100</Tag>}
                        </div>
                      ))}
                    </div>
                  ) : <span className="text-gray-400">Chưa có buổi</span>
                },
                {
                  title: 'Học tập (kỳ hiện tại)', render: (_: unknown, row: MemberRow) => (
                    <div className="flex max-w-xs flex-wrap gap-1">
                      {row.learning.map((item) => <Tag key={item.moduleId} color={item.reached ? 'green' : item.min ? 'red' : 'default'}>{item.name}: {item.submitted}{item.min ? `/${item.min}` : ''}</Tag>)}
                    </div>
                  )
                },
                {
                  title: 'HLC Fund theo tuần', render: (_: unknown, row: MemberRow) => (
                    <div className="flex flex-wrap gap-1">
                      {row.fund.weeks.map((week) => <Tooltip key={week.weekKey} title={week.weekKey}><Tag color={WEEK_STATUS_COLOR[week.status]}>{WEEK_STATUS_LABEL[week.status]}</Tag></Tooltip>)}
                      <span className="text-xs text-gray-500">{money(row.fund.approvedAmount)}</span>
                    </div>
                  )
                }
              ]}
            />
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-4">
      <Typography.Title level={3} className="!mb-0">Nhóm của tôi</Typography.Title>
      <Card>
        <Tabs items={[
          { key: 'progress', label: 'Tiến độ nhóm', children: progress },
          { key: 'recap', label: 'Chấm recap', children: <RecapGradingPanel /> },
          { key: 'fund', label: 'HLC Fund (duyệt, nộp hộ)', children: <FundGroupReport /> }
        ]} />
      </Card>
    </div>
  );
}
