import type { ThemeConfig } from 'antd';

export const antdTheme: ThemeConfig = {
  token: {
    // Primary colors matching Dashboard/Teams pages
    colorPrimary: '#00d4ff',
    colorPrimaryHover: '#33ddff',
    colorPrimaryActive: '#0099cc',
    
    // Background colors
    colorBgBase: '#0f0f0f',
    colorBgContainer: '#1a1a1a',
    colorBgElevated: '#1a1a1a',
    colorBgLayout: '#0f0f0f',
    colorBgSpotlight: '#262626',
    
    // Text colors
    colorText: '#ffffff',
    colorTextSecondary: '#b0b0b0',
    colorTextTertiary: '#8c8c8c',
    colorTextQuaternary: '#595959',
    
    // Border colors
    colorBorder: '#333333',
    colorBorderSecondary: '#262626',
    
    // Success, warning, error colors
    colorSuccess: '#22c55e',
    colorWarning: '#f59e0b',
    colorError: '#ef4444',
    colorInfo: '#00d4ff',
    
    // Border radius
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    
    // Font settings
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontFamily: 'system-ui, Avenir, Helvetica, Arial, sans-serif',
    
    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 8,
    paddingXS: 4,
    
    // Box shadow
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
    boxShadowSecondary: '0 1px 4px rgba(0, 0, 0, 0.12)',
  },
  components: {
    // Layout
    Layout: {
      bodyBg: '#0f0f0f',
      headerBg: '#1a1a1a',
      siderBg: '#1a1a1a',
      footerBg: '#1a1a1a',
    },
    
    // Menu (for sidebar)
    Menu: {
      darkItemBg: '#1a1a1a',
      darkItemSelectedBg: 'rgba(0, 212, 255, 0.1)',
      darkItemHoverBg: 'rgba(0, 212, 255, 0.05)',
      darkItemColor: '#b0b0b0',
      darkItemSelectedColor: '#00d4ff',
      darkItemHoverColor: '#00d4ff',
      darkSubMenuItemBg: '#1a1a1a',
      itemBorderRadius: 8,
    },
    
    // Card
    Card: {
      colorBgContainer: '#1a1a1a',
      colorBorderSecondary: '#333333',
      headerBg: '#1a1a1a',
    },
    
    // Table
    Table: {
      colorBgContainer: '#1a1a1a',
      headerBg: 'rgba(0, 212, 255, 0.05)',
      headerColor: '#00d4ff',
      rowHoverBg: 'rgba(0, 212, 255, 0.03)',
      borderColor: '#333333',
    },
    
    // Button
    Button: {
      colorPrimary: '#00d4ff',
      colorPrimaryHover: '#33ddff',
      colorPrimaryActive: '#0099cc',
      primaryShadow: '0 0 20px rgba(0, 212, 255, 0.15)',
    },
    
    // Input
    Input: {
      colorBgContainer: '#1a1a1a',
      colorBorder: '#333333',
      colorText: '#ffffff',
      colorTextPlaceholder: '#b0b0b0',
      activeBorderColor: '#00d4ff',
      hoverBorderColor: '#00d4ff',
    },
    
    // Select
    Select: {
      colorBgContainer: '#1a1a1a',
      colorBorder: '#333333',
      colorText: '#ffffff',
      colorTextPlaceholder: '#b0b0b0',
      optionSelectedBg: 'rgba(0, 212, 255, 0.1)',
    },
    
    // Switch
    Switch: {
      colorPrimary: '#00d4ff',
      colorPrimaryHover: '#33ddff',
    },
    
    // Badge
    Badge: {
      colorBgContainer: '#1a1a1a',
    },
    
    // Statistic
    Statistic: {
      colorText: '#ffffff',
      colorTextDescription: '#b0b0b0',
      titleFontSize: 14,
      contentFontSize: 28,
    },
    
    // Typography
    Typography: {
      colorText: '#ffffff',
      colorTextSecondary: '#b0b0b0',
      colorTextTertiary: '#8c8c8c',
    },
    
    // Message
    Message: {
      colorBgElevated: '#1a1a1a',
      colorText: '#ffffff',
    },
    
    // Modal
    Modal: {
      colorBgElevated: '#1a1a1a',
      headerBg: '#1a1a1a',
      contentBg: '#1a1a1a',
      footerBg: '#1a1a1a',
    },
    
    // Dropdown
    Dropdown: {
      colorBgElevated: '#1a1a1a',
      colorBorder: '#333333',
    },
    
    // Pagination
    Pagination: {
      colorBgContainer: '#1a1a1a',
      colorBorder: '#333333',
      colorPrimary: '#00d4ff',
    },
  },
  algorithm: undefined, // Don't use built-in dark algorithm, use custom tokens
};