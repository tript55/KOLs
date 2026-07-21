import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  ThunderboltOutlined,
  RocketOutlined,
  FireOutlined,
  CalendarOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  Card,
  DatePicker,
  Flex,
  Form,
  Input,
  Select,
  Space,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import StatsCard from '../components/StatsCard';
import {
  createFacebookWorkflow,
  getFacebookWorkflowStatus,
  getPersonas,
  getPosts,
  getTemplates,
  runPostWorkflow,
  startScheduler,
  stopScheduler,
} from '../lib/api';
import type {
  Persona,
  Platform,
  Post,
  PostStatus,
  SchedulerStatus,
  Template,
  WorkflowStatus,
} from '../types';

const { Title, Text } = Typography;

const FACEBOOK_PLATFORM: Platform = 'facebook';
const QUICK_SLOT_PRESETS = [
  { label: 'Morning Pulse', value: '07:15' },
  { label: 'Lunch Explainer', value: '12:15' },
  { label: 'Evening Recap', value: '20:30' },
] as const;

const statusTagColor: Record<PostStatus, string> = {
  draft: 'default',
  scheduled: 'gold',
  generating: 'processing',
  posted: 'success',
  failed: 'error',
};

function createPresetDate(timeValue: string): dayjs.Dayjs {
  const [hours, minutes] = timeValue.split(':').map(Number);
  const candidate = new Date();
  candidate.setSeconds(0, 0);
  candidate.setHours(hours!, minutes!, 0, 0);

  if (candidate.getTime() <= Date.now()) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return dayjs(candidate);
}

