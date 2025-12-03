import type { ThemeConfig } from 'antd';

export const lightTheme: ThemeConfig = {
  token: {
    // Primary colors
    colorPrimary: '#0099cc',
    colorPrimaryHover: '#007aa3',
    colorPrimaryActive: '#005580',
    
    // Background colors
    colorBgBase: '#ffffff',
    colorBgContainer: '#f8f9fa',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f5f5',
    colorBgSpotlight: '#e9ecef',
    
    // Text colors
    colorText: '#212529',
    colorTextSecondary: '#6c757d',
    colorTextTertiary: '#adb5bd',
    colorTextQuaternary: '#ced4da',
    
    // Border colors
    colorBorder: '#dee2e6',
    colorBorderSecondary: '#e9ecef',
    
    // Success, warning, error colors
    colorSuccess: '#198754',
    colorWarning: '#fd7e14',
    colorError: '#dc3545',
    colorInfo: '#0099cc',
    
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
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    boxShadowSecondary: '0 1px 4px rgba(0, 0, 0, 0.08)',
  },
  components: {
    // Layout
    Layout: {
      bodyBg: '#f5f5f5',
      headerBg: '#ffffff',
      siderBg: '#ffffff',
      footerBg: '#ffffff',
    },
    
    // Menu
    Menu: {
      itemBg: '#ffffff',
      itemSelectedBg: 'rgba(0, 153, 204, 0.1)',
      itemHoverBg: 'rgba(0, 153, 204, 0.05)',
      itemColor: '#6c757d',
      itemSelectedColor: '#0099cc',
      itemHoverColor: '#0099cc',
      subMenuItemBg: '#ffffff',
      itemBorderRadius: 8,
    },
    
    // Card
    Card: {
      colorBgContainer: '#ffffff',
      colorBorderSecondary: '#dee2e6',
      headerBg: '#ffffff',
    },
    
    // Table
    Table: {
      colorBgContainer: '#ffffff',
      headerBg: 'rgba(0, 153, 204, 0.05)',
      headerColor: '#0099cc',
      rowHoverBg: 'rgba(0, 153, 204, 0.03)',
      borderColor: '#dee2e6',
    },
    
    // Button
    Button: {
      colorPrimary: '#0099cc',
      colorPrimaryHover: '#007aa3',
      colorPrimaryActive: '#005580',
      primaryShadow: '0 0 20px rgba(0, 153, 204, 0.15)',
    },
    
    // Input
    Input: {
      colorBgContainer: '#ffffff',
      colorBorder: '#dee2e6',
      colorText: '#212529',
      colorTextPlaceholder: '#6c757d',
    },
    
    // Select
    Select: {
      colorBgContainer: '#ffffff',
      colorBorder: '#dee2e6',
      colorText: '#212529',
      colorTextPlaceholder: '#6c757d',
      optionSelectedBg: 'rgba(0, 153, 204, 0.1)',
    },
    
    // Switch
    Switch: {
      colorPrimary: '#0099cc',
      colorPrimaryHover: '#007aa3',
    },
    
    // Badge
    Badge: {
      colorBgContainer: '#ffffff',
    },
    
    // Statistic
    Statistic: {
      colorText: '#212529',
      colorTextDescription: '#6c757d',
      titleFontSize: 14,
      contentFontSize: 28,
    },
    
    // Typography
    Typography: {
      colorText: '#212529',
      colorTextSecondary: '#6c757d',
      colorTextTertiary: '#adb5bd',
    },
    
    // Message
    Message: {
      colorBgElevated: '#ffffff',
      colorText: '#212529',
    },
    
    // Modal
    Modal: {
      colorBgElevated: '#ffffff',
      headerBg: '#ffffff',
      contentBg: '#ffffff',
      footerBg: '#ffffff',
    },
    
    // Dropdown
    Dropdown: {
      colorBgElevated: '#ffffff',
      colorBorder: '#dee2e6',
    },
    
    // Pagination
    Pagination: {
      colorBgContainer: '#ffffff',
      colorBorder: '#dee2e6',
      colorPrimary: '#0099cc',
    },
  },
  algorithm: undefined,
};