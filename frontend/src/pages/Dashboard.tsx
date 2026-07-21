import { useEffect, useState } from 'react';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
  FireOutlined,
} from '@ant-design/icons';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Alert, Card, Flex, Spin, Typography } from 'antd';
import StatsCard from '../components/StatsCard';
import StatusBadge from '../components/StatusBadge';
import DataTable from '../components/DataTable';
import { getDashboardStats, getPosts } from '../lib/api';
import type { DashboardStats, Post } from '../types';

const { Title, Text } = Typography;

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
      <Flex justify="center" align="center" style={{ minHeight: 256 }}>
        <Spin size="large" tip="Gathering data..." />
      </Flex>
    );
  }

  if (error || !stats) {
    return (
      <Alert
        type="error"
        message={error ?? 'Failed to load dashboard data'}
        showIcon
      />
    );
  }

  const engagementData = Object.entries(stats.engagementByType).map(
    ([type, value]) => ({ type, value }),
  );

  return (
    <Flex vertical gap={40}>
      <Flex justify="space-between" align="flex-end">
        <div>
          <Title level={2} className="!mb-1 !font-display !font-extrabold">
            Overview
          </Title>
          <Text type="secondary" className="!text-lg">
            Here's what's happening with your content today.
          </Text>
        </div>
      </Flex>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6">
        <StatsCard
          label="Total Posts"
          value={stats.totalPosts}
          icon={<FileTextOutlined style={{ fontSize: 28 }} />}
          color="text-brand-info bg-brand-info-subtle"
        />
        <StatsCard
          label="Posted"
          value={stats.postsByStatus.posted ?? 0}
          icon={<CheckCircleOutlined style={{ fontSize: 28 }} />}
          color="text-brand-success bg-brand-success-subtle"
        />
        <StatsCard
          label="Scheduled"
          value={stats.postsByStatus.scheduled ?? 0}
          icon={<ClockCircleOutlined style={{ fontSize: 28 }} />}
          color="text-brand-warning bg-brand-warning-subtle"
        />
        <StatsCard
          label="Failed"
          value={stats.postsByStatus.failed ?? 0}
          icon={<WarningOutlined style={{ fontSize: 28 }} />}
          color="text-accent bg-accent-subtle"
        />
        <StatsCard
          label="Engagement"
          value={stats.totalEngagement.toLocaleString()}
          icon={<FireOutlined style={{ fontSize: 28 }} />}
          color="text-brand-warning bg-brand-warning-subtle"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Engagement chart */}
        {engagementData.length > 0 && (
          <Card
            className="xl:col-span-2"
            title={
              <Title level={4} className="!mb-0 !font-display">
                Engagement Breakdown
              </Title>
            }
          >
            <div style={{ height: 288 }}>
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
          </Card>
        )}

        {/* Recent posts */}
        <Card
          className="xl:col-span-1"
          title={
            <Title level={4} className="!mb-0 !font-display">
              Recent Activity
            </Title>
          }
        >
          <DataTable<Post>
            columns={[
              {
                key: 'content',
                header: 'Content',
                render: (post: Post) => (
                  <Text strong className="!block !max-w-[180px] !truncate">
                    {post.content ?? '\u2014'}
                  </Text>
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
        </Card>
      </div>
    </Flex>
  );
}
