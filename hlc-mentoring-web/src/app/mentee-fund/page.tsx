'use client';

import { useEffect, useState } from 'react';
import { App, Button, Card, Form, Input, Table, Tag } from 'antd';
import { apiFetch } from '@/lib/api';

export default function MenteeFundPage() {
  const { message } = App.useApp();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  const loadFundSubmissions = async () => {
    setLoading(true);
    try {
      const response = await apiFetch('/submissions/my');
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      setSubmissions(result.data.filter((item: any) => item.submissionType === 'HLC_FUND'));
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Lỗi khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFundSubmissions(); }, []);

  const onFinish = async (values: any) => {
    try {
      const response = await apiFetch('/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleCode: 'HLC_FUND',
          submissionType: 'HLC_FUND',
          content: {
            text: values.content || '',
            imageUrls: values.imageUrl ? [values.imageUrl] : []
          },
          note: values.note || ''
        })
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã nộp minh chứng quỹ');
      form.resetFields();
      loadFundSubmissions();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể nộp minh chứng');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Nộp minh chứng HLC Fund</h1>
      <Card title="Gửi minh chứng mới">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item name="content" label="Nội dung / số tiền / mô tả" rules={[{ required: true }]}> 
            <Input.TextArea rows={4} placeholder="Mô tả nội dung minh chứng" />
          </Form.Item>
          <Form.Item name="imageUrl" label="Link ảnh minh chứng">
            <Input placeholder="https://..." />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú">
            <Input placeholder="Ghi chú" />
          </Form.Item>
          <Button type="primary" htmlType="submit">Nộp minh chứng</Button>
        </Form>
      </Card>

      <Card title="Lịch sử nộp">
        <Table
          rowKey="_id"
          dataSource={submissions}
          loading={loading}
          columns={[
            { title: 'Ngày', dataIndex: 'createdAt', render: (value: string) => new Date(value).toLocaleString() },
            { title: 'Nội dung', dataIndex: 'content', render: (value: any) => value?.text || '—' },
            { title: 'Trạng thái', dataIndex: 'status', render: (value: string) => <Tag color={value === 'APPROVED' ? 'green' : value === 'REJECTED' ? 'red' : 'gold'}>{value}</Tag> }
          ]}
        />
      </Card>
    </div>
  );
}
