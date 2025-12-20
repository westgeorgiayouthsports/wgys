import { createSelector } from 'reselect';
import type { RootState } from '../store';
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
  FormOutlined,
  CrownOutlined,
  UserOutlined,
  CreditCardOutlined,
  FileTextOutlined,
} from '@ant-design/icons';

const navItems = [
  // Admin-only items (will be placed in Admin section via selector)
  { key: '/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  { key: '/teams', label: 'Teams', icon: <TeamOutlined /> },
  { key: '/programs', label: 'Programs', icon: <TrophyOutlined /> },
  { key: '/people', label: 'People', icon: <ContactsOutlined /> },
  { key: '/settings', label: 'Settings', icon: <SettingOutlined /> },

  // User items
  { key: '/profile', label: 'My Profile', icon: <UserOutlined /> },
  { key: '/my-family', label: 'My Family', icon: <UsergroupAddOutlined /> },
  { key: '/payment-methods', label: 'My Payment Methods', icon: <CreditCardOutlined /> },
  { key: '/my-registrations', label: 'My Registrations', icon: <FileTextOutlined /> },
  { key: '/register', label: 'Register', icon: <FormOutlined /> },
  { key: '/registration-help', label: 'Registration Help', icon: <QuestionCircleOutlined /> },
  { key: '/announcements', label: 'Announcements', icon: <SoundOutlined /> },
  { key: '/schedules', label: 'Schedules', icon: <CalendarOutlined /> },
];

const adminItems = [
  { key: '/admin', label: 'Admin Panel', icon: <CrownOutlined /> },
];

const selectRole = (state: RootState) => state.auth.role;

// Keys grouped for clarity in selector logic
const USER_KEYS = new Set([
  '/profile',
  '/my-family',
  '/payment-methods',
  '/my-registrations',
  '/register',
  '/registration-help',
  '/announcements',
  '/schedules',
]);

const ADMIN_KEYS = new Set([
  '/dashboard',
  '/teams',
  '/programs',
  '/people',
  '/settings',
]);

export const selectMenuItems = createSelector([selectRole], (role) => {
  const isAdmin = role === 'admin' || role === 'owner';

  const userItems = navItems
    .filter((i) => USER_KEYS.has(i.key))
    .map((item) => ({ key: item.key, icon: item.icon, label: item.label }));

  const adminCore = navItems
    .filter((i) => ADMIN_KEYS.has(i.key))
    .map((item) => ({ key: item.key, icon: item.icon, label: item.label }));

  const adminPanel = adminItems.map((item) => ({
    key: item.key,
    icon: item.icon,
    label: item.label,
  }));

  return [
    ...userItems,
    ...(isAdmin
      ? [{ key: 'divider', type: 'divider' } as any, ...adminCore, ...adminPanel]
      : []),
  ];
});
