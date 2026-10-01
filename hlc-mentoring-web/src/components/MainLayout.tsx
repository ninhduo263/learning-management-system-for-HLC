'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Layout, Menu, Button, Drawer, Tag, Grid } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons';
import { getCurrentTime } from '@/utils/time';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  const [user, setUser] = useState<{ userId: string; fullName: string; role: 'ADMIN' | 'MENTOR' | 'MENTEE' } | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const screens = useBreakpoint();
  const isMobile = screens.xs === true;
  const isMockDateEnabled = Boolean(process.env.NEXT_PUBLIC_MOCK_DATE?.trim());

  useEffect(() => {
    const updateDateTime = () => setCurrentDateTime(getCurrentTime());
    updateDateTime();
    const timer = window.setInterval(updateDateTime, 1000);
    return () => window.clearInterval(timer);
  }, []);

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
    { key: 'admin-dashboard', icon: <DashboardOutlined />, label: 'Dashboard' },
    { key: 'admin-mentoring', icon: <TeamOutlined />, label: 'Quản lý Ghép cặp' },
  ];

  const menteeMenuItems = [
    { key: 'mentee-mentoring', icon: <TeamOutlined />, label: 'Mentoring & Recap' },
  ];

  const mentorMenuItems = [
    { key: 'mentor-mentoring', icon: <TeamOutlined />, label: 'Mentoring & Recap' },
  ];

  const menuItems = user.role === 'ADMIN' ? adminMenuItems : user.role === 'MENTOR' ? mentorMenuItems : menteeMenuItems;
  const roleTheme = user.role === 'MENTOR' ? 'role-mentor' : user.role === 'MENTEE' ? 'role-mentee' : 'role-admin';
  const roleLabel = user.role === 'MENTOR' ? 'Không gian Mentor' : user.role === 'MENTEE' ? 'Không gian Mentee' : 'Khu vực quản trị';
  const roleTabs = menuItems.slice(0, 4);

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

  const navigation = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={menuItems.some((item) => routeMap[item.key] === pathname) ? [menuItems.find((item) => routeMap[item.key] === pathname)?.key ?? ''] : []}
      items={menuItems}
      onClick={({ key }) => {
        const target = routeMap[String(key)];
        setDrawerOpen(false);
        if (target) router.push(target);
        else router.push('/');
      }}
    />
  );

  return (
    <Layout className={`min-h-screen app-shell ${roleTheme}`}>
      {!isMobile && <Sider className="role-sider" collapsible collapsed={collapsed} onCollapse={(value) => setCollapsed(value)} width={260}>
        <div className="brand-lockup">
          <span className="brand-mark">H</span>
          {!collapsed && <span>HLC <b>Mentoring</b></span>}
        </div>
        {!collapsed && <div className="role-caption">{roleLabel}</div>}
        {navigation}
      </Sider>}

      <Layout>
        <Header className="app-header sticky top-0 z-20 px-4 sm:px-6 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            {isMobile && <Button aria-label="Mở menu" type="text" size="large" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} />}
            <div className="header-title"><span>{roleLabel}</span><strong>Xin chào, {user.fullName.split(' ').slice(-1)[0]} 👋</strong></div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <Tag className="mock-date-tag">
              <CalendarOutlined />
              <span className="mock-date-caption">{isMockDateEnabled ? 'Ngày mô phỏng:' : 'Ngày giờ hiện tại:'}</span>
              {currentDateTime
                ? new Intl.DateTimeFormat('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit',
                  hour12: false,
                  timeZone: 'Asia/Ho_Chi_Minh'
                }).format(currentDateTime)
                : '--/--/---- --:--:--'}
            </Tag>
            <span className="hidden sm:inline text-sm text-gray-600 truncate max-w-52">{user.fullName} ({user.userId})</span>
            <Tag className="role-tag"><UserOutlined /> {user.role}</Tag>
            <Button
              type="text"
              size={isMobile ? 'large' : 'middle'}
              icon={<LogoutOutlined />}
              onClick={() => {
                localStorage.removeItem('hlc_token');
                localStorage.removeItem('hlc_user');
                router.replace('/login');
              }}
            >
              <span className="hidden sm:inline">Đăng xuất</span>
            </Button>
          </div>
        </Header>
        {roleTabs.length > 0 && <nav className="role-tabs" aria-label="Điều hướng nhanh">
          {roleTabs.map((item) => {
            const target = routeMap[item.key];
            return <button key={item.key} type="button" className={pathname === target ? 'active' : ''} onClick={() => router.push(target)}>{item.icon}<span>{item.label}</span></button>;
          })}
        </nav>}

        <Content className="app-content p-3 sm:p-6 overflow-x-hidden">
          {children}
        </Content>
      </Layout>
      <Drawer title="HLC Mentoring" placement="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} size={280} styles={{ body: { padding: 0 } }} className={roleTheme}>
        {navigation}
      </Drawer>
    </Layout>
  );
}
