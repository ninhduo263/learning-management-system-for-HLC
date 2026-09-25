'use client';

import { useEffect, useState } from 'react';
import { Card, Col, Row, Statistic, Table, Tag } from 'antd';
import { apiFetch } from '@/lib/api';

export default function MenteeDashboardPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const response = await apiFetch('/dashboard/personal');
        const result = await response.json();
        if (!result.success) throw new Error(result.message);
        setData(result.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Dashboard cá nhân - Mentee</h1>

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={6}><Card><Statistic title="Tổng điểm" value={data?.totalPoints ?? 0} /></Card></Col>
        <Col xs={24} sm={12} md={6}><Card><Statistic title="Bài đã duyệt" value={data?.approvedCount ?? 0} /></Card></Col>
        <Col xs={24} sm={12} md={6}><Card><Statistic title="Bài chờ duyệt" value={data?.pendingCount ?? 0} /></Card></Col>
        <Col xs={24} sm={12} md={6}><Card><Statistic title="Cặp mentoring" value={data?.pairCount ?? 0} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title="Điểm theo danh mục">
            {data && Object.keys(data.scoreByCategory || {}).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(data.scoreByCategory).map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b pb-2 text-sm">
                    <span>{key}</span>
                    <strong>{Number(value)}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">Chưa có dữ liệu điểm trong kỳ hiện tại.</p>
            )}
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Thông tin kỳ hiện tại">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Kỳ</span><strong>{data?.cycleId || 'Chưa có'}</strong></div>
              <div className="flex justify-between"><span>Phụ cấp</span><strong>{data?.allowanceSummary?.finalAmount ?? 0} đ</strong></div>
              <div className="flex justify-between"><span>Recap</span><strong>{data?.recapCount ?? 0}</strong></div>
              <div className="flex justify-between"><span>Lịch mentoring</span><strong>{data?.scheduleCount ?? 0}</strong></div>
            </div>
          </Card>
        </Col>
      </Row>

      <Card title="Bài nộp gần đây">
        <Table
          rowKey="_id"
          dataSource={data?.recentSubmissions ?? []}
          scroll={{ x: 'max-content' }}
          loading={loading}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'Module', dataIndex: 'moduleCode' },
            { title: 'Loại', dataIndex: 'submissionType' },
            { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={value === 'APPROVED' ? 'green' : value === 'REJECTED' ? 'red' : 'gold'}>{value}</Tag> },
            { title: 'Ngày', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString() }
          ]}
        />
      </Card>

      <Card title="Danh sách cặp mentoring">
        <Table
          rowKey="_id"
          dataSource={data?.pairs ?? []}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'Mã tháng', dataIndex: 'monthlyId' },
            { title: 'Mentor', dataIndex: 'mentorId' },
            { title: 'Mentee', dataIndex: 'menteeId' },
            { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={value === 'ACTIVE' ? 'green' : 'gold'}>{value}</Tag> }
          ]}
        />
      </Card>
    </div>
  );
}
