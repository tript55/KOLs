import type { ThemeConfig } from 'antd';

const antdTheme: ThemeConfig = {
  token: {
    // Seed tokens
    colorPrimary: '#FF5A5F',
    colorBgLayout: '#FFF7EB',
    colorBgContainer: '#FFFFFF',
    borderRadius: 16,
    fontFamily: 'Quicksand, system-ui, sans-serif',

    // Text colors
    colorText: '#1a1a2e',
    colorTextSecondary: '#4a4a6a',

    // Borders
    colorBorder: '#FFEDD5',

    // Semantic / alias tokens
    colorSuccess: '#10b981',
    colorWarning: '#f59e0b',
    colorInfo: '#3b82f6',
    colorError: '#ef4444',
  },

  cssVar: { key: 'app' },
};

export default antdTheme;
