'use client';

import { useEffect, useState } from 'react';
import { Form, Input, Button, Card, App } from 'antd';
import { LockOutlined, UserOutlined, LoadingOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

interface LoginValues {
  userId: string;
  password: string;
}

export default function LoginPage() {
  const router = useRouter();
  const { message } = App.useApp();
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    if (!isAuthenticating) return;
    const timer = window.setInterval(() => setElapsedSeconds((elapsed) => elapsed + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isAuthenticating]);

  const onFinish = async (values: LoginValues) => {
    if (isAuthenticating) return;
    setElapsedSeconds(0);
    setIsAuthenticating(true);
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
      setIsAuthenticating(false);
      message.error(error instanceof Error ? error.message : 'Đăng nhập thất bại');
    }
  };

  if (isAuthenticating) {
    const waitingMessage = elapsedSeconds >= 10
      ? 'Hệ thống cần thêm chút thời gian. Vui lòng tiếp tục chờ, bạn không cần đăng nhập lại.'
      : elapsedSeconds >= 4
        ? 'Máy chủ đang xử lý yêu cầu của bạn. Vui lòng chờ trong giây lát.'
        : 'Đang xác thực thông tin và chuẩn bị không gian làm việc của bạn.';

    return (
      <main className="login-wait-screen" aria-live="polite" aria-busy="true">
        <div className="login-wait-glow login-wait-glow-one" />
        <div className="login-wait-glow login-wait-glow-two" />
        <section className="login-wait-card">
          <div className="login-wait-brand"><span className="login-wait-mark">H</span> HLC Mentoring</div>
          <div className="login-wait-spinner" aria-hidden="true">
            <LoadingOutlined />
          </div>
          <p className="login-wait-eyebrow">ĐANG KẾT NỐI AN TOÀN</p>
          <h1>Đăng nhập của bạn đang được xử lý</h1>
          <p className="login-wait-message">{waitingMessage}</p>
          <div className="login-wait-progress" aria-hidden="true"><span /></div>
          <div className="login-wait-footer">
            <SafetyCertificateOutlined />
            <span>Vui lòng không đóng hoặc tải lại trang</span>
          </div>
          {elapsedSeconds >= 4 && (
            <p className="login-wait-time">Đã chờ {elapsedSeconds} giây</p>
          )}
        </section>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card title="Đăng nhập HLC Mentoring" className="w-full max-w-md shadow-md">
        <Form layout="vertical" onFinish={onFinish} disabled={isAuthenticating}>
          <Form.Item name="userId" label="Mã thành viên" rules={[{ required: true, message: 'Nhập mã thành viên' }]}>
            <Input prefix={<UserOutlined />} placeholder="MT01 / MN01" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={isAuthenticating}>Đăng nhập</Button>
          <p className="mt-4 text-center text-xs text-gray-500">
            Tài khoản mật khẩu mặc định do quản trị viên cung cấp.
          </p>
        </Form>
      </Card>
    </main>
  );
}
