import { useState } from 'react';
import * as React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { Layout, Menu, Button, Typography } from 'antd';
import {
  DashboardOutlined,
  TeamOutlined,
  SoundOutlined,
  CalendarOutlined,
  ContactsOutlined,
  SettingOutlined,
  TrophyOutlined,
  UsergroupAddOutlined,
  QuestionCircleOutlined,
  UserOutlined,
  CrownOutlined,
  MenuOutlined,
  CloseOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from '@ant-design/icons';
import type { RootState } from '../../store/store';
import './Sidebar.css';
import wgysLogoSmall from '../../assets/wgys-logo-small.png';
import wgysLogo from '../../assets/wgys-logo.png';

const { Sider } = Layout;
const { Title } = Typography;

const navItems = [
  { key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  { key: '/teams', label: 'Teams', icon: <TeamOutlined /> },
  { key: '/my-family', label: 'My Family', icon: <UsergroupAddOutlined /> },
  { key: '/registration-help', label: 'Registration Help', icon: <QuestionCircleOutlined /> },
  { key: '/programs', label: 'Programs', icon: <TrophyOutlined /> },
  { key: '/announcements', label: 'Announcements', icon: <SoundOutlined /> },
  { key: '/schedules', label: 'Schedules', icon: <CalendarOutlined /> },
  { key: '/people', label: 'People', icon: <ContactsOutlined /> },
  { key: '/settings', label: 'Settings', icon: <SettingOutlined /> },
];

const adminItems = [
  { key: '/admin', label: 'Admin Panel', icon: <CrownOutlined /> },
];

interface SidebarProps {
  onCollapse?: (collapsed: boolean) => void;
}

export default function Sidebar({ onCollapse }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useSelector((state: RootState) => state.auth);

  // Update CSS variables for sidebar width
  React.useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', collapsed ? '48px' : '200px');
    document.documentElement.style.setProperty('--sidebar-collapsed-width', '48px');
  }, [collapsed]);

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key);
    setMobileOpen(false);
  };

  const menuItems = [
    ...navItems.filter(item => {
      // Show People page only for admin/owner roles
      if (item.key === '/people') {
        return role === 'admin' || role === 'owner';
      }
      return true;
    }).map(item => ({
      key: item.key,
      icon: item.icon,
      label: item.label,
    })),
    ...(role === 'admin' || role === 'owner' ? [
      { key: 'divider', type: 'divider' },
      ...adminItems.map(item => ({
        key: item.key,
        icon: item.icon,
        label: item.label,
      }))
    ] : []),
  ];

  return (
    <>
      {/* Mobile Toggle Button */}
      <Button
        className="sidebar-mobile-toggle"
        type="text"
        icon={<MenuOutlined />}
        onClick={() => { setMobileOpen(true); }}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 1001,
          display: 'none',

        }}
      />

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => { setMobileOpen(false); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 999,
            display: 'none',
          }}
        />
      )}

      {/* Sidebar */}
      <Sider
        width="auto"
        collapsedWidth={48}
        collapsed={collapsed}
        className={`custom-sidebar ${mobileOpen ? 'mobile-open' : ''}`}
        style={{
          position: 'fixed',
          left: 0,
          top: 0,
          height: '100vh',
          zIndex: 1000,
          minWidth: collapsed ? '48px' : 'auto',
        }}
      >
        {/* Logo Header */}
        <div className="sidebar-header" style={{
          padding: '24px',
          display: 'flex',
          justifyContent: collapsed ? 'center' : 'space-between',
          alignItems: 'center',
        }}>
          <img 
            src={collapsed ? wgysLogoSmall : wgysLogo} 
            alt="WGYS Logo" 
            style={{ 
              height: collapsed ? '24px' : '94px', 
              width: 'auto'
            }}
          />
          <div style={{ display: 'flex', gap: '8px' }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => {
                const newCollapsed = !collapsed;
                setCollapsed(newCollapsed);
                onCollapse?.(newCollapsed);
              }}
              style={{
                fontSize: '16px',
              }}
            />
            <Button
              className="sidebar-mobile-close"
              type="text"
              icon={<CloseOutlined />}
              onClick={() => { setMobileOpen(false); }}
              style={{
                display: 'none',
              }}
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={handleMenuClick}
          items={menuItems as any}
          style={{
            border: 'none',
            flex: 1,
            paddingTop: '24px',
          }}
        />

      </Sider>
    </>
  );
}