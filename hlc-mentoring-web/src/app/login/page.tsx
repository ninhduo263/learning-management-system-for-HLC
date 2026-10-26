'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { Form, Input, Button, App } from 'antd';
import { LockOutlined, UserOutlined, LoadingOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import { useRouter } from 'next/navigation';
import { apiJson, clearSession, saveSession, type AppRole } from '@/lib/api';

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
      const tokens = await apiJson<{ accessToken: string; refreshToken: string }>('/auth/login', {
        method: 'POST',
        json: { username: values.userId.trim().toLowerCase(), password: values.password, platform: 'Web' }
      });
      saveSession(tokens);
      const account = await apiJson<{ username: string; fullname?: string; systemRole: string }>('/user/me');
      const role = ({ Admin: 'ADMIN', Mentor: 'MENTOR', Mentee: 'MENTEE' } as Record<string, AppRole>)[account.systemRole];
      if (!role) {
        clearSession();
        throw new Error('Tài khoản chưa được cấp vai trò Mentor/Mentee, vui lòng liên hệ quản trị viên');
      }
      const member = role === 'ADMIN'
        ? null
        : await apiJson<{ memberCode: string; fullName: string } | null>('/member/me');
      saveSession(tokens, {
        userId: member?.memberCode || account.username,
        fullName: member?.fullName || account.fullname || account.username,
        role
      });
      router.replace(role === 'ADMIN' ? '/admin-dashboard' : role === 'MENTOR' ? '/mentor-dashboard' : '/mentee-dashboard');
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
          <div className="login-wait-brand"><Image className="login-logo" src="/brand/hlc-logo-256.png" alt="" width={40} height={40} priority /> HLC Mentoring</div>
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
    <main className="login-screen">
      <section className="login-card">
        <div className="login-brand"><Image className="login-logo" src="/brand/hlc-logo-256.png" alt="" width={40} height={40} priority /><span>HLC Mentoring</span></div>
        <h1>Đăng nhập</h1>
        <p className="login-lead">Kết nối để cùng tiến xa: mentoring, học tập và HLC Fund trong một nơi.</p>
        <Form layout="vertical" size="large" onFinish={onFinish} disabled={isAuthenticating} requiredMark={false}>
          <Form.Item name="userId" label="Mã thành viên" rules={[{ required: true, message: 'Nhập mã thành viên' }]}>
            <Input prefix={<UserOutlined />} placeholder="HLC-MTE-00001" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
            <Input.Password prefix={<LockOutlined />} autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={isAuthenticating}>Đăng nhập</Button>
          <p className="login-hint">
            Mật khẩu mặc định là ngày sinh dạng ddmmyyyy (ví dụ 20052003), hoặc do quản trị viên cung cấp.
          </p>
        </Form>
        <div className="login-stripe" aria-hidden="true"><span /><span /><span /><span /></div>
      </section>
    </main>
  );
}
