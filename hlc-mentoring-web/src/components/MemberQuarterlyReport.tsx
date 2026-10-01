'use client';

import { useMemo, useState } from 'react';
import { App, Button, Card, Descriptions, Modal, Spin, Table, Tabs, Tag, Typography } from 'antd';
import { apiFetch } from '@/lib/api';
import ProfileLink from '@/components/ProfileLink';

interface MonthlyReport {
  month: number;
  monthKey: string;
  monthlyId: string;
  status: string;
  schedule: {
    id: string;
    startTime: string;
    endTime: string;
    status: string;
    meetingLink?: string;
    location?: string;
    note?: string;
  } | null;
  recap: {
    status: string;
    content?: string;
    note?: string;
    mediaUrls?: string[];
    createdAt?: string;
  } | null;
}

interface QuarterlyReport {
  key: string;
  cycleId: string;
  quarterlyId: string;
  quarter: number;
  year: number;
  role: 'MENTOR' | 'MENTEE';
  user: { userId: string; fullName: string };
  mentor: { userId: string; fullName: string; profileUrl?: string };
  mentee: { userId: string; fullName: string; profileUrl?: string };
  months: MonthlyReport[];
}

function formatDate(value?: string) {
  if (!value) return 'Chưa có lịch';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Chưa có lịch' : date.toLocaleString('vi-VN');
}

function recapStatusLabel(value?: string) {
  const labels: Record<string, string> = {
    APPROVED: 'Đã duyệt',
    REJECTED: 'Bị từ chối',
    SUBMITTED: 'Đã gửi',
    LATE: 'Nộp muộn',
    PENDING: 'Chờ nộp'
  };
  return labels[value || ''] || value || 'Chưa xong';
}

