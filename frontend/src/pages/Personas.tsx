import { useCallback, useEffect, useState } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Checkbox,
  Flex,
  Form,
  Input,
  Modal,
  Select,
  Spin,
  Table,
  Tag,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getPersonas, createPersona, updatePersona, deletePersona } from '../lib/api';
import type { Persona, ToneOfVoice, Platform } from '../types';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ALL_TONES: ToneOfVoice[] = ['professional', 'casual', 'humorous', 'educational', 'aggressive'];
const ALL_PLATFORMS: Platform[] = ['facebook', 'twitter', 'telegram'];

export default function Personas() {
  const { role } = useAuth();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingPersonaId, setEditingPersonaId] = useState<number | null>(null);

  const [formName, setFormName] = useState('');
  const [formDisplayName, setFormDisplayName] = useState('');
  const [formBio, setFormBio] = useState('');
  const [formExpertise, setFormExpertise] = useState('');
  const [formToneOfVoice, setFormToneOfVoice] = useState<ToneOfVoice>('professional');
  const [formTargetPlatforms, setFormTargetPlatforms] = useState<Platform[]>([]);
  const [formAvatarUrl, setFormAvatarUrl] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await getPersonas();
      setPersonas(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load personas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function handleEdit(persona: Persona) {
    setEditingPersonaId(persona.id);
    setFormName(persona.name);
    setFormDisplayName(persona.displayName);
    setFormBio(persona.bio);
    setFormExpertise(persona.expertise.join(', '));
    setFormToneOfVoice(persona.toneOfVoice);
    setFormTargetPlatforms(persona.targetPlatforms);
    setFormAvatarUrl(persona.avatarUrl || '');
    setModalOpen(true);
  }

  function handleCreateNew() {
    setEditingPersonaId(null);
    setFormName('');
    setFormDisplayName('');
    setFormBio('');
    setFormExpertise('');
    setFormToneOfVoice('professional');
    setFormTargetPlatforms([]);
    setFormAvatarUrl('');
    setModalOpen(true);
  }

  async function handleDelete(id: number) {
    Modal.confirm({
      title: 'Delete Persona',
      content: 'Are you sure you want to delete this persona?',
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          await deletePersona(id);
          await load();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to delete persona');
        }
      },
    });
  }

  async function handleCreate() {
    if (!formName || !formDisplayName || !formBio) return;
    setSaving(true);
    try {
      const payload = {
        name: formName,
        displayName: formDisplayName,
        bio: formBio,
        expertise: formExpertise.split(',').map((s) => s.trim()).filter(Boolean),
        toneOfVoice: formToneOfVoice,
        targetPlatforms: formTargetPlatforms,
        language: 'vi' as const,
        avatarUrl: formAvatarUrl || undefined,
      };

      if (editingPersonaId) {
        await updatePersona(editingPersonaId, payload);
      } else {
        await createPersona(payload);
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${editingPersonaId ? 'update' : 'create'} persona`);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 256 }}>
        <Spin tip="Loading personas..." />
      </Flex>
    );
  }

  const columns: ColumnsType<Persona> = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 60,
      render: (id: number) => String(id),
    },
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Display Name',
      dataIndex: 'displayName',
      key: 'displayName',
    },
    {
      title: 'Tone',
      dataIndex: 'toneOfVoice',
      key: 'toneOfVoice',
      render: (tone: ToneOfVoice) => (
        <Tag color="purple" className="!capitalize">
          {tone}
        </Tag>
      ),
    },
    {
      title: 'Platforms',
      dataIndex: 'targetPlatforms',
      key: 'targetPlatforms',
      render: (platforms: Platform[]) => (
        <Text>{platforms.join(', ')}</Text>
      ),
    },
    {
      title: 'Expertise',
      dataIndex: 'expertise',
      key: 'expertise',
      ellipsis: true,
      render: (expertise: string[]) => (
        <Text className="!block !max-w-xs !truncate">
          {expertise.join(', ') || '\u2014'}
        </Text>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => new Date(createdAt).toLocaleString(),
    },
  ];

  if (role === 'admin') {
    columns.push({
      title: 'Actions',
      key: 'actions',
      align: 'right',
      render: (_: unknown, persona: Persona) => (
        <Flex gap={8} justify="flex-end">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEdit(persona)}
            title="Edit"
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDelete(persona.id)}
            title="Delete"
          />
        </Flex>
      ),
    });
  }

  return (
    <Flex vertical gap={24}>
      <Flex justify="space-between" align="center">
        <Title level={3} className="!mb-0">
          Personas
        </Title>
        {role === 'admin' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateNew}>
            Create Persona
          </Button>
        )}
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

      <Table<Persona>
        columns={columns}
        dataSource={personas}
        rowKey={(persona) => String(persona.id)}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        locale={{ emptyText: 'No personas found' }}
      />

      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title={editingPersonaId ? 'Edit Persona' : 'Create Persona'}
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" onFinish={handleCreate}>
          <Form.Item label="Name" required>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g. crypto_minh"
            />
          </Form.Item>
          <Form.Item label="Display Name" required>
            <Input
              value={formDisplayName}
              onChange={(e) => setFormDisplayName(e.target.value)}
              placeholder="e.g. Crypto Minh"
            />
          </Form.Item>
          <Form.Item label="Bio" required>
            <TextArea
              value={formBio}
              onChange={(e) => setFormBio(e.target.value)}
              rows={3}
              placeholder="Describe this persona..."
            />
          </Form.Item>
          <Form.Item label="Expertise (comma-separated)">
            <Input
              value={formExpertise}
              onChange={(e) => setFormExpertise(e.target.value)}
              placeholder="e.g. DeFi, NFT, Bitcoin"
            />
          </Form.Item>
          <Form.Item label="Tone of Voice">
            <Select
              value={formToneOfVoice}
              onChange={setFormToneOfVoice}
              options={ALL_TONES.map((t) => ({ label: t, value: t }))}
            />
          </Form.Item>
          <Form.Item label="Target Platforms">
            <Checkbox.Group
              value={formTargetPlatforms}
              onChange={(vals) => setFormTargetPlatforms(vals as Platform[])}
              options={ALL_PLATFORMS.map((p) => ({ label: p, value: p }))}
            />
          </Form.Item>
          <Form.Item label="Avatar URL (optional)">
            <Input
              value={formAvatarUrl}
              onChange={(e) => setFormAvatarUrl(e.target.value)}
              placeholder="https://..."
            />
          </Form.Item>
          <Flex justify="flex-end" gap={12}>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={!formName || !formDisplayName || !formBio}
            >
              {saving ? 'Saving...' : editingPersonaId ? 'Save Changes' : 'Create Persona'}
            </Button>
          </Flex>
        </Form>
      </Modal>
    </Flex>
  );
}
