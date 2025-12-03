import type { ThemeConfig } from 'antd';
import { theme } from 'antd';

const { darkAlgorithm, defaultAlgorithm } = theme;

// Base theme configuration shared between dark and light themes
const baseTheme: ThemeConfig = {
  token: {
    // Primary brand color
    colorPrimary: '#1890ff',
    
    // Border radius
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    
    // Font settings
    fontSize: 14,
    fontSizeLG: 16,
    fontSizeSM: 12,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    
    // Spacing
    padding: 16,
    paddingLG: 24,
    paddingSM: 8,
    paddingXS: 4,
    
    // Motion
    motionDurationSlow: '0.3s',
    motionDurationMid: '0.2s',
    motionDurationFast: '0.1s',
  },
  components: {
    // Layout
    Layout: {
      headerHeight: 64,
    },
    
    // Menu
    Menu: {
      itemBorderRadius: 8,
      itemMarginBlock: 4,
      itemMarginInline: 16,
    },
    
    // Card
    Card: {
      headerBg: 'transparent',
    },
    
    // Button
    Button: {
      borderRadius: 8,
    },
    
    // Input
    Input: {
      borderRadius: 8,
    },
    
    // Table
    Table: {
      borderRadius: 8,
    },
  },
};

// Dark theme configuration
export const darkTheme: ThemeConfig = {
  ...baseTheme,
  algorithm: darkAlgorithm,
  token: {
    ...baseTheme.token,
    colorPrimary: '#1890ff',
  },
};

// Light theme configuration
export const lightTheme: ThemeConfig = {
  ...baseTheme,
  algorithm: defaultAlgorithm,
  token: {
    ...baseTheme.token,
    colorPrimary: '#1890ff',
  },
};