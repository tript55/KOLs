import { useCallback, useEffect, useState } from 'react';
import {
  PlusOutlined,
  PlayCircleOutlined,
  EditOutlined,
  DeleteOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import {
  Alert,
  Button,
  DatePicker,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Spin,
  Typography,
} from 'antd';
import dayjs from 'dayjs';
import DataTable from '../components/DataTable';
import StatusBadge from '../components/StatusBadge';
import {
  getPosts,
  getPersonas,
  getTemplates,
  createPost,
  updatePost,
  deletePost,
  processPost,
  generateContent,
} from '../lib/api';
import type { Post, PostStatus, Platform, Persona, Template } from '../types';

const { Text, Title } = Typography;
const { TextArea } = Input;

const ALL_STATUSES: PostStatus[] = [
  'draft',
  'scheduled',
  'generating',
  'posted',
  'failed',
];
const ALL_PLATFORMS: Platform[] = ['facebook', 'twitter', 'telegram'];

export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PostStatus | ''>('');
  const [platformFilter, setPlatformFilter] = useState<Platform | ''>('facebook');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);

  const [formPlatform, setFormPlatform] = useState<Platform>('facebook');
  const [formStatus, setFormStatus] = useState<PostStatus>('draft');
  const [formPersonaId, setFormPersonaId] = useState('');
  const [formTemplateId, setFormTemplateId] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formScheduledAt, setFormScheduledAt] = useState<dayjs.Dayjs | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const load = useCallback(async () => {
    try {
      const [postsData, personasData, templatesData] = await Promise.all([
        getPosts(),
        getPersonas(),
        getTemplates(),
      ]);
      setPosts(postsData);
      setPersonas(personasData);
      setTemplates(templatesData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load posts');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleProcess(id: number) {
    setProcessing(id);
    try {
      await processPost(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process post');
    } finally {
      setProcessing(null);
    }
  }

  function handleEdit(post: Post) {
    setEditingPost(post);
    setFormPlatform(post.platform);
    setFormStatus(post.status);
    setFormPersonaId(String(post.personaId));
    setFormTemplateId(post.templateId ? String(post.templateId) : '');
    setFormContent(post.content ?? '');
    setFormScheduledAt(post.scheduledAt ? dayjs(post.scheduledAt) : null);
    setModalOpen(true);
  }

  async function handleDelete(id: number) {
    Modal.confirm({
      title: 'Delete Post',
      content: 'Are you sure you want to delete this post?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deletePost(id);
          await load();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete post');
        }
      },
    });
  }

  async function handleGenerate() {
    if (!formTemplateId) {
      setError('Please select a template first');
      return;
    }
    setGenerating(true);
    try {
      const result = await generateContent({
        templateId: Number(formTemplateId),
      });
      setFormContent(result.content);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to generate content',
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const postData = {
        platform: formPlatform,
        status: formStatus,
        personaId: Number(formPersonaId),
        templateId: formTemplateId ? Number(formTemplateId) : undefined,
        content: formContent || undefined,
        scheduledAt: formScheduledAt ? formScheduledAt.toISOString() : undefined,
      };

      if (editingPost) {
        await updatePost(editingPost.id, postData);
      } else {
        await createPost(postData);
      }

      setModalOpen(false);
      setEditingPost(null);
      setFormPlatform('facebook');
      setFormStatus('draft');
      setFormPersonaId('');
      setFormTemplateId('');
      setFormContent('');
      setFormScheduledAt(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save post');
    } finally {
      setSaving(false);
    }
  }

  const filtered = posts.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (platformFilter && p.platform !== platformFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 256 }}>
        <Spin tip="Loading posts..." />
      </Flex>
    );
  }

  const columns: ColumnsType<Post> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (id: number) => String(id),
    },
    {
      title: 'Content',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string | null) => (
        <Text className="!block !max-w-xs !truncate">{content ?? '\u2014'}</Text>
      ),
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => <span className="capitalize">{platform}</span>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: PostStatus) => (
        <Tag color={statusTagColor[status]} className="!capitalize">
          {status}
        </Tag>
      ),
    },
    {
      title: 'Scheduled At',
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      render: (scheduledAt: string | null) =>
        scheduledAt ? new Date(scheduledAt).toLocaleString() : '\u2014',
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: unknown, post: Post) => (
        <Space size="small">
          <Button
            type="link"
            size="small"
            icon={<PlayCircleOutlined />}
            loading={processing === post.id}
            onClick={() => handleProcess(post.id)}
            className="!text-green-600"
          >
            {processing === post.id ? 'Processing...' : 'Process now'}
          </Button>
          <Button
            type="link"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(post)}
            className="!text-blue-600"
          >
            Edit
          </Button>
          <Button
            type="link"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(post.id)}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <Flex vertical gap={24}>
      <Flex justify="space-between" align="center">
        <Title level={3} className="!mb-0">
          Posts
        </Title>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Schedule New Post
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

      {/* Filters */}
      <Space>
        <Select
          value={statusFilter || undefined}
          onChange={(val) => setStatusFilter(val ?? '')}
          placeholder="All Statuses"
          allowClear
          style={{ width: 180 }}
          options={[
            { label: 'All Statuses', value: '' },
            ...ALL_STATUSES.map((s) => ({ label: s, value: s })),
          ]}
        />
        <Select
          value={platformFilter || undefined}
          onChange={(val) => setPlatformFilter(val ?? '')}
          placeholder="All Platforms"
          allowClear
          style={{ width: 180 }}
          options={[
            { label: 'All Platforms', value: '' },
            ...ALL_PLATFORMS.map((p) => ({ label: p, value: p })),
          ]}
        />
      </Space>

      <Table<Post>
        columns={columns}
        dataSource={filtered}
        rowKey={(post) => String(post.id)}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        locale={{ emptyText: 'No posts found' }}
      />

      <Modal
        open={modalOpen}
        onCancel={() => {
          setModalOpen(false);
          setEditingPost(null);
        }}
        title={editingPost ? 'Edit Post' : 'Schedule New Post'}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" onFinish={handleCreate}>
          <Form.Item label="Platform">
            <Select
              value={formPlatform}
              onChange={setFormPlatform}
              options={ALL_PLATFORMS.map((p) => ({ label: p, value: p }))}
            />
          </Form.Item>
          <Form.Item label="Status">
            <Select
              value={formStatus}
              onChange={setFormStatus}
              options={ALL_STATUSES.map((s) => ({ label: s, value: s }))}
            />
          </Form.Item>
          <Form.Item label="Persona">
            <Select
              value={formPersonaId || undefined}
              onChange={setFormPersonaId}
              placeholder="Select persona..."
              options={personas.map((p) => ({
                label: p.displayName,
                value: String(p.id),
              }))}
            />
          </Form.Item>
          <Form.Item label="Template (optional)">
            <Select
              value={formTemplateId || undefined}
              onChange={setFormTemplateId}
              placeholder="None"
              allowClear
              options={templates.map((t) => ({
                label: t.name,
                value: String(t.id),
              }))}
            />
          </Form.Item>
          <Form.Item label="Content (optional)">
            <Flex justify="space-between" align="center" className="!mb-1">
              <Text type="secondary" className="!text-xs">
                Leave empty or click AI Generate...
              </Text>
              <Button
                type="dashed"
                size="small"
                icon={<ThunderboltOutlined />}
                loading={generating}
                disabled={!formTemplateId}
                onClick={handleGenerate}
              >
                {generating ? 'Generating...' : 'AI Generate'}
              </Button>
            </Flex>
            <TextArea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={3}
              placeholder="Leave empty or click AI Generate..."
            />
          </Form.Item>
          <Form.Item label="Scheduled At (optional)">
            <DatePicker
              showTime
              value={formScheduledAt}
              onChange={setFormScheduledAt}
              style={{ width: '100%' }}
              placeholder="Select date and time"
            />
          </Form.Item>
          <Flex justify="flex-end" gap={12}>
            <Button
              onClick={() => {
                setModalOpen(false);
                setEditingPost(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={!formPersonaId}
            >
              {saving ? 'Saving...' : editingPost ? 'Update Post' : 'Create Post'}
            </Button>
          </Flex>
        </Form>
      </Modal>
    </Flex>
  );
}
