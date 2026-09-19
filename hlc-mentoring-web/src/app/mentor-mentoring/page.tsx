'use client';

import { useEffect, useState } from 'react';
import { Alert, App, Button, Card, Descriptions, Form, Input, Modal, Table, Tag } from 'antd';
import { apiFetch } from '@/lib/api';
import CloudinaryImageUpload from '@/components/CloudinaryImageUpload';

export default function MentorMentoringPage() {
  const { message } = App.useApp();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();
  const [selectedSchedule, setSelectedSchedule] = useState<any>(null);
  const [detailSchedule, setDetailSchedule] = useState<any>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/dashboard/personal');
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setData(result.data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Lỗi tải dữ liệu mentor');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const handleSubmitRecap = async (values: any) => {
    if (!values.mediaUrl) {
      message.error('Vui lòng tải ảnh minh chứng lên trước khi gửi recap');
      return;
    }
    try {
      const pair = data?.pairs?.find((item: any) => item.pairId === selectedSchedule?.pairId) || data?.pairs?.[0];
      const response = await apiFetch('/mentoring/recaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pairId: pair?.pairId,
          cycleId: selectedSchedule?.cycleId,
          scheduleId: selectedSchedule?._id,
          role: 'MENTOR',
          content: values.content,
          note: values.note || '',
          mediaUrls: [values.mediaUrl]
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã lưu recap mentor');
      form.resetFields();
      loadData();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể lưu recap mentor');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Lịch mentoring & recap</h1>
      {!loading && !data && <Alert type="error" showIcon title="Không tải được dữ liệu mentoring" description="Vui lòng đăng nhập lại hoặc kiểm tra kết nối backend." />}
      {!loading && data && data.pairs.length === 0 && data.schedules.length === 0 && (
        <Alert type="info" showIcon title="Chưa có dữ liệu mentoring" description="Admin chưa ghép cặp hoặc chưa tạo request lịch cho tài khoản này." />
      )}
      <Card title="Danh sách Mentee đã ghép theo quý">
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={data?.pairs ?? []}
          scroll={{ x: 'max-content' }}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'Quý', dataIndex: 'cycleId' },
            { title: 'Mã mentoring tháng', dataIndex: 'monthlyCode' },
            { title: 'Mentee', dataIndex: 'menteeId' },
            { title: 'Trạng thái cặp', dataIndex: 'status', render: (value: string) => <Tag color={value === 'ACTIVE' ? 'green' : 'gold'}>{value}</Tag> }
          ]}
        />
      </Card>
      <Card title="Lịch mentoring của mentor">
        <Table
          rowKey="_id"
          loading={loading}
          dataSource={data?.schedules ?? []}
          scroll={{ x: 'max-content' }}
          columns={[
            { title: 'Quý', dataIndex: 'cycleId' },
            { title: 'Pair', dataIndex: 'pairId' },
            { title: 'Mentee', dataIndex: 'menteeId' },
            { title: 'Bắt đầu', dataIndex: 'startTime', render: (value: string) => new Date(value).toLocaleString() },
            { title: 'Kết thúc', dataIndex: 'endTime', render: (value: string) => new Date(value).toLocaleString() },
            { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={value === 'COMPLETED' ? 'green' : 'blue'}>{value}</Tag> },
            { title: 'Chi tiết', render: (_: unknown, record: any) => <Button onClick={() => setDetailSchedule(record)}>Xem chi tiết</Button> },
            { title: 'Recap', render: (_: unknown, record: any) => <Button disabled={record.status !== 'COMPLETED'} onClick={() => setSelectedSchedule(record)}>Viết recap</Button> }
          ]}
        />
      </Card>

      <Modal title="Chi tiết lịch hẹn" open={Boolean(detailSchedule)} onCancel={() => setDetailSchedule(null)} footer={null}>
        {detailSchedule && <Descriptions bordered column={1} size="small">
          <Descriptions.Item label="Mã cặp">{detailSchedule.pairId}</Descriptions.Item>
          <Descriptions.Item label="Quý">{detailSchedule.cycleId}</Descriptions.Item>
          <Descriptions.Item label="Mentee">{detailSchedule.menteeId}</Descriptions.Item>
          <Descriptions.Item label="Bắt đầu">{new Date(detailSchedule.startTime).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Kết thúc">{new Date(detailSchedule.endTime).toLocaleString()}</Descriptions.Item>
          <Descriptions.Item label="Trạng thái">{detailSchedule.status}</Descriptions.Item>
          <Descriptions.Item label="Link meeting">{detailSchedule.meetingLink || 'Chưa có'}</Descriptions.Item>
          <Descriptions.Item label="Địa điểm">{detailSchedule.location || 'Chưa có'}</Descriptions.Item>
          <Descriptions.Item label="Ghi chú">{detailSchedule.note || 'Không có'}</Descriptions.Item>
        </Descriptions>}
      </Modal>

      {selectedSchedule && selectedSchedule.status === 'COMPLETED' && <Card title={`Gửi recap mentor - ${selectedSchedule.monthCode || selectedSchedule.pairId}`}>
        <Form form={form} layout="vertical" onFinish={handleSubmitRecap}>
          <Form.Item name="content" label="Nội dung recap" rules={[{ required: true }]}>
            <Input.TextArea rows={5} placeholder="Tóm tắt đầu buổi / nội dung mentor" />
          </Form.Item>
          <Form.Item name="mediaUrl" label="Link ảnh / tài liệu">
            <CloudinaryImageUpload required />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input placeholder="Ghi chú" />
          </Form.Item>
          <Button type="primary" htmlType="submit">Gửi recap</Button>
        </Form>
      </Card>}
    </div>
  );
}
