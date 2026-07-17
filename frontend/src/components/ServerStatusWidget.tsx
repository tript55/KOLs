import { useState, useEffect } from 'react';
import { getHealth } from '../lib/api';

export default function ServerStatusWidget() {
  const [status, setStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const [lastLatency, setLastLatency] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkHealth = async () => {
      if (mounted) setStatus('checking');
      const start = performance.now();
      try {
        await getHealth({
          // Use a short timeout to quickly detect offline
          signal: AbortSignal.timeout(5000)
        });
        const end = performance.now();
        if (mounted) {
          setStatus('online');
          setLastLatency(Math.round(end - start));
        }
      } catch (err) {
        if (mounted) setStatus('offline');
      }
    };

    // Initial check
    checkHealth();

    // Poll every 60 seconds
    const interval = setInterval(checkHealth, 60000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="mt-auto px-4 lg:px-6 pb-6">
      <div 
        className={`group relative flex items-center gap-3 p-4 rounded-3xl transition-all duration-500 overflow-hidden border-2 ${
          status === 'online' 
            ? 'bg-paper-2 border-brand-success/20 hover:border-brand-success/40 hover:shadow-[0_8px_30px_-12px_rgba(72,187,120,0.4)]' 
            : status === 'offline'
            ? 'bg-accent-subtle border-accent hover:border-accent hover:shadow-[0_8px_30px_-12px_rgba(255,90,95,0.4)]'
            : 'bg-paper-1 border-border'
        }`}
      >
        {/* Animated Background Blob */}
        {status === 'online' && (
          <div className="absolute inset-0 opacity-10 bg-gradient-to-r from-brand-success to-brand-success-subtle blur-xl rounded-full mix-blend-multiply animate-pulse" />
        )}
        
        {/* Playful Status Orb */}
        <div className="relative shrink-0 flex items-center justify-center w-10 h-10">
          {/* Base Orb */}
          <div 
            className={`absolute inset-0 rounded-full transition-all duration-700 ease-bounce ${
              status === 'online' ? 'bg-brand-success scale-100' :
              status === 'offline' ? 'bg-accent scale-100' :
              'bg-ink-3 scale-75 animate-pulse'
            }`}
          />
          
          {/* Inner Highlight for Toy-like 3D effect */}
          <div className="absolute top-1 right-1 w-3 h-3 bg-white/40 rounded-full blur-[1px]" />
          
          {/* Breathing Ring for Online */}
          {status === 'online' && (
            <div className="absolute inset-0 rounded-full border-2 border-brand-success animate-ping opacity-20" style={{ animationDuration: '3s' }} />
          )}

          {/* Offline Zzz / X */}
          {status === 'offline' && (
            <div className="absolute inset-0 flex items-center justify-center text-white font-display text-sm font-bold rotate-12">
              !
            </div>
          )}
        </div>

        {/* Status Text & Latency */}
        <div className="flex-1 min-w-0 z-10">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className={`font-display font-bold text-sm truncate transition-colors ${
              status === 'offline' ? 'text-accent' : 'text-ink-1'
            }`}>
              {status === 'online' ? 'All Systems Go' : 
               status === 'offline' ? 'Connection Lost' : 
               'Waking up...'}
            </h4>
          </div>
          
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="flex h-1.5 w-1.5 rounded-full bg-current opacity-40"></span>
            <p className="font-body font-semibold text-xs text-ink-3 truncate transition-all group-hover:text-ink-2">
              {status === 'online' && lastLatency !== null 
                ? `Latency: ${lastLatency}ms` 
                : status === 'offline'
                ? 'Will retry in 60s'
                : 'Pinging server...'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
