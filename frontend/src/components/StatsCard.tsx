import { Card, Statistic } from 'antd';
import type { ReactNode } from 'react';

interface StatsCardProps {
  label: string;
  value: string | number;
  icon: ReactNode;
  color?: string;
}

export default function StatsCard({ label, value, icon, color = 'accent' }: StatsCardProps) {
  // Parse the color prop - it was a tailwind class string, but for antd we use theme tokens
  // Map common patterns to antd-compatible colors
  const getColors = () => {
    if (color.includes('accent') || color.includes('FF5A5F')) {
      return { bg: '#FFE6E7', fg: '#FF5A5F' };
    }
    if (color.includes('success') || color.includes('48BB78')) {
      return { bg: '#C6F6D5', fg: '#48BB78' };
    }
    if (color.includes('info') || color.includes('4299E1')) {
      return { bg: '#BEE3F8', fg: '#4299E1' };
    }
    if (color.includes('warning') || color.includes('ECC94B')) {
      return { bg: '#FEFCBF', fg: '#ECC94B' };
    }
    return { bg: '#FFE6E7', fg: '#FF5A5F' };
  };

  const { bg, fg } = getColors();

  return (
    <Card
      style={{
        borderRadius: 24,
        border: '1px solid #FFEDD5',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.06)',
      }}
      styles={{ body: { padding: 20 } }}
      hoverable
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <div
          style={{
            flexShrink: 0,
            padding: 16,
            borderRadius: 20,
            background: bg,
            color: fg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 24,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <Statistic
            title={label}
            value={value}
            valueStyle={{
              fontFamily: "'Outfit', sans-serif",
              fontWeight: 800,
              fontSize: 30,
              color: '#2D3748',
              marginTop: 4,
            }}
            style={{
              marginBottom: 0,
            }}
          />
        </div>
      </div>
    </Card>
  );
}
