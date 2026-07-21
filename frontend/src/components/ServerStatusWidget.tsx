import { useState, useEffect } from 'react';
import { Card, Badge, Typography } from 'antd';
import { getHealth } from '../lib/api';

const { Text } = Typography;

type ServerStatus = 'checking' | 'online' | 'offline';

export default function ServerStatusWidget() {
  const [status, setStatus] = useState<ServerStatus>('checking');
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      if (mounted) setStatus('checking');
      const start = performance.now();
      try {
        await getHealth({
          signal: AbortSignal.timeout(5000),
        });
        const end = performance.now();
        if (mounted) {
          setStatus('online');
          setLastLatency(Math.round(end - start));
        }
      } catch {
        if (mounted) setStatus('offline');
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const badgeStatus =
    status === 'online' ? 'success' : status === 'offline' ? 'error' : 'processing';

  const title =
    status === 'online'
      ? 'All Systems Go'
      : status === 'offline'
        ? 'Connection Lost'
        : 'Waking up...';

  const subtitle =
    status === 'online' && lastLatency !== null
      ? `Latency: ${lastLatency}ms`
      : status === 'offline'
        ? 'Will retry in 60s'
        : 'Pinging server...';

  const borderColor =
    status === 'online'
      ? 'rgba(72, 187, 120, 0.2)'
      : status === 'offline'
        ? 'rgba(255, 90, 95, 0.3)'
        : '#FFEDD5';

  return (
    <div style={{ padding: '0 16px 24px', marginTop: 'auto' }}>
      <Card
        size="small"
        style={{
          borderRadius: 24,
          border: `2px solid ${borderColor}`,
          background: status === 'offline' ? '#FFE6E7' : '#FFFFFF',
          overflow: 'hidden',
        }}
        styles={{ body: { padding: '16px' } }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Badge status={badgeStatus} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <Text
              strong
              style={{
                display: 'block',
                fontSize: 13,
                color: status === 'offline' ? '#FF5A5F' : '#2D3748',
                fontFamily: "'Outfit', sans-serif",
              }}
            >
              {title}
            </Text>
            <Text
              type="secondary"
              style={{
                fontSize: 12,
                display: 'block',
                marginTop: 2,
              }}
            >
              {subtitle}
            </Text>
          </div>
        </div>
      </Card>
    </div>
  );
}