export default function MemberQuarterlyReport() {
  const { message } = App.useApp();
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [reports, setReports] = useState<QuarterlyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<QuarterlyReport | null>(null);

  const loadReports = async () => {
    setVisible(true);
    setLoading(true);
    try {
      const response = await apiFetch('/mentoring/member-quarterly-report');
      const result = await response.json();
      if (!result.success) throw new Error(result.message || 'Không thể tải danh sách mentoring');
      setReports(result.data || []);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tải danh sách mentoring');
    } finally {
      setLoading(false);
    }
  };

  const quarterGroups = useMemo(() => {
    const groups = new Map<string, QuarterlyReport[]>();
    reports.forEach((report) => {
      const key = `${report.year}Q${report.quarter}`;
      groups.set(key, [...(groups.get(key) || []), report]);
    });
    return [...groups.entries()];
  }, [reports]);

  const renderQuarterTable = (quarterReports: QuarterlyReport[]) => {
    const { quarter, year } = quarterReports[0];
    const months = [1, 2, 3].map((offset) => (quarter - 1) * 3 + offset);
    const columns = [
      { title: 'STT', render: (_: unknown, _row: QuarterlyReport, index: number) => index + 1, width: 65 },
      { title: 'QUÝ', render: () => `${year}Q${quarter}`, width: 100 },
      {
        title: 'CHỨC DANH',
        dataIndex: 'role',
        width: 110,
        render: (role: string) => <Tag color={role === 'MENTOR' ? 'blue' : 'green'}>{role === 'MENTOR' ? 'Mentor' : 'Mentee'}</Tag>
      },
      {
        title: 'MENTOR',
        width: 220,
        render: (_: unknown, report: QuarterlyReport) => (
          <div><strong>{report.mentor.fullName || 'Chưa có họ tên'}</strong><div className="text-xs text-gray-500">{report.mentor.userId}</div></div>
        )
      },
      {
        title: 'PROFILE MENTOR',
        width: 140,
        render: (_: unknown, report: QuarterlyReport) => <ProfileLink url={report.mentor.profileUrl} />
      },
      {
        title: 'MENTEE',
        width: 220,
        render: (_: unknown, report: QuarterlyReport) => (
          <div><strong>{report.mentee.fullName || 'Chưa có họ tên'}</strong><div className="text-xs text-gray-500">{report.mentee.userId}</div></div>
        )
      },
      {
        title: 'PROFILE MENTEE',
        width: 140,
        render: (_: unknown, report: QuarterlyReport) => <ProfileLink url={report.mentee.profileUrl} />
      },
      ...months.map((month) => {
        const monthKey = `${String(month).padStart(2, '0')}/${year}`;
        return {
          title: monthKey,
          children: [
            {
              title: 'MÃ THEO THÁNG',
              width: 230,
              render: (_: unknown, report: QuarterlyReport) => report.months.find((item) => item.month === month)?.monthlyId || '—'
            },
            {
              title: 'TRẠNG THÁI',
              width: 115,
              render: (_: unknown, report: QuarterlyReport) => {
                const status = report.months.find((item) => item.month === month)?.status;
                return status ? <Tag color={status === 'Đã xong' ? 'green' : 'red'}>{status}</Tag> : '—';
              }
            }
          ]
        };
      }),
      {
        title: 'CHI TIẾT',
        width: 130,
        render: (_: unknown, report: QuarterlyReport) => (
          <Button onClick={() => setSelectedReport(report)}>Xem recap</Button>
        )
      }
    ];

    return (
      <Table<QuarterlyReport>
        rowKey="key"
        columns={columns}
        dataSource={quarterReports}
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 10 }}
        onRow={(report) => ({ onClick: () => setSelectedReport(report), className: 'cursor-pointer' })}
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
              : quarterGroups.length ? (
                <Tabs items={quarterGroups.map(([key, quarterReports]) => ({
                  key,
                  label: `Danh sách Quý ${quarterReports[0].quarter} - ${quarterReports[0].year}`,
                  children: renderQuarterTable(quarterReports)
                }))} />
              ) : <Typography.Text type="secondary">Chưa có danh sách mentoring theo quý đã kết thúc.</Typography.Text>}
          </div>
        )}
      </Card>

      <Modal
        title={selectedReport ? `Chi tiết mentoring - Quý ${selectedReport.quarter}/${selectedReport.year}` : 'Chi tiết mentoring'}
        open={Boolean(selectedReport)}
        onCancel={() => setSelectedReport(null)}
        footer={null}
        width={900}
      >
        {selectedReport && (
          <>
            <Descriptions bordered size="small" column={1} className="mb-4">
              <Descriptions.Item label="Mentor">{selectedReport.mentor.fullName} ({selectedReport.mentor.userId})</Descriptions.Item>
              <Descriptions.Item label="Mentee">{selectedReport.mentee.fullName} ({selectedReport.mentee.userId})</Descriptions.Item>
              <Descriptions.Item label="Vai trò">{selectedReport.role === 'MENTOR' ? 'Mentor' : 'Mentee'}</Descriptions.Item>
            </Descriptions>
            <div className="space-y-4">
              {selectedReport.months.map((month) => (
                <Card size="small" key={month.monthlyId} title={`Tháng ${month.month} - ${month.monthlyId}`}>
                  <Descriptions bordered size="small" column={1}>
                    <Descriptions.Item label="Trạng thái recap">
                      <Tag color={month.recap?.status === 'APPROVED' ? 'green' : month.recap?.status === 'REJECTED' ? 'red' : 'blue'}>
                        {recapStatusLabel(month.recap?.status || month.status)}
                      </Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Thời gian mentoring">
                      {month.schedule
                        ? `${formatDate(month.schedule.startTime)} - ${formatDate(month.schedule.endTime)}`
                        : 'Chưa có lịch mentoring'}
                    </Descriptions.Item>
                    <Descriptions.Item label="Trạng thái lịch">{month.schedule?.status || '—'}</Descriptions.Item>
                    {month.schedule?.meetingLink && <Descriptions.Item label="Link meeting"><a href={month.schedule.meetingLink} target="_blank" rel="noreferrer">Tham gia meeting</a></Descriptions.Item>}
                    {month.recap?.content && <Descriptions.Item label="Nội dung recap">{month.recap.content}</Descriptions.Item>}
                    {month.recap?.note && <Descriptions.Item label="Ghi chú recap">{month.recap.note}</Descriptions.Item>}
                    {month.recap?.createdAt && <Descriptions.Item label="Ngày gửi recap">{formatDate(month.recap.createdAt)}</Descriptions.Item>}
                    {month.recap?.mediaUrls?.map((url, index) => (
                      <Descriptions.Item key={url} label={`Minh chứng ${index + 1}`}><a href={url} target="_blank" rel="noreferrer">Xem minh chứng</a></Descriptions.Item>
                    ))}
                  </Descriptions>
                </Card>
              ))}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
