'use client';

import { useEffect, useState } from 'react';
import { App, Button, Card, Form, Input, Select, Table, Tag } from 'antd';
import { apiFetch } from '@/lib/api';

export default function MenteeLearningPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const loadMySubmissions = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/submissions/my');
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setSubmissions(result.data);
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tải bài nộp');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMySubmissions(); }, []);

  const onFinish = async (values: any) => {
    try {
      const response = await apiFetch('/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleCode: values.moduleCode,
          submissionType: values.moduleCode,
          content: {
            text: values.text || '',
            imageUrls: values.imageUrl ? [values.imageUrl] : []
          },
          note: values.note || ''
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã lưu bài nộp');
      form.resetFields();
      loadMySubmissions();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Lỗi khi lưu bài nộp');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Nộp bài học tập</h1>
      <Card title="Gửi bài mới">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <div className="grid gap-4 md:grid-cols-2">
            <Form.Item name="moduleCode" label="Loại bài nộp" rules={[{ required: true }]}>
              <Select options={[
                { value: 'READING', label: 'Đọc sách' },
                { value: 'FAVORITE_ARTICLE', label: 'Bài tâm đắc' },
                { value: 'ACADEMIC_WEEKLY', label: 'Học tập tuần' }
              ]} />
            </Form.Item>
            <Form.Item name="imageUrl" label="Link ảnh (nếu có)">
              <Input placeholder="https://..." />
            </Form.Item>
          </div>
          <Form.Item name="text" label="Nội dung / cảm nhận / bài viết">
            <Input.TextArea rows={6} placeholder="Nội dung bài nộp..." />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú thêm">
            <Input placeholder="Ghi chú" />
          </Form.Item>
          <Button type="primary" htmlType="submit">Gửi bài</Button>
        </Form>
      </Card>

      <Card title="Lịch sử bài nộp">
        <Table
          rowKey="_id"
          dataSource={submissions}
          loading={loading}
          pagination={{ pageSize: 5 }}
          columns={[
            { title: 'Module', dataIndex: 'moduleCode' },
            { title: 'Nội dung', dataIndex: 'content', render: (value: any) => value?.text || '—' },
            { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={value === 'APPROVED' ? 'green' : value === 'REJECTED' ? 'red' : 'gold'}>{value}</Tag> },
            { title: 'Ngày gửi', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString() }
          ]}
        />
      </Card>
    </div>
  );
}
