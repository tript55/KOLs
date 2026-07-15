import { useCallback, useEffect, useState } from 'react';
import {
  PlayIcon,
  StopIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { getSchedulerStatus, startScheduler, stopScheduler } from '../lib/api';
import type { SchedulerStatus } from '../types';

export default function Scheduler() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'start' | 'stop' | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  const load = useCallback(async () => {
    try {
      const data = await getSchedulerStatus();
      setStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load scheduler status');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!status?.nextRunEstimate || !status.isRunning) {
      setCountdown('');
      return;
    }

    function updateCountdown() {
      const now = Date.now();
      const next = new Date(status!.nextRunEstimate!).getTime();
      const diff = next - now;

      if (diff <= 0) {
        setCountdown('0s');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const parts = [];
      if (days > 0) parts.push(`${days}d`);
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setCountdown(parts.join(' '));
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [status?.nextRunEstimate, status?.isRunning]);

  async function handleStart() {
    setActionLoading('start');
    try {
      const newStatus = await startScheduler();
      setStatus(newStatus);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scheduler');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStop() {
    setActionLoading('stop');
    try {
      const newStatus = await stopScheduler();
      setStatus(newStatus);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop scheduler');
    } finally {
      setActionLoading(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="animate-pulse text-gray-500">Loading scheduler status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Scheduler</h2>

      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {status && (
        <>
          {/* Status indicator */}
          {status.isRunning ? (
            <div className="bg-green-50 rounded-xl border border-green-200 p-8 text-center">
              <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto" />
              <p className="text-2xl font-bold text-green-700 mt-4">Running</p>
            </div>
          ) : (
            <div className="bg-red-50 rounded-xl border border-red-200 p-8 text-center">
              <XCircleIcon className="w-16 h-16 text-red-500 mx-auto" />
              <p className="text-2xl font-bold text-red-700 mt-4">Stopped</p>
            </div>
          )}

          {/* Details card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-500">Cron Expression</p>
                <p className="text-lg font-semibold text-gray-900 font-mono">
                  {status.cronExpression}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Run</p>
                <p className="text-lg font-semibold text-gray-900">
                  {status.nextRunEstimate
                    ? new Date(status.nextRunEstimate).toLocaleString()
                    : 'N/A'}
                </p>
                {countdown && (
                  <p className="text-sm font-mono text-blue-600 mt-1">
                    in {countdown}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="text-lg font-semibold text-gray-900">
                  {status.isRunning ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                      <ClockIcon className="w-4 h-4" />
                      Running
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                      <ClockIcon className="w-4 h-4" />
                      Stopped
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Control buttons */}
          <div className="flex gap-4 justify-center pt-4">
            <button
              type="button"
              onClick={handleStart}
              disabled={status.isRunning || actionLoading !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <PlayIcon className="w-5 h-5" />
              {actionLoading === 'start' ? 'Starting...' : 'Start'}
            </button>
            <button
              type="button"
              onClick={handleStop}
              disabled={!status.isRunning || actionLoading !== null}
              className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <StopIcon className="w-5 h-5" />
              {actionLoading === 'stop' ? 'Stopping...' : 'Stop'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
