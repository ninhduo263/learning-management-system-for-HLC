'use client';

import { useEffect, useState } from 'react';
import { App, Button, Card, Form, Input, InputNumber, Select, Table, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { apiFetch } from '@/lib/api';

interface RewardRule {
  _id: string;
  code: string;
  name: string;
  category: string;
  points: number;
  calculationType: string;
  isActive: boolean;
}

interface RuleFormValues {
  code: string;
  name: string;
  category: string;
  points: number;
  calculationType: string;
}

export default function AdminPointsPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm<RuleFormValues>();
  const [rules, setRules] = useState<RewardRule[]>([]);

  const loadRules = async () => {
    const response = await apiFetch('/reward-rules');
    const result = await response.json();
    if (!result.success) throw new Error(result.message);
    setRules(result.data);
  };

  useEffect(() => {
    loadRules().catch((error) => message.error(error instanceof Error ? error.message : 'Không thể tải rule điểm'));
  }, []);

  const createRule = async (values: RuleFormValues) => {
    try {
      const response = await apiFetch('/reward-rules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });
      const result = await response.json();
      if (!result.success) throw new Error(result.message);
      message.success('Đã tạo rule điểm');
      form.resetFields();
      await loadRules();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể tạo rule điểm');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Cấu hình tính điểm</h1>
      <Card title="Tạo module điểm thưởng">
        <Form form={form} layout="vertical" onFinish={createRule}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-5">
            <Form.Item name="code" label="Mã rule" rules={[{ required: true, message: 'Nhập mã rule' }]}>
              <Input placeholder="MENTORING_EARLY_1_WEEK" />
            </Form.Item>
            <Form.Item name="name" label="Tên rule" rules={[{ required: true, message: 'Nhập tên rule' }]}>
              <Input placeholder="Mentoring trong tuần đầu" />
            </Form.Item>
            <Form.Item name="category" label="Nhóm điểm" rules={[{ required: true, message: 'Nhập nhóm điểm' }]}>
              <Input placeholder="MENTORING" />
            </Form.Item>
            <Form.Item name="points" label="Số điểm" rules={[{ required: true, message: 'Nhập số điểm' }]}>
              <InputNumber className="w-full" />
            </Form.Item>
            <Form.Item name="calculationType" label="Cách tính" initialValue="ACTION">
              <Select options={['ACTION', 'RESULT', 'ROLE', 'TIME', 'MANUAL'].map((value) => ({ value, label: value }))} />
            </Form.Item>
          </div>
          <Button type="primary" htmlType="submit" icon={<PlusOutlined />}>Thêm rule</Button>
        </Form>
      </Card>
      <Card title="Danh sách rule điểm">
        <Table
          rowKey="_id"
          dataSource={rules}
          columns={[
            { title: 'Mã', dataIndex: 'code' },
            { title: 'Tên rule', dataIndex: 'name' },
            { title: 'Nhóm', dataIndex: 'category' },
            { title: 'Điểm', dataIndex: 'points' },
            { title: 'Cách tính', dataIndex: 'calculationType' },
            { title: 'Trạng thái', dataIndex: 'isActive', render: (active: boolean) => <Tag color={active ? 'green' : 'default'}>{active ? 'Đang dùng' : 'Tắt'}</Tag> }
          ]}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
