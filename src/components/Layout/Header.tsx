import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Button, Badge } from 'antd';
import { UserOutlined, LogoutOutlined, DownOutlined, BulbOutlined, TeamOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import { useState, useEffect } from 'react';
import type { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { toggleTheme } from '../../store/slices/themeSlice';
import { signOut } from '../../services/firebaseAuth';
import './Header.css';
import wgysLogo from '../../assets/wgys.webp';

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
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
      console.error('Sign out failed:', error);
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
      key: 'theme',
      icon: <BulbOutlined />,
      label: isDarkMode ? 'Light Mode' : 'Dark Mode',
      onClick: () => dispatch(toggleTheme()),
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

  // lazy-load cart drawer when requested to avoid require() in browser
  useEffect(() => {
    let mounted = true;
    if (cartOpen && !CartDrawerComp) {
      import('../Cart/CartDrawer').then((m) => {
        if (mounted) setCartDrawerComp(() => m.default);
      }).catch((e) => {
        console.error('Failed to load CartDrawer', e);
      });
    }
    return () => { mounted = false; };
  }, [cartOpen, CartDrawerComp]);

  return (
    <header className="header">
      <div className="header-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
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
