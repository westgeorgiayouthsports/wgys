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
  AuditOutlined,
  UsergroupAddOutlined,
  QuestionCircleOutlined,
  FormOutlined,
  UserOutlined,
  CreditCardOutlined,
  FileTextOutlined,
  FireOutlined,
  DribbbleOutlined,
} from '@ant-design/icons';

const navItems = [
  // Admin-only items (will be placed in Admin section via selector)
  { key: '/admin/dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
  { key: '/admin/seasons', label: 'Seasons', icon: <FireOutlined /> },
  { key: '/admin/sports', label: 'Sports', icon: <DribbbleOutlined /> },
  { key: '/admin/program-templates', label: 'Program Templates', icon: <FileTextOutlined /> },
  { key: '/admin/programs', label: 'Programs', icon: <TrophyOutlined /> },
  { key: '/admin/teams', label: 'Teams', icon: <TeamOutlined /> },
  { key: '/admin/people', label: 'People', icon: <ContactsOutlined /> },
  { key: '/admin/settings', label: 'Settings', icon: <SettingOutlined /> },
  { key: '/admin/payment-plans', label: 'Payment Plans', icon: <CreditCardOutlined /> },

  // User items
  { key: '/profile', label: 'My Profile', icon: <UserOutlined /> },
  { key: '/my-family', label: 'My Family', icon: <UsergroupAddOutlined /> },
  { key: '/payment-methods', label: 'My Payment Methods', icon: <CreditCardOutlined /> },
  { key: '/my-registrations', label: 'My Registrations', icon: <FileTextOutlined /> },
  { key: '/register', label: 'Register', icon: <FormOutlined /> },
  { key: '/registration-help', label: 'Registration Help', icon: <QuestionCircleOutlined /> },
  { key: '/announcements', label: 'Announcements', icon: <SoundOutlined /> },
  { key: '/schedules', label: 'Schedules', icon: <CalendarOutlined /> },
  // Place Audit Logs last in the sidebar
  { key: '/admin/audit', label: 'Audit Logs', icon: <AuditOutlined /> },
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
  '/admin/dashboard',
  '/admin/seasons',
  '/admin/sports',
  '/admin/program-templates',
  '/admin/audit',
  '/admin/programs',
  '/admin/teams',
  '/admin/people',
  '/admin/settings',
  '/admin/payment-plans',
]);

export const selectMenuItems = createSelector([selectRole], (role) => {
  const isAdmin = role === 'admin' || role === 'owner';

  const userItems = navItems
    .filter((i) => USER_KEYS.has(i.key))
    .map((item) => ({ key: item.key, icon: item.icon, label: item.label }));

  const adminCore = navItems
    .filter((i) => ADMIN_KEYS.has(i.key))
    .map((item) => ({ key: item.key, icon: item.icon, label: item.label }));

  return [
    ...userItems,
    ...(isAdmin ? [{ key: 'divider', type: 'divider' } as any, ...adminCore] : []),
  ];
});
