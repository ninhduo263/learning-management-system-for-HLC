'use client';

import { Form, Input, Button, Card, App } from 'antd';
import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface LoginValues {
  userId: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { message } = App.useApp();

  const onFinish = async (values: LoginValues) => {
    try {
      const response = await apiFetch('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: values.userId.toUpperCase(), password: values.password })
      });
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(
          response.status === 404
            ? 'Không tìm thấy API đăng nhập. Hãy khởi động lại đúng backend tại cổng 5000.'
            : `Backend trả về phản hồi không hợp lệ (HTTP ${response.status})`
        );
      }
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || `Đăng nhập thất bại (HTTP ${response.status})`);
      if (!result.success) throw new Error(result.message);
      localStorage.setItem('hlc_token', result.token);
      localStorage.setItem('hlc_user', JSON.stringify(result.user));
      router.replace('/');
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Đăng nhập thất bại');
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card title="Đăng nhập HLC Mentoring" className="w-full max-w-md shadow-md">
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="userId" label="Mã thành viên" rules={[{ required: true, message: 'Nhập mã thành viên' }]}>
            <Input prefix={<UserOutlined />} placeholder="MT01 / MN01" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block>Đăng nhập</Button>
          <p className="mt-4 text-center text-xs text-gray-500">
            Tài khoản mật khẩu mặc định do quản trị viên cung cấp.
          </p>
        </Form>
      </Card>
    </main>
  );
}
