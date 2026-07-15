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
        <p className="animate-pulse text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center text-red-600">
        {error ?? 'Failed to load dashboard data'}
      </div>
    );
  }

  const engagementData = Object.entries(stats.engagementByType).map(
    ([type, value]) => ({ type, value }),
  );

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatsCard
          label="Total Posts"
          value={stats.totalPosts}
          icon={<DocumentTextIcon className="w-8 h-8" />}
          color="text-blue-600"
        />
        <StatsCard
          label="Posted"
          value={stats.postsByStatus.posted ?? 0}
          icon={<CheckCircleIcon className="w-8 h-8" />}
          color="text-green-600"
        />
        <StatsCard
          label="Scheduled"
          value={stats.postsByStatus.scheduled ?? 0}
          icon={<ClockIcon className="w-8 h-8" />}
          color="text-yellow-600"
        />
        <StatsCard
          label="Failed"
          value={stats.postsByStatus.failed ?? 0}
          icon={<ExclamationTriangleIcon className="w-8 h-8" />}
          color="text-red-600"
        />
        <StatsCard
          label="Total Engagement"
          value={stats.totalEngagement.toLocaleString()}
          icon={<FireIcon className="w-8 h-8" />}
          color="text-orange-600"
        />
      </div>

      {/* Engagement chart */}
      {engagementData.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Engagement by Type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={engagementData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="type" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Recent posts */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Posts</h3>
        <DataTable
          columns={[
            {
              key: 'id',
              header: 'ID',
              render: (post: Post) => String(post.id),
            },
            {
              key: 'content',
              header: 'Content',
              render: (post: Post) => (
                <span className="block max-w-xs truncate">
                  {post.content ?? '\u2014'}
                </span>
              ),
            },
            {
              key: 'platform',
              header: 'Platform',
              render: (post: Post) => (
                <span className="capitalize">{post.platform}</span>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (post: Post) => <StatusBadge status={post.status} />,
            },
            {
              key: 'createdAt',
              header: 'Created',
              render: (post: Post) =>
                new Date(post.createdAt).toLocaleDateString(),
            },
          ]}
          data={recentPosts}
          keyExtractor={(post) => String(post.id)}
          emptyMessage="No posts yet"
        />
      </div>
    </div>
  );
}
