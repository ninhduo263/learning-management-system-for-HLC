'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Layout, Menu, Button, Tag } from 'antd';
import {
  TeamOutlined,
  LogoutOutlined,
  DashboardOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [user, setUser] = useState<{ userId: string; fullName: string; role: 'ADMIN' | 'MENTOR' | 'MENTEE' } | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (pathname === '/login') return;
    const token = localStorage.getItem('hlc_token');
    const savedUser = localStorage.getItem('hlc_user');
    if (!token || !savedUser) {
      router.replace('/login');
      return;
    }
    try {
      setUser(JSON.parse(savedUser));
    } catch {
      localStorage.removeItem('hlc_token');
      localStorage.removeItem('hlc_user');
      router.replace('/login');
    }
  }, [pathname, router]);

  if (pathname === '/login') return <>{children}</>;
  if (!user) return null;

  const adminMenuItems = [
    { key: 'admin-dashboard', icon: <DashboardOutlined />, label: 'Báo cáo Tổng quan' },
    { key: 'admin-mentoring', icon: <TeamOutlined />, label: 'Quản lý Ghép cặp' },
  ];

  const menteeMenuItems = [
    { key: 'mentee-mentoring', icon: <TeamOutlined />, label: 'Lịch Mentoring & Recap' },
  ];

  const mentorMenuItems = [
    { key: 'mentor-mentoring', icon: <TeamOutlined />, label: 'Lịch Mentoring & Recap' },
  ];

  const menuItems = user.role === 'ADMIN' ? adminMenuItems : user.role === 'MENTOR' ? mentorMenuItems : menteeMenuItems;

  const routeMap: Record<string, string> = {
    'admin-dashboard': '/admin-dashboard',
    'admin-mentoring': '/admin-mentoring',
    'admin-modules': '/admin-modules',
    'admin-fund': '/admin-fund',
    'admin-points': '/admin-points',
    'mentee-dashboard': '/mentee-dashboard',
    'mentee-learning': '/mentee-learning',
    'mentee-mentoring': '/mentee-mentoring',
    'mentee-fund': '/mentee-fund',
    'mentor-dashboard': '/mentor-dashboard',
    'mentor-mentoring': '/mentor-mentoring'
  };

  return (
    <Layout className="min-h-screen">
      <Sider collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} width={260}>
        <div className="h-16 flex items-center justify-center text-white text-xl font-bold bg-blue-600/20 m-2 rounded-lg">
          {collapsed ? 'HLC' : 'HLC Mentoring'}
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={menuItems.some((item) => routeMap[item.key] === pathname) ? [menuItems.find((item) => routeMap[item.key] === pathname)?.key ?? ''] : []}
          items={menuItems}
          onClick={({ key }) => {
            const target = routeMap[String(key)];
            if (target) router.push(target);
            else router.push('/');
          }}
        />
      </Sider>

      <Layout>
        <Header className="bg-white px-6 flex items-center justify-between shadow-sm">
          <div className="text-xl font-semibold text-gray-700">Trang quản trị</div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600">{user.fullName} ({user.userId})</span>
            <Tag color={user.role === 'ADMIN' ? 'red' : user.role === 'MENTOR' ? 'blue' : 'green'}>{user.role}</Tag>
            <Button
              type="text"
              icon={<LogoutOutlined />}
              onClick={() => {
                localStorage.removeItem('hlc_token');
                localStorage.removeItem('hlc_user');
                router.replace('/login');
              }}
            >
              Đăng xuất
            </Button>
          </div>
        </Header>

        <Content className="p-6 bg-gray-50">
          {children}
        </Content>
      </Layout>
    </Layout>
  );
}
