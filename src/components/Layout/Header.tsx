import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { Dropdown, Button } from 'antd';
import { UserOutlined, SettingOutlined, LogoutOutlined, DownOutlined, BulbOutlined } from '@ant-design/icons';
import { RootState } from '../../store/store';
import { logout } from '../../store/slices/authSlice';
import { toggleTheme } from '../../store/slices/themeSlice';
import { signOut } from '../../services/firebaseAuth';
import './Header.css';

export default function Header() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const user = useSelector((state: RootState) => state.auth.user);
  const isDarkMode = useSelector((state: RootState) => state.theme.isDarkMode);

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

  return (
    <header className="header">
      <div className="header-content">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img 
            src="/src/assets/wgys.webp" 
            alt="West Georgia Youth Sports, Inc." 
            style={{ height: '40px', width: 'auto' }}
          />
        </div>
        <Dropdown
          menu={{ items: menuItems }}
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
    </header>
  );
}
