'use client';
import { useEffect, useState } from 'react';
import { Form, Input, Switch, Button, Table, App, Card, Divider } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { apiFetch } from '@/lib/api';

export default function AdminModulesPage() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Hàm lấy danh sách module từ Backend
  const fetchModules = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/modules');
      const result = await res.json();
      if (result.success) setModules(result.data);
    } catch (error) {
      message.error('Lỗi khi tải danh sách module');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchModules();
  }, []);

  // 2. Hàm xử lý khi Admin bấm "Tạo Module Mới"
  const onFinish = async (values: any) => {
    try {
      // Định dạng lại dữ liệu khớp với Schema Backend
      const payload = {
        name: values.name,
        code: values.code,
        submissionConfig: {
          allowText: values.allowText || false,
          allowImage: values.allowImage || false,
          allowVideoLink: values.allowVideoLink || false,
        },
        featureConfig: {
          requireMentor: values.requireMentor || false,
        }
      };

      const res = await apiFetch('/modules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const result = await res.json();
      if (result.success) {
        message.success('Tạo Module thành công!');
        form.resetFields(); // Xoá trắng form
        fetchModules();     // Tải lại bảng
      } else {
        message.error(result.message);
      }
    } catch (error) {
      message.error('Lỗi khi lưu module');
    }
  };

  // 3. Cấu hình cột cho bảng danh sách
  const columns = [
    { title: 'Tên hoạt động', dataIndex: 'name', key: 'name', render: (t: string) => <span className="font-bold">{t}</span> },
    { title: 'Mã Code', dataIndex: 'code', key: 'code' },
    { 
      title: 'Cấu hình nộp bài', 
      key: 'config',
      render: (record: any) => {
        const { allowText, allowImage, allowVideoLink } = record.submissionConfig;
        let configs = [];
        if (allowText) configs.push('Text');
        if (allowImage) configs.push('Ảnh');
        if (allowVideoLink) configs.push('Link Youtube');
        return <span>{configs.join(' + ') || 'Không có'}</span>;
      }
    },
    { 
      title: 'Trạng thái', 
      dataIndex: 'isActive', 
      key: 'isActive',
      render: (isActive: boolean) => (
        <span className={isActive ? "text-green-600 font-medium" : "text-gray-400"}>
          {isActive ? 'Đang hoạt động' : 'Đã tắt'}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Quản lý Hoạt động (Modules)</h1>
      
      {/* KHU VỰC 1: FORM TẠO MỚI */}
      <Card title="Tạo hoạt động mới" className="shadow-sm">
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Form.Item label="Tên hiển thị (VD: Review Sách Tuần 1)" name="name" rules={[{ required: true, message: 'Vui lòng nhập tên' }]}>
              <Input placeholder="Nhập tên hoạt động..." />
            </Form.Item>
            <Form.Item label="Mã Code (Viết liền không dấu, VD: BOOK_W1)" name="code" rules={[{ required: true, message: 'Vui lòng nhập mã code' }]}>
              <Input placeholder="BOOK_W1" className="uppercase" />
            </Form.Item>
          </div>

          <Divider className="my-2" />
          <p className="font-semibold mb-4 text-gray-700">Tuỳ chọn tính năng cho Mentee:</p>
          
          <div className="flex flex-wrap gap-8">
            <Form.Item className="mb-0">
              <Form.Item name="allowText" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
              <span className="ml-2">Cho phép nộp đoạn Text</span>
            </Form.Item>
            <Form.Item className="mb-0">
              <Form.Item name="allowImage" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
              <span className="ml-2">Cho phép tải Ảnh (Cloudinary)</span>
            </Form.Item>
            <Form.Item className="mb-0">
              <Form.Item name="allowVideoLink" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
              <span className="ml-2">Cho phép nộp Link Youtube</span>
            </Form.Item>
            <Form.Item className="mb-0">
              <Form.Item name="requireMentor" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
              <span className="ml-2">Yêu cầu phải có Mentor phụ trách</span>
            </Form.Item>
          </div>

          <Form.Item className="mt-6 mb-0">
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} className="bg-blue-600">
              Tạo Module Mới
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* KHU VỰC 2: BẢNG DANH SÁCH */}
      <Card title="Danh sách các hoạt động đang mở" className="shadow-sm">
        <Table columns={columns} dataSource={modules} rowKey="_id" loading={loading} pagination={false} scroll={{ x: 'max-content' }} />
      </Card>
    </div>
  );
}