export default function Scheduler() {
  const [workflow, setWorkflow] = useState<WorkflowStatus | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<'start' | 'stop' | 'schedule' | null>(null);
  const [rowActionId, setRowActionId] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string>('');

  const [formPersonaId, setFormPersonaId] = useState('');
  const [formTemplateId, setFormTemplateId] = useState('');
  const [formScheduledAt, setFormScheduledAt] = useState<dayjs.Dayjs>(createPresetDate('07:15'));
  const [formAudienceSegment, setFormAudienceSegment] = useState('vietnamese-investor');
  const [formStrategyKey, setFormStrategyKey] = useState('market_update');
  const [formTargetSlotLabel, setFormTargetSlotLabel] = useState('Morning Pulse');

  const load = useCallback(async (background = false) => {
    if (background) {
      setRefreshing(true);
    }

    try {
      const [workflowData, postsData, personasData, templatesData] =
        await Promise.all([
          getFacebookWorkflowStatus(),
          getPosts(),
          getPersonas(),
          getTemplates(),
        ]);
      setWorkflow(workflowData);
      setPosts(postsData.filter((post) => post.platform === FACEBOOK_PLATFORM));
      setPersonas(
        personasData.filter((persona) =>
          persona.targetPlatforms.includes(FACEBOOK_PLATFORM),
        ),
      );
      setTemplates(
        templatesData.filter(
          (template) => template.platform === FACEBOOK_PLATFORM,
        ),
      );
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to load workflow operations',
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const interval = setInterval(() => {
      void load(true);
    }, 30_000);

    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const schedulerStatus = workflow?.scheduler;
    const nextRunEstimate = schedulerStatus?.nextRunEstimate;

    if (!schedulerStatus?.isRunning || !nextRunEstimate) {
      setCountdown('');
      return;
    }

    const nextRunAt = nextRunEstimate;

    function updateCountdown() {
      const diff = new Date(nextRunAt).getTime() - Date.now();

      if (diff <= 0) {
        setCountdown('0s');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const parts: string[] = [];

      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setCountdown(parts.join(' '));
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [workflow?.scheduler]);

  const queuePosts = useMemo(
    () =>
      posts
        .filter((post) =>
          ['draft', 'scheduled', 'generating', 'failed'].includes(post.status),
        )
        .sort((a, b) => {
          const left = a.scheduledAt ? new Date(a.scheduledAt).getTime() : 0;
          const right = b.scheduledAt ? new Date(b.scheduledAt).getTime() : 0;
          return left - right;
        }),
    [posts],
  );

  const nextPost = useMemo(
    () =>
      queuePosts.find(
        (post) =>
          post.scheduledAt &&
          new Date(post.scheduledAt).getTime() >= Date.now(),
      ) ?? null,
    [queuePosts],
  );

  const schedulerStatus: SchedulerStatus | null = workflow?.scheduler ?? null;

  async function handleStart() {
    setActionLoading('start');
    try {
      await startScheduler();
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start scheduler');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStop() {
    setActionLoading('stop');
    try {
      await stopScheduler();
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop scheduler');
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSchedule() {
    if (!formPersonaId) {
      setError('Select a persona before scheduling');
      return;
    }

    setActionLoading('schedule');
    try {
      await createFacebookWorkflow({
        personaId: Number(formPersonaId),
        templateId: formTemplateId ? Number(formTemplateId) : undefined,
        scheduledAt: formScheduledAt.toISOString(),
        audienceSegment: formAudienceSegment,
        strategyKey: formStrategyKey,
        targetSlotLabel: formTargetSlotLabel,
        autoRunToSchedule: true,
      });
      await load(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to create Facebook workflow',
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRunWorkflow(id: number) {
    setRowActionId(id);
    try {
      await runPostWorkflow(id);
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run workflow');
    } finally {
      setRowActionId(null);
    }
  }

  function applyPreset(slotLabel: string, slotValue: string) {
    setFormTargetSlotLabel(slotLabel);
    setFormScheduledAt(createPresetDate(slotValue));
  }

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 256 }}>
        <Spin tip="Loading Facebook workflow..." />
      </Flex>
    );
  }

  const queueColumns: ColumnsType<Post> = [
    {
      title: 'Post',
      dataIndex: 'content',
      key: 'content',
      render: (_: unknown, post: Post) => (
        <div className="max-w-sm whitespace-normal">
          <Text strong className="!block !line-clamp-2">
            {post.content ?? post.metadata?.draftContent ?? 'Awaiting draft'}
          </Text>
          <Text type="secondary" className="!text-xs !mt-1">
            {post.metadata?.strategyKey ?? 'facebook-plan'} •{' '}
            {post.metadata?.audienceSegment ?? 'vietnamese-investor'}
          </Text>
        </div>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (_: unknown, post: Post) => (
        <Flex vertical gap={4}>
          <Tag color={statusTagColor[post.status]} className="!capitalize">
            {post.status}
          </Tag>
          <Text type="secondary" className="!text-xs !capitalize">
            {post.workflowStage.replace(/_/g, ' ')}
          </Text>
        </Flex>
      ),
    },
    {
      title: 'Scheduled',
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      render: (_: unknown, post: Post) => (
        <div>
          <Text>
            {post.scheduledAt ? new Date(post.scheduledAt).toLocaleString() : 'Not set'}
          </Text>
          <br />
          <Text type="secondary" className="!text-xs">
            Attempts: {post.workflowAttempts}
          </Text>
        </div>
      ),
    },
    {
      title: 'Feedback',
      key: 'feedback',
      render: (_: unknown, post: Post) => {
        const feedback = post.metadata?.feedback;
        return feedback ? (
          <div className="text-xs">
            <Text type="secondary">Likes: {feedback.likes}</Text>
            <br />
            <Text type="secondary">Comments: {feedback.comments}</Text>
            <br />
            <Text type="secondary">Shares: {feedback.shares}</Text>
          </div>
        ) : (
          <Text type="secondary">No feedback yet</Text>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, post: Post) => (
        <Button
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          loading={rowActionId === post.id}
          onClick={() => handleRunWorkflow(post.id)}
        >
          {rowActionId === post.id ? 'Running...' : 'Advance'}
        </Button>
      ),
    },
  ];

  return (
    <Flex vertical gap={24}>
      <Flex vertical gap={12} className="lg:!flex-row lg:!items-center lg:!justify-between">
        <div>
          <Title level={3} className="!mb-0">
            Facebook Ops
          </Title>
          <Text type="secondary">
            AI workflow for research, drafting, compliance, scheduling, publishing, and learning.
          </Text>
        </div>
        <Button icon={<ReloadOutlined spin={refreshing} />} onClick={() => load(true)} disabled={refreshing}>
          Refresh
        </Button>
      </Flex>

      {error && (
        <Alert
          type="error"
          message={error}
          closable
          onClose={() => setError(null)}
          showIcon
        />
      )}

      {schedulerStatus && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <Card>
            <Flex justify="space-between" align="flex-start">
              <div>
                <Text type="secondary">Workflow Scheduler</Text>
                <Title level={4} className="!mt-1 !mb-0">
                  {schedulerStatus.isRunning ? 'Running' : 'Stopped'}
                </Title>
              </div>
              {schedulerStatus.isRunning ? (
                <Tag icon={<CheckCircleOutlined />} color="success">
                  Active
                </Tag>
              ) : (
                <Tag icon={<CloseCircleOutlined />} color="error">
                  Idle
                </Tag>
              )}
            </Flex>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div>
                <Text type="secondary">Cron</Text>
                <Text code className="!block !mt-1 !break-all">
                  {schedulerStatus.cronExpression}
                </Text>
              </div>
              <div>
                <Text type="secondary">Next Run</Text>
                <Text strong className="!block !mt-1">
                  {schedulerStatus.nextRunEstimate
                    ? new Date(schedulerStatus.nextRunEstimate).toLocaleString()
                    : 'N/A'}
                </Text>
                {countdown && (
                  <Text type="success" className="!text-xs !font-mono !mt-1 !block">
                    in {countdown}
                  </Text>
                )}
              </div>
              <div>
                <Text type="secondary">Next Facebook Slot</Text>
                <Text strong className="!block !mt-1">
                  {nextPost?.scheduledAt
                    ? new Date(nextPost.scheduledAt).toLocaleString()
                    : 'No queued post'}
                </Text>
              </div>
            </div>

            <Space className="!mt-6">
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={actionLoading === 'start'}
                disabled={schedulerStatus.isRunning || actionLoading !== null}
                onClick={handleStart}
              >
                {actionLoading === 'start' ? 'Starting...' : 'Start'}
              </Button>
              <Button
                danger
                icon={<PauseCircleOutlined />}
                loading={actionLoading === 'stop'}
                disabled={!schedulerStatus.isRunning || actionLoading !== null}
                onClick={handleStop}
              >
                {actionLoading === 'stop' ? 'Stopping...' : 'Stop'}
              </Button>
            </Space>
          </Card>

          <Card
            title={
              <Flex align="center" gap={8}>
                <ThunderboltOutlined style={{ color: '#1677ff' }} />
                <Title level={4} className="!mb-0">
                  Quick Schedule
                </Title>
              </Flex>
            }
          >
            <Space wrap className="!mb-4">
              {QUICK_SLOT_PRESETS.map((slot) => (
                <Button
                  key={slot.value}
                  type="default"
                  size="small"
                  shape="round"
                  onClick={() => applyPreset(slot.label, slot.value)}
                >
                  {slot.label}
                </Button>
              ))}
            </Space>

            <Form layout="vertical" onFinish={handleSchedule}>
              <Form.Item label="Persona">
                <Select
                  value={formPersonaId || undefined}
                  onChange={setFormPersonaId}
                  placeholder="Select persona..."
                  options={personas.map((persona) => ({
                    label: persona.displayName,
                    value: String(persona.id),
                  }))}
                />
              </Form.Item>

              <Form.Item label="Template">
                <Select
                  value={formTemplateId || undefined}
                  onChange={(val) => {
                    const selected = templates.find(
                      (template) => String(template.id) === val,
                    );
                    setFormTemplateId(val);
                    if (selected) {
                      setFormStrategyKey(selected.type);
                    }
                  }}
                  placeholder="Select template..."
                  options={templates.map((template) => ({
                    label: template.name,
                    value: String(template.id),
                  }))}
                />
              </Form.Item>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Form.Item label="Audience Segment">
                  <Input
                    value={formAudienceSegment}
                    onChange={(e) => setFormAudienceSegment(e.target.value)}
                  />
                </Form.Item>
                <Form.Item label="Strategy Key">
                  <Input
                    value={formStrategyKey}
                    onChange={(e) => setFormStrategyKey(e.target.value)}
                  />
                </Form.Item>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Form.Item label="Target Slot Label">
                  <Input
                    value={formTargetSlotLabel}
                    onChange={(e) => setFormTargetSlotLabel(e.target.value)}
                  />
                </Form.Item>
                <Form.Item label="Scheduled At">
                  <DatePicker
                    showTime
                    value={formScheduledAt}
                    onChange={(val) => val && setFormScheduledAt(val)}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                icon={<RocketOutlined />}
                loading={actionLoading === 'schedule'}
                disabled={actionLoading !== null}
              >
                {actionLoading === 'schedule' ? 'Scheduling...' : 'Create Facebook Workflow'}
              </Button>
            </Form>
          </Card>
        </div>
      )}

      {workflow && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
          <StatsCard
            label="Total Queue"
            value={workflow.queue.total}
            icon={<ClockCircleOutlined style={{ fontSize: 28 }} />}
            color="text-slate-600"
          />
          <StatsCard
            label="Scheduled"
            value={workflow.queue.scheduled}
            icon={<CalendarOutlined style={{ fontSize: 28 }} />}
            color="text-blue-600"
          />
          <StatsCard
            label="Generating"
            value={workflow.queue.generating}
            icon={<ThunderboltOutlined style={{ fontSize: 28 }} />}
            color="text-yellow-600"
          />
          <StatsCard
            label="Failed"
            value={workflow.queue.failed}
            icon={<CloseCircleOutlined style={{ fontSize: 28 }} />}
            color="text-red-600"
          />
          <StatsCard
            label="Overdue"
            value={workflow.queue.overdue}
            icon={<FireOutlined style={{ fontSize: 28 }} />}
            color="text-orange-600"
          />
          <StatsCard
            label="Posted Today"
            value={workflow.queue.postedToday}
            icon={<CheckCircleOutlined style={{ fontSize: 28 }} />}
            color="text-green-600"
          />
        </div>
      )}

      <div>
        <Flex justify="space-between" align="flex-start" className="!mb-4">
          <div>
            <Title level={4} className="!mb-0">
              Facebook Queue
            </Title>
            <Text type="secondary">
              Posts moving through research, drafting, compliance, and publishing.
            </Text>
          </div>
        </Flex>

        <Table<Post>
          columns={queueColumns}
          dataSource={queuePosts}
          rowKey={(post) => String(post.id)}
          pagination={{ pageSize: 10, showSizeChanger: true }}
          locale={{ emptyText: 'No Facebook posts in workflow queue' }}
        />
      </div>
    </Flex>
  );
}
