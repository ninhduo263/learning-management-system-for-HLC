'use client';

import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { apiFetch } from '@/lib/api';
import ProfileLink from '@/components/ProfileLink';

export default function MentorDashboardPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await apiFetch('/dashboard/personal');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        setData(result.data);
      } catch (error) {
        console.error(error);
      }
    };

    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard - Mentor</h1>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}><Card><Statistic title="Tổng điểm" value={data?.totalPoints ?? 0} /></Card></Col>
        <Col xs={24} sm={12} md={6}><Card><Statistic title="Cặp mentoring" value={data?.pairCount ?? 0} /></Card></Col>
        <Col xs={24} sm={12} md={6}><Card><Statistic title="Lịch đã tạo" value={data?.scheduleCount ?? 0} /></Card></Col>
        <Col xs={24} sm={12} md={6}><Card><Statistic title="Recap" value={data?.recapCount ?? 0} /></Card></Col>
      </Row>

      <Card title="Danh sách cặp đang phụ trách">
        <Table
          rowKey="_id"
          dataSource={data?.pairs ?? []}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Mã tháng', dataIndex: 'monthlyId' },
            { title: 'Mentor', render: (_: unknown, row: any) => <div><strong>{row.mentor?.fullName || 'Chưa có họ tên'}</strong><div className="text-xs text-gray-500">{row.mentor?.userId || row.mentorId || '—'}</div></div> },
            { title: 'Mentee', render: (_: unknown, row: any) => <div><strong>{row.mentee?.fullName || 'Chưa có họ tên'}</strong><div className="text-xs text-gray-500">{row.mentee?.userId || row.menteeId || '—'}</div></div> },
            { title: 'Profile Mentor', render: (_: unknown, row: any) => <ProfileLink url={row.mentor?.profileUrl} /> },
            { title: 'Profile Mentee', render: (_: unknown, row: any) => <ProfileLink url={row.mentee?.profileUrl} /> }
          ]}
        />
      </Card>
    </div>
  );
}
