import { useEffect, useState } from 'react';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { getDashboardStats, getPosts } from '../lib/api';
import type { DashboardStats, Post } from '../types';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [statsData, postsData] = await Promise.all([
          getDashboardStats(),
          getPosts(),
        ]);
        setStats(statsData);
        setRecentPosts(
          postsData
            .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
            .slice(0, 10),
        );
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-accent-subtle border-t-accent rounded-full animate-spin" />
          <p className="text-ink-2 font-medium animate-pulse">Gathering data...</p>
        </div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-accent-subtle rounded-3xl border border-accent/20 p-8 text-center text-accent font-medium shadow-sm">
        {error ?? 'Failed to load dashboard data'}
      </div>
    );
  }

  const engagementData = Object.entries(stats.engagementByType).map(
    ([type, value]) => ({ type, value }),
  );

  return (
    <div className="space-y-10">
      <header className="flex justify-between items-end">
        <div>
          <h2 className="text-4xl font-extrabold font-display text-ink-1 mb-2">Overview</h2>
          <p className="text-ink-2 text-lg">Here's what's happening with your content today.</p>
        </div>
      </header>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
        <StatsCard
          label="Total Posts"
          value={stats.totalPosts}
          icon={<DocumentTextIcon className="w-7 h-7" />}
          color="text-brand-info bg-brand-info-subtle"
        />
        <StatsCard
          label="Posted"
          value={stats.postsByStatus.posted ?? 0}
          icon={<CheckCircleIcon className="w-7 h-7" />}
          color="text-brand-success bg-brand-success-subtle"
        />
        <StatsCard
          label="Scheduled"
          value={stats.postsByStatus.scheduled ?? 0}
          icon={<ClockIcon className="w-7 h-7" />}
          color="text-brand-warning bg-brand-warning-subtle"
        />
        <StatsCard
          label="Failed"
          value={stats.postsByStatus.failed ?? 0}
          icon={<ExclamationTriangleIcon className="w-7 h-7" />}
          color="text-accent bg-accent-subtle"
        />
        <StatsCard
          label="Engagement"
          value={stats.totalEngagement.toLocaleString()}
          icon={<FireIcon className="w-7 h-7" />}
          color="text-brand-warning bg-brand-warning-subtle"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Engagement chart */}
        {engagementData.length > 0 && (
          <div className="xl:col-span-2 bg-paper-2 rounded-[2rem] border border-border p-8 shadow-sm">
            <h3 className="text-xl font-bold font-display text-ink-1 mb-6">Engagement Breakdown</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={engagementData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                  <XAxis dataKey="type" axisLine={false} tickLine={false} tick={{ fill: 'var(--color-ink-3)', fontSize: 13, fontWeight: 600 }} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--color-ink-3)', fontSize: 13, fontWeight: 600 }} />
                  <Tooltip
                    cursor={{ fill: 'var(--color-paper-1)' }}
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', color: 'var(--color-ink-1)' }}
                  />
                  <Bar dataKey="value" fill="var(--color-accent)" radius={[8, 8, 0, 0]} maxBarSize={60} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Recent posts */}
        <div className="xl:col-span-1 bg-paper-2 rounded-[2rem] border border-border p-8 shadow-sm flex flex-col">
          <h3 className="text-xl font-bold font-display text-ink-1 mb-6">Recent Activity</h3>
          <div className="flex-1">
            <DataTable
              columns={[
                {
                  key: 'content',
                  header: 'Content',
                  render: (post: Post) => (
                    <span className="block max-w-[180px] truncate text-ink-1 font-medium">
                      {post.content ?? '\u2014'}
                    </span>
                  ),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (post: Post) => <StatusBadge status={post.status} />,
                },
              ]}
              data={recentPosts.slice(0, 5)}
              keyExtractor={(post) => String(post.id)}
              emptyMessage="No posts yet"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
