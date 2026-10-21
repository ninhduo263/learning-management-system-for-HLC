'use client';

import { useMemo, useState } from 'react';
import { App, Button, Card, Descriptions, Modal, Spin, Table, Tabs, Tag, Typography } from 'antd';
import ProfileLink from '@/components/ProfileLink';
import RecapCard from '@/components/RecapCard';
import { errorMessage } from '@/lib/api';
import { ROLE_STATUS_COLOR, ROLE_STATUS_LABEL, formatDateTime, mentoringApi, type MyQuarterReport } from '@/services/mentoringApi';

const pad = (value: number) => String(value).padStart(2, '0');

/** Danh sách ghép cặp theo quý của chính mentor/mentee (quý đã kết thúc hoặc đã có recap) */
export default function MemberQuarterlyReport() {
  const { message } = App.useApp();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<MyQuarterReport[]>([]);
  const [selected, setSelected] = useState<MyQuarterReport | null>(null);

  const loadReports = async () => {
    setVisible(true);
    setLoading(true);
    try {
      setReports(await mentoringApi.myReport());
    } catch (error) {
      message.error(errorMessage(error, 'Không thể tải danh sách mentoring'));
    } finally {
      setLoading(false);
    }
  };

  const groups = useMemo(() => {
    const map = new Map<string, MyQuarterReport[]>();
    reports.forEach((report) => map.set(report.quarterCode, [...(map.get(report.quarterCode) ?? []), report]));
    return [...map.entries()];
  }, [reports]);

  const renderTable = (items: MyQuarterReport[]) => {
    const { quarter, year } = items[0];
    const months = [1, 2, 3].map((offset) => (quarter - 1) * 3 + offset);
    return (
      <Table<MyQuarterReport>
        rowKey="key"
        dataSource={items}
        scroll={{ x: 'max-content' }}
        pagination={false}
        onRow={(report) => ({ onClick: () => setSelected(report), className: 'cursor-pointer' })}
        columns={[
          { title: 'STT', render: (_: unknown, _row: MyQuarterReport, index: number) => index + 1, width: 65 },
          { title: 'QUÝ', render: () => `Q${quarter}/${year}`, width: 90 },
          { title: 'CHỨC DANH', dataIndex: 'role', width: 110, render: (role: string) => <Tag color={role === 'MENTOR' ? 'blue' : 'green'}>{role === 'MENTOR' ? 'Mentor' : 'Mentee'}</Tag> },
          { title: 'MENTOR', width: 220, render: (_: unknown, report: MyQuarterReport) => <div><strong>{report.mentor?.fullName}</strong><div className="text-xs text-gray-500">{report.mentor?.memberCode}</div><ProfileLink url={report.mentor?.profileUrl ?? undefined} /></div> },
          { title: 'MENTEE', width: 220, render: (_: unknown, report: MyQuarterReport) => <div><strong>{report.mentee?.fullName}</strong><div className="text-xs text-gray-500">{report.mentee?.memberCode}</div><ProfileLink url={report.mentee?.profileUrl ?? undefined} /></div> },
          ...months.map((month) => ({
            title: `${pad(month)}/${year}`,
            children: [
              { title: 'MÃ THEO THÁNG', width: 230, render: (_: unknown, report: MyQuarterReport) => report.months.find((item) => item.month === month)?.session?.code || '—' },
              {
                title: 'TRẠNG THÁI',
                width: 115,
                render: (_: unknown, report: MyQuarterReport) => {
                  const status = report.months.find((item) => item.month === month)?.session?.status;
                  return status ? <Tag color={ROLE_STATUS_COLOR[status]}>{ROLE_STATUS_LABEL[status]}</Tag> : '—';
                }
              }
            ]
          })),
          { title: 'CHI TIẾT', width: 120, render: (_: unknown, report: MyQuarterReport) => <Button onClick={() => setSelected(report)}>Xem recap</Button> }
        ]}
      />
    );
  };

  return (
    <>
      <Card title="Danh sách ghép cặp theo quý">
        <Button type="primary" onClick={loadReports}>Xem danh sách</Button>
        {visible && (
          <div className="mt-4">
            {loading ? <div className="flex justify-center py-10"><Spin size="large" /></div>
              : groups.length ? (
                <Tabs items={groups.map(([code, items]) => ({ key: code, label: `Danh sách Quý ${items[0].quarter} - ${items[0].year}`, children: renderTable(items) }))} />
              ) : <Typography.Text type="secondary">Chưa có quý nào đã kết thúc hoặc có recap.</Typography.Text>}
          </div>
        )}
      </Card>

      <Modal title={selected ? `Chi tiết mentoring - Quý ${selected.quarter}/${selected.year}` : 'Chi tiết mentoring'} open={Boolean(selected)} onCancel={() => setSelected(null)} footer={null} width={900}>
        {selected && (
          <>
            <Descriptions bordered size="small" column={1} className="mb-4">
              <Descriptions.Item label="Mentor">{selected.mentor?.fullName} ({selected.mentor?.memberCode})</Descriptions.Item>
              <Descriptions.Item label="Mentee">{selected.mentee?.fullName} ({selected.mentee?.memberCode})</Descriptions.Item>
              <Descriptions.Item label="Vai trò của bạn">{selected.role === 'MENTOR' ? 'Mentor' : 'Mentee'}</Descriptions.Item>
            </Descriptions>
            <div className="space-y-4">
              {selected.months.filter((item) => item.session).map(({ month, session }) => (
                <Card size="small" key={session!._id} title={`Tháng ${month} - ${session!.code}`}>
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="Trạng thái recap"><Tag color={ROLE_STATUS_COLOR[session!.status]}>{ROLE_STATUS_LABEL[session!.status]}</Tag></Descriptions.Item>
                    <Descriptions.Item label="Thời gian mentoring">{session!.schedule ? `${formatDateTime(session!.schedule.startAt)} – ${formatDateTime(session!.schedule.endAt)}` : 'Chưa có lịch mentoring'}</Descriptions.Item>
                    {session!.schedule?.meetingLink && <Descriptions.Item label="Link meeting"><a href={session!.schedule.meetingLink} target="_blank" rel="noreferrer">Tham gia meeting</a></Descriptions.Item>}
                  </Descriptions>
                  {session!.recap && <RecapCard recap={session!.recap} />}
                </Card>
              ))}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
