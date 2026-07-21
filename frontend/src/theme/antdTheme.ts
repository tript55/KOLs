import type { ThemeConfig } from 'antd';

/**
 * Warm/playful Ant Design theme that maps the existing design tokens
 * (from index.css @theme) into AntD v6 token system.
 */
export const theme: ThemeConfig = {
  token: {
    // Brand colors from Tailwind @theme
    colorPrimary: '#FF5A5F',
    colorPrimaryHover: '#E34A4F',
    colorPrimaryBg: '#FFE6E7',
    colorPrimaryBorder: '#FFB3B5',

    // Backgrounds
    colorBgLayout: '#FFF7EB',
    colorBgContainer: '#FFFFFF',
    colorBgElevated: '#FFFFFF',

    // Text hierarchy
    colorText: '#2D3748',
    colorTextSecondary: '#4A5568',
    colorTextTertiary: '#A0AEC0',
    colorTextQuaternary: '#CBD5E0',

    // Borders
    colorBorder: '#FFEDD5',
    colorBorderSecondary: '#FFE4CC',

    // Semantic colors
    colorSuccess: '#48BB78',
    colorSuccessBg: '#C6F6D5',
    colorWarning: '#ECC94B',
    colorWarningBg: '#FEFCBF',
    colorInfo: '#4299E1',
    colorInfoBg: '#BEE3F8',
    colorError: '#FF5A5F',
    colorErrorBg: '#FFE6E7',

    // Typography
    fontFamily: "'Quicksand', 'sans-serif'",
    fontFamilyCode: "'JetBrains Mono', monospace",
    fontSize: 14,
    fontSizeHeading1: 30,
    fontSizeHeading2: 24,
    fontSizeHeading3: 20,
    fontSizeHeading4: 16,
    fontSizeHeading5: 14,

    // Shape
    borderRadius: 16,
    borderRadiusLG: 24,
    borderRadiusSM: 8,
    borderRadiusXS: 4,

    // Shadows
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.06), 0 1px 2px -1px rgba(0, 0, 0, 0.04)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)',

    // Motion
    motionDurationMid: '0.25s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      siderBg: '#FFFFFF',
      bodyBg: '#FFF7EB',
    },
    Menu: {
      itemBg: 'transparent',
      itemColor: '#4A5568',
      itemHoverBg: '#FFE6E7',
      itemHoverColor: '#FF5A5F',
      itemSelectedBg: '#FF5A5F',
      itemSelectedColor: '#FFFFFF',
      itemBorderRadius: 16,
      itemMarginInline: 12,
      itemPaddingInline: 20,
      iconSize: 20,
      fontSize: 15,
    },
    Card: {
      borderRadiusLG: 24,
      colorBorder: '#FFEDD5',
    },
    Table: {
      borderRadius: 24,
      headerBg: '#FFF7EB',
      headerColor: '#4A5568',
      headerSplitColor: 'transparent',
      rowHoverBg: '#FFF7EB',
      borderColor: '#FFEDD5',
      cellPaddingBlock: 16,
      cellPaddingInline: 24,
      headerBorderRadius: 24,
    },
    Tag: {
      borderRadiusSM: 100,
      defaultBg: '#FFF7EB',
    },
    Modal: {
      borderRadiusLG: 24,
      titleFontSize: 18,
    },
    Button: {
      borderRadius: 12,
      primaryShadow: '0 2px 8px rgba(255, 90, 95, 0.25)',
    },
    Statistic: {
      titleFontSize: 12,
      contentFontSize: 30,
    },
    Badge: {
      dotSize: 10,
    },
    Spin: {
      colorPrimary: '#FF5A5F',
    },
  },
};
