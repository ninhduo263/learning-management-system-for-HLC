'use client';

import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Table, Tag } from 'antd';
import { apiFetch } from '@/lib/api';

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
            { title: 'Pair', dataIndex: 'pairId' },
            { title: 'Mentor', dataIndex: 'mentorId' },
            { title: 'Mentee', dataIndex: 'menteeId' },
            { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={value === 'ACTIVE' ? 'green' : 'gold'}>{value}</Tag> }
          ]}
        />
      </Card>
    </div>
  );
}
