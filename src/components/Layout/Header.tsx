import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Button, Badge, Modal, Select, Radio, Space, Tooltip } from 'antd';
import { UserOutlined, LogoutOutlined, DownOutlined, BulbOutlined, TeamOutlined, ShoppingCartOutlined, FileTextOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import { useState, useEffect, lazy, Suspense } from 'react';
const RegistrationHelp = lazy(() => import('../../pages/RegistrationHelp'));
import type { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { setTheme } from '../../store/slices/themeSlice';
import { ref as dbRef, update as dbUpdate } from 'firebase/database';
import logger from '../../utils/logger';
import { db } from '../../services/firebase';
import { signOut } from '../../services/firebaseAuth';
import './Header.css';
import wgysLogo from '../../assets/wgys.webp';

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const role = useSelector((state: RootState) => state.auth.role);
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);

  const cartCount = useSelector((s: RootState) => s.cart?.items?.length || 0);
  const [cartOpen, setCartOpen] = useState(false);
  const [CartDrawerComp, setCartDrawerComp] = useState<any | null>(null);

  const handleSignOut = async () => {
    try {
      await signOut();
      dispatch(logout());
      navigate('/signin');
    } catch (error) {
      logger.error('Sign out failed:', error);
    }
  };

  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'My Profile',
      onClick: () => navigate('/profile'),
    },
    {
      key: 'family',
      icon: <TeamOutlined />,
      label: 'My Family',
      onClick: () => navigate('/my-family'),
    },
    {
      key: 'payment-methods',
      icon: <ShoppingCartOutlined />,
      label: 'My Payment Methods',
      onClick: () => navigate('/payment-methods'),
    },
    {
      key: 'my-registrations',
      icon: <FileTextOutlined />,
      label: 'My Registrations',
      onClick: () => navigate('/my-registrations'),
    },
    {
      key: 'registration-help',
      icon: <FileTextOutlined />,
      label: 'Registration Help',
      onClick: () => navigate('/registration-help'),
    },
    {
      key: 'theme',
      icon: <BulbOutlined />,
      label: isDarkMode ? 'Light Mode' : 'Dark Mode',
      onClick: async () => {
        const newTheme = !isDarkMode ? 'dark' : 'light';
        dispatch(setTheme(!isDarkMode));
        try {
          // persist to RTDB for the user
          if (user?.uid) {
            const prefRef = dbRef(db, `users/${user.uid}/preferences`);
            await dbUpdate(prefRef, { theme: newTheme });
          }
        } catch (e) {
          logger.error('Failed to persist theme preference to RTDB', e);
        }

        try {
          // cache locally for fast reads and legacy compatibility
          localStorage.setItem('wgys.pref.theme', newTheme);
          // legacy key
          localStorage.setItem('wgys.theme', newTheme);
        } catch (e) {
          logger.error('Failed to cache theme preference locally', e);
        }
      },
    },
    {
      type: 'divider',
    },
    {
      key: 'signout',
      icon: <LogoutOutlined />,
      label: 'Sign Out',
      onClick: handleSignOut,
    },
  ];

  // Mobile preview modal state
  const [mobilePreviewVisible, setMobilePreviewVisible] = useState(false);
  const [deviceKey, setDeviceKey] = useState<'iphone-se'|'iphone-12'|'pixel-4'|'ipad'>('iphone-12');
  const [orientation, setOrientation] = useState<'portrait'|'landscape'>('portrait');

  const devices: Record<string, {label: string; w: number; h: number}> = {
    'iphone-se': { label: 'iPhone SE', w: 375, h: 667 },
    'iphone-12': { label: 'iPhone 12/13', w: 390, h: 844 },
    'pixel-4': { label: 'Pixel 4', w: 393, h: 851 },
    'ipad': { label: 'iPad Mini', w: 768, h: 1024 },
  };

  const currentHref = typeof window !== 'undefined' ? window.location.href : '/';

  const [helpModalVisible, setHelpModalVisible] = useState(false);

  const openMobilePreview = () => setMobilePreviewVisible(true);
  const closeMobilePreview = () => setMobilePreviewVisible(false);

  // lazy-load cart drawer when requested to avoid require() in browser
  useEffect(() => {
    let mounted = true;
    if (cartOpen && !CartDrawerComp) {
      import('../Cart/CartDrawer').then((m) => {
        if (mounted) setCartDrawerComp(() => m.default);
      }).catch((e) => {
        logger.error('Failed to load CartDrawer', e);
      });
    }
    return () => { mounted = false; };
  }, [cartOpen, CartDrawerComp]);

  return (
    <header className="header">
      <div className="header-content">
        <div className="header-left" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={wgysLogo}
            alt="West Georgia Youth Sports, Inc."
            style={{ height: '40px', width: 'auto', cursor: 'pointer' }}
            role="button"
            tabIndex={0}
            onClick={() => navigate('/')}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate('/'); }}
          />
        </div>
        <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button type="text" onClick={() => setCartOpen(true)} style={{ fontSize: 14 }}>
            <Badge count={cartCount} offset={[0, 0]}>
              <ShoppingCartOutlined style={{ fontSize: 18 }} />
            </Badge>
          </Button>

          <Dropdown
          menu={{ items: menuItems as any }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button
            type="text"
            className="user-profile-btn"
            style={{
              fontSize: '12px',
              fontWeight: 400,
              opacity: 0.8,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            <UserOutlined />
            {user?.email?.split('@')[0] || 'User'}
            <DownOutlined style={{ fontSize: '10px' }} />
          </Button>
        </Dropdown>
        {/* Admin-only Mobile Preview button */}
        {(role === 'admin' || role === 'owner') && (
          <Button type="text" onClick={openMobilePreview} style={{ fontSize: 12, marginLeft: 8 }}>
            Mobile Preview
          </Button>
        )}

        {/* Mobile Preview Modal (Admin only) */}
        <Modal
          title="Mobile Preview"
          open={mobilePreviewVisible}
          onCancel={closeMobilePreview}
          footer={null}
          width={900}
          style={{ display: 'flex', flexDirection: 'column', gap: 12 }}
        >
          <Space style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Space>
              <Select value={deviceKey} onChange={(v) => setDeviceKey(v as any)} options={Object.keys(devices).map(k => ({ value: k, label: devices[k].label }))} />
              <Radio.Group value={orientation} onChange={(e) => setOrientation(e.target.value)}>
                <Radio.Button value="portrait">Portrait</Radio.Button>
                <Radio.Button value="landscape">Landscape</Radio.Button>
              </Radio.Group>
            </Space>
            <Space>
              <Tooltip title="Open preview in a new window">
                <Button type="default" onClick={() => window.open(currentHref, '_blank')}>Open</Button>
              </Tooltip>
              <Button type="primary" onClick={closeMobilePreview}>Close</Button>
            </Space>
          </Space>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {(() => {
              const d = devices[deviceKey];
              const width = orientation === 'portrait' ? d.w : d.h;
              const height = orientation === 'portrait' ? d.h : d.w;
              return (
                <div className="mobile-preview-frame" style={{ width: width + 20, height: height + 60 }}>
                  <iframe
                    title="Mobile preview"
                    src={currentHref}
                    style={{ width: width, height: height, border: '1px solid #ddd', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}
                  />
                </div>
              );
            })()}
          </div>
        </Modal>

          <Tooltip title="Registration Help">
            <Button type="text" onClick={() => setHelpModalVisible(true)} style={{ fontSize: 14 }}>
              <QuestionCircleOutlined style={{ fontSize: 18 }} />
            </Button>
          </Tooltip>

          <Modal
            title="Registration Help"
            open={helpModalVisible}
            onCancel={() => setHelpModalVisible(false)}
            footer={null}
            width={700}
          >
            <Suspense fallback={<div style={{ padding: 24 }}>Loading help...</div>}>
              <RegistrationHelp compact />
            </Suspense>
          </Modal>

        </div>
        {/* lazy-load cart drawer to avoid circular deps */}
        {cartOpen && (
          // dynamic import so we don't add heavy bundle overhead in header
          (CartDrawerComp ? (
            <CartDrawerComp open={cartOpen} onClose={() => setCartOpen(false)} />
          ) : (
            <div style={{ padding: 16 }}>Loading cart...</div>
          ))
        )}
      </div>
    </header>
  );
}
