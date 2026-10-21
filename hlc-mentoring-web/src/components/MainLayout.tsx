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
  ReloadOutlined,
  TrophyOutlined,
  WalletOutlined,
  BookOutlined,
  ApartmentOutlined,
  IdcardOutlined
} from '@ant-design/icons';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { apiFetch, apiJson, clearSession, getSessionUser } from '@/lib/api';
import { getCurrentTime, syncServerTime } from '@/utils/time';
import { accessApi, type AdminScope } from '@/services/hlcApi';

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
  const [scopes, setScopes] = useState<AdminScope[]>([]);
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
    const savedUser = getSessionUser();
    if (!localStorage.getItem('hlc_token') || !savedUser) {
      clearSession();
      router.replace('/login');
      return;
    }
    let active = true;
    Promise.resolve().then(() => { if (active) setUser(savedUser); });
    return () => { active = false; };
  }, [pathname, router]);

  useEffect(() => {
    if (!user || pathname === '/login') return;
    let active = true;
    const loadMockDate = async () => {
      try {
        const { date, source, now } = await apiJson<{
          date: string | null;
          source: 'runtime' | 'environment' | 'real';
          now: string;
        }>('/time/mock');
        if (!active) return;
        setMockDate(date);
        setMockDateSource(source);
        syncServerTime(now);
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

  // Quyền quản trị theo phạm vi (mentee/mentor được giao duyệt quỹ, quản lý module...)
  useEffect(() => {
    if (!user || user.role === 'ADMIN') return;
    let active = true;
    accessApi.mine().then((access) => { if (active) setScopes(access.scopes); }).catch(() => undefined);
    return () => { active = false; };
  }, [user]);

  if (pathname === '/login') return <>{children}</>;
  if (!user) return null;

  const adminMenuItems = [
    { key: 'admin-dashboard', icon: <DashboardOutlined />, label: 'Dashboard tháng' },
    { key: 'admin-mentoring', icon: <TeamOutlined />, label: 'Ghép cặp mentoring' },
    { key: 'admin-points', icon: <TrophyOutlined />, label: 'Điểm phụ cấp' },
    { key: 'admin-fund', icon: <WalletOutlined />, label: 'HLC Fund' },
    { key: 'admin-modules', icon: <BookOutlined />, label: 'Học tập' },
    { key: 'admin-organization', icon: <ApartmentOutlined />, label: 'Tổ chức & phân quyền' },
    { key: 'admin-members', icon: <IdcardOutlined />, label: 'Thành viên & báo cáo' },
  ];

  // Trang quản trị mở cho mentor/mentee được giao quyền
  const scopedMenuItems = [
    scopes.includes('MENTORING') && { key: 'admin-mentoring', icon: <TeamOutlined />, label: 'Quản lý ghép cặp' },
    scopes.includes('POINT') && { key: 'admin-points', icon: <TrophyOutlined />, label: 'Quản lý điểm' },
    scopes.includes('FUND') && { key: 'admin-fund', icon: <WalletOutlined />, label: 'Duyệt HLC Fund' },
    scopes.includes('LEARNING_MODULE') && { key: 'admin-modules', icon: <BookOutlined />, label: 'Quản lý module' },
  ].filter((item): item is { key: string; icon: React.JSX.Element; label: string } => Boolean(item));

  const menteeMenuItems = [
    { key: 'mentee-dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: 'mentee-mentoring', icon: <TeamOutlined />, label: 'Mentoring & Recap' },
    { key: 'mentee-learning', icon: <BookOutlined />, label: 'Học tập' },
    { key: 'mentee-fund', icon: <WalletOutlined />, label: 'HLC Fund' },
    ...scopedMenuItems,
  ];

  const mentorMenuItems = [
    { key: 'mentor-dashboard', icon: <DashboardOutlined />, label: 'Tổng quan' },
    { key: 'mentor-mentoring', icon: <TeamOutlined />, label: 'Mentoring & Recap' },
    { key: 'mentor-learning', icon: <BookOutlined />, label: 'Học tập' },
    ...scopedMenuItems,
  ];

  const menuItems = user.role === 'ADMIN' ? adminMenuItems : user.role === 'MENTOR' ? mentorMenuItems : menteeMenuItems;
  const roleTheme = user.role === 'MENTOR' ? 'role-mentor' : user.role === 'MENTEE' ? 'role-mentee' : 'role-admin';
  const roleLabel = user.role === 'MENTOR' ? 'Không gian Mentor' : user.role === 'MENTEE' ? 'Không gian Mentee' : 'Khu vực quản trị';
  const roleTabs = menuItems.slice(0, 4);

  const saveMockDate = async (date: string | null) => {
    setSavingMockDate(true);
    try {
      const result = await apiJson<{ date: string | null; enabled: boolean; now: string }>('/time/mock', {
        method: 'PUT',
        json: { date }
      });
      syncServerTime(result.now);
      message.success(result.enabled
        ? `Đã bật ngày giả lập ${dayjs(result.date).format('DD/MM/YYYY')} cho toàn hệ thống`
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
    'admin-organization': '/admin-organization',
    'admin-members': '/admin-members',
    'mentor-learning': '/mentor-learning',
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
          {!collapsed && <span>HLC <b>LMS</b></span>}
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
                const refreshToken = localStorage.getItem('hlc_refresh_token');
                if (refreshToken) {
                  void apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }).catch(() => undefined);
                }
                clearSession();
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
      <Drawer title="HLC LMS" placement="left" open={drawerOpen} onClose={() => setDrawerOpen(false)} size={280} styles={{ body: { padding: 0 } }} className={roleTheme}>
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
