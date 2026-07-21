import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Avatar, Button, Typography, Drawer } from 'antd';
import type { MenuProps } from 'antd';
import {
  HomeOutlined,
  FileTextOutlined,
  TeamOutlined,
  CopyOutlined,
  ClockCircleOutlined,
  LogoutOutlined,
  MenuOutlined,
} from '@ant-design/icons';
import ServerStatusWidget from './ServerStatusWidget';
import { useAuth } from '../context/AuthContext';

const { Sider, Content } = AntLayout;
const { Text } = Typography;

type MenuItem = Required<MenuProps>['items'][number];

const navItems: MenuItem[] = [
  { key: '/', icon: <HomeOutlined />, label: <NavLink to="/" end style={{ color: 'inherit', textDecoration: 'none' }}>Dashboard</NavLink> },
  { key: '/posts', icon: <FileTextOutlined />, label: <NavLink to="/posts" style={{ color: 'inherit', textDecoration: 'none' }}>Posts</NavLink> },
  { key: '/personas', icon: <TeamOutlined />, label: <NavLink to="/personas" style={{ color: 'inherit', textDecoration: 'none' }}>Personas</NavLink> },
  { key: '/templates', icon: <CopyOutlined />, label: <NavLink to="/templates" style={{ color: 'inherit', textDecoration: 'none' }}>Templates</NavLink> },
  { key: '/scheduler', icon: <ClockCircleOutlined />, label: <NavLink to="/scheduler" style={{ color: 'inherit', textDecoration: 'none' }}>Scheduler</NavLink> },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, role, signOut } = useAuth();
  const location = useLocation();

  const menuItems = (
    <Menu
      mode="inline"
      selectedKeys={[location.pathname]}
      items={navItems}
      onClick={() => setSidebarOpen(false)}
      style={{
        border: 'none',
        background: 'transparent',
        padding: '8px 0',
      }}
    />
  );

  const sidebarContent = (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: '#FFFFFF',
        borderRadius: 24,
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <div style={{ padding: '24px 24px 16px' }}>
        <Text
          style={{
            fontSize: 24,
            fontWeight: 700,
            fontFamily: "'Outfit', sans-serif",
            color: '#FF5A5F',
            letterSpacing: '-0.02em',
          }}
        >
          Crypto<span style={{ color: '#2D3748' }}>KOL</span>
        </Text>
      </div>

      {/* Nav Menu */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
        {menuItems}
      </div>

      {/* Server Status Widget */}
      <ServerStatusWidget />

      {/* User Profile + Logout */}
      <div
        style={{
          padding: '16px 20px',
          borderTop: '1px solid #FFEDD5',
          background: 'rgba(255, 247, 235, 0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          <Avatar
            size={32}
            style={{
              background: '#FF5A5F',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            {user?.email?.[0]?.toUpperCase() || 'U'}
          </Avatar>
          <div style={{ minWidth: 0, flex: 1 }}>
            <Text
              strong
              ellipsis
              style={{
                display: 'block',
                fontSize: 13,
                color: '#2D3748',
              }}
            >
              {user?.email || 'User'}
            </Text>
            <Text
              type="secondary"
              style={{ fontSize: 11, textTransform: 'capitalize' }}
            >
              {role || 'viewer'}
            </Text>
          </div>
        </div>
        <Button
          type="text"
          danger
          icon={<LogoutOutlined />}
          onClick={signOut}
          block
          style={{
            justifyContent: 'flex-start',
            borderRadius: 12,
            height: 40,
          }}
        >
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <AntLayout style={{ minHeight: '100vh', background: '#FFF7EB' }}>
      {/* Desktop Sider */}
      <Sider
        width={288}
        style={{
          background: 'transparent',
          padding: 24,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflow: 'auto',
        }}
        breakpoint="lg"
        collapsedWidth={0}
        trigger={null}
        collapsible={false}
      >
        {sidebarContent}
      </Sider>

      {/* Mobile Drawer */}
      <Drawer
        placement="left"
        onClose={() => setSidebarOpen(false)}
        open={sidebarOpen}
        width={288}
        styles={{
          body: { padding: 0, background: '#FFF7EB' },
          header: { display: 'none' },
        }}
        rootStyle={{ position: 'fixed', inset: 0 }}
      >
        {sidebarContent}
      </Drawer>

      <AntLayout style={{ background: 'transparent', flex: 1 }}>
        {/* Mobile Top Bar */}
        <div
          style={{
            height: 80,
            display: 'flex',
            alignItems: 'center',
            padding: '0 24px',
            gap: 16,
          }}
          className="mobile-topbar"
        >
          <Button
            icon={<MenuOutlined style={{ fontSize: 20 }} />}
            onClick={() => setSidebarOpen(true)}
            style={{
              borderRadius: 16,
              border: '1px solid #FFEDD5',
              background: '#FFFFFF',
              width: 48,
              height: 48,
            }}
          />
          <Text
            style={{
              fontSize: 20,
              fontWeight: 700,
              fontFamily: "'Outfit', sans-serif",
              color: '#FF5A5F',
              flex: 1,
              textAlign: 'center',
            }}
          >
            Crypto<span style={{ color: '#2D3748' }}>KOL</span>
          </Text>
          <div style={{ width: 48 }} />
        </div>

        {/* Page content */}
        <Content
          style={{
            padding: '24px 24px 24px 0',
            flex: 1,
            overflow: 'auto',
          }}
        >
          <div
            style={{
              background: '#FFFFFF',
              borderRadius: 40,
              border: '1px solid #FFEDD5',
              boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
              padding: '40px',
              minHeight: '100%',
            }}
          >
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
