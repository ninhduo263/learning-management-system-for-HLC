'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { App, Layout, Menu, Button, Drawer, Grid, Modal, DatePicker, Tag } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  LogoutOutlined,
  MenuOutlined,
  UserOutlined,
  CalendarOutlined,
  ClockCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { apiFetch } from '@/lib/api';
import { getCurrentTime, setClientMockDate } from '@/utils/time';

const { Header, Sider, Content } = Layout;
const { useBreakpoint } = Grid;

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentDateTime, setCurrentDateTime] = useState<Date | null>(null);
  const [mockDate, setMockDate] = useState<string | null>(null);
  const [mockDateSource, setMockDateSource] = useState<'runtime' | 'environment' | 'real'>('real');
  const [mockDateModalOpen, setMockDateModalOpen] = useState(false);
  const [draftMockDate, setDraftMockDate] = useState<Dayjs | null>(null);
  const [savingMockDate, setSavingMockDate] = useState(false);
  const [user, setUser] = useState<{ userId: string; fullName: string; role: 'ADMIN' | 'MENTOR' | 'MENTEE' } | null>(null);
  const { message } = App.useApp();
  const router = useRouter();
  const pathname = usePathname();
  const screens = useBreakpoint();
  const isMobile = screens.xs === true;
  const isMockDateEnabled = mockDate !== null;

  useEffect(() => {
    const updateDateTime = () => setCurrentDateTime(getCurrentTime());
    updateDateTime();
    const timer = window.setInterval(updateDateTime, 1000);
    const handleMockDateChange = () => updateDateTime();
    window.addEventListener('hlc-mock-date-change', handleMockDateChange);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('hlc-mock-date-change', handleMockDateChange);
    };
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

  useEffect(() => {
    if (!user || pathname === '/login') return;
    let active = true;
    const loadMockDate = async () => {
      try {
        const response = await apiFetch('/time/mock');
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || 'Không thể đồng bộ ngày giả lập từ máy chủ');
        }
        if (!active) return;
        const { date, source } = result.data as {
          date: string | null;
          source: 'runtime' | 'environment' | 'real';
        };
        setMockDate(date);
        setMockDateSource(source);
        setClientMockDate(date);
        setCurrentDateTime(getCurrentTime());
      } catch (error) {
        if (active) {
          message.error(error instanceof Error ? error.message : 'Không thể đồng bộ ngày giả lập từ máy chủ');
        }
      }
    };
    void loadMockDate();
    return () => { active = false; };
  }, [message, pathname, user]);

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

  const saveMockDate = async (date: string | null) => {
    setSavingMockDate(true);
    try {
      const response = await apiFetch('/time/mock', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date })
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || 'Không thể cập nhật ngày giả lập');
      }
      setClientMockDate(result.data.date);
      message.success(result.data.enabled
        ? `Đã bật ngày giả lập ${dayjs(result.data.date).format('DD/MM/YYYY')} cho toàn hệ thống`
        : 'Đã tắt ngày giả lập; toàn hệ thống dùng ngày thật');
      window.location.reload();
    } catch (error) {
      message.error(error instanceof Error ? error.message : 'Không thể cập nhật ngày giả lập');
      setSavingMockDate(false);
    }
  };

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
            {user.role === 'ADMIN' ? (
              <Button
                className={`mock-date-button${isMockDateEnabled ? ' is-active' : ''}`}
                icon={isMockDateEnabled ? <CalendarOutlined /> : <ClockCircleOutlined />}
                onClick={() => {
                  setDraftMockDate(isMockDateEnabled && mockDate ? dayjs(mockDate) : dayjs(currentDateTime || new Date()));
                  setMockDateModalOpen(true);
                }}
                aria-label={isMockDateEnabled ? 'Thay đổi ngày giả lập' : 'Mở cài đặt ngày giả lập'}
              >
                <span className="mock-date-caption">
                  {isMockDateEnabled ? (isMobile ? 'Ngày test' : 'Ngày giả lập') : (isMobile ? 'Đặt ngày test' : 'Mô phỏng ngày')}
                </span>
                {currentDateTime
                  ? new Intl.DateTimeFormat('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    ...(!isMockDateEnabled && !isMobile ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
                    timeZone: 'Asia/Ho_Chi_Minh'
                  }).format(currentDateTime)
                  : '--/--/----'}
              </Button>
            ) : (
              <div className={`mock-date-display${isMockDateEnabled ? ' is-active' : ''}`} title={isMockDateEnabled ? `Ngày giả lập toàn hệ thống (${mockDateSource})` : 'Ngày giờ hiện tại'}>
                {isMockDateEnabled ? <CalendarOutlined /> : <ClockCircleOutlined />}
                <span className="mock-date-caption">{isMockDateEnabled ? (isMobile ? 'Ngày test' : 'Ngày giả lập') : (isMobile ? '' : 'Ngày hiện tại')}</span>
                {currentDateTime
                  ? new Intl.DateTimeFormat('vi-VN', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    ...(!isMockDateEnabled && !isMobile ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
                    timeZone: 'Asia/Ho_Chi_Minh'
                  }).format(currentDateTime)
                  : '--/--/----'}
              </div>
            )}
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
      <Modal
        title="Giả lập ngày hệ thống"
        open={mockDateModalOpen}
        onCancel={() => setMockDateModalOpen(false)}
        onOk={() => { if (draftMockDate) void saveMockDate(draftMockDate.format('YYYY-MM-DD')); }}
        okText="Áp dụng ngày"
        cancelText="Hủy"
        confirmLoading={savingMockDate}
        okButtonProps={{ disabled: !draftMockDate }}
        destroyOnHidden
      >
        <div className="space-y-3">
          <p>Chọn ngày để kiểm thử các mốc ghép cặp, lịch mentoring và recap. Ngày giả lập sẽ tác động đến toàn bộ người dùng và các quy tắc backend.</p>
          <DatePicker
            className="w-full"
            value={draftMockDate}
            onChange={setDraftMockDate}
            format="DD/MM/YYYY"
            allowClear={false}
            inputReadOnly
          />
          {isMockDateEnabled && (
            <Button
              block
              icon={<ReloadOutlined />}
              loading={savingMockDate}
              onClick={() => void saveMockDate(null)}
            >
              Tắt giả lập, dùng ngày thật
            </Button>
          )}
        </div>
      </Modal>
    </Layout>
  );
}
