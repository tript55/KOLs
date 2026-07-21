import { useCallback, useEffect, useState } from 'react';
import { PlusOutlined, ThunderboltOutlined, BulbOutlined, EditOutlined, DeleteOutlined, SendOutlined } from '@ant-design/icons';
import {
  Alert,
  Button,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Spin,
  Table,
  Typography,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { getTemplates, getPersonas, createTemplate, updateTemplate, deleteTemplate, generateContent, suggestConcept, postToFacebook } from '../lib/api';
import type { Template, TemplateType, Platform, Persona, CreateTemplateRequest, UpdateTemplateRequest, GenerateResponse } from '../types';
import { useAuth } from '../context/AuthContext';

const { Title, Text } = Typography;
const { TextArea } = Input;

const ALL_TYPES: TemplateType[] = ['market_update', 'news_commentary', 'educational', 'meme', 'alpha_call', 'engagement'];
const ALL_PLATFORMS: Platform[] = ['facebook', 'twitter', 'telegram'];

function formatLabel(value: string): string {
  return value.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Templates() {
  const { role } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState<number | null>(null);
  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [conceptInput, setConceptInput] = useState('');
  const [suggestingConcept, setSuggestingConcept] = useState(false);

  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<TemplateType>('market_update');
  const [formPlatform, setFormPlatform] = useState<Platform>('facebook');
  const [formPersonaId, setFormPersonaId] = useState('');
  const [formSystemPrompt, setFormSystemPrompt] = useState('');
  const [formUserPromptTemplate, setFormUserPromptTemplate] = useState('');
  const [formMaxTokens, setFormMaxTokens] = useState(50000);
  const [formTemperature, setFormTemperature] = useState(0.8);
  const [formHashtags, setFormHashtags] = useState('');

  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editSaving, setEditSaving] = useState(false);

  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<TemplateType>('market_update');
  const [editPlatform, setEditPlatform] = useState<Platform>('facebook');
  const [editPersonaId, setEditPersonaId] = useState('');
  const [editSystemPrompt, setEditSystemPrompt] = useState('');
  const [editUserPromptTemplate, setEditUserPromptTemplate] = useState('');
  const [editMaxTokens, setEditMaxTokens] = useState(50000);
  const [editTemperature, setEditTemperature] = useState(0.8);
  const [editHashtags, setEditHashtags] = useState('');

  const [editableContent, setEditableContent] = useState<string | null>(null);
  const [postingToFacebook, setPostingToFacebook] = useState(false);
  const [postResult, setPostResult] = useState<{ success: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [templatesData, personasData] = await Promise.all([
        getTemplates(),
        getPersonas(),
      ]);
      setTemplates(templatesData);
      setPersonas(personasData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function resetForm() {
    setFormName('');
    setFormType('market_update');
    setFormPlatform('facebook');
    setFormPersonaId('');
    setFormSystemPrompt('');
    setFormUserPromptTemplate('');
    setFormMaxTokens(50000);
    setFormTemperature(0.8);
    setFormHashtags('');
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const hashtags = formHashtags
        .split(',')
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

      const data: CreateTemplateRequest = {
        name: formName,
        type: formType,
        platform: formPlatform,
        personaId: Number(formPersonaId),
        systemPrompt: formSystemPrompt,
        userPromptTemplate: formUserPromptTemplate,
        maxTokens: formMaxTokens,
        temperature: formTemperature,
        hashtags,
      };

      await createTemplate(data);
      setModalOpen(false);
      resetForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create template');
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(template: Template) {
    setEditingTemplateId(template.id);
    setEditName(template.name);
    setEditType(template.type);
    setEditPlatform(template.platform);
    setEditPersonaId(String(template.personaId));
    setEditSystemPrompt(template.systemPrompt);
    setEditUserPromptTemplate(template.userPromptTemplate);
    setEditMaxTokens(template.maxTokens);
    setEditTemperature(template.temperature);
    setEditHashtags(template.hashtags.join(', '));
    setEditModalOpen(true);
  }

  async function handleUpdate() {
    if (editingTemplateId === null) return;
    setEditSaving(true);
    try {
      const hashtags = editHashtags
        .split(',')
        .map((h) => h.trim())
        .filter((h) => h.length > 0);

      const data: UpdateTemplateRequest = {
        name: editName,
        type: editType,
        platform: editPlatform,
        personaId: Number(editPersonaId),
        systemPrompt: editSystemPrompt,
        userPromptTemplate: editUserPromptTemplate,
        maxTokens: editMaxTokens,
        temperature: editTemperature,
        hashtags,
      };

      await updateTemplate(editingTemplateId, data);
      setEditModalOpen(false);
      setEditingTemplateId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update template');
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: number) {
    try {
      await deleteTemplate(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete template');
    }
  }

  async function handlePostToFacebook() {
    if (!editableContent) return;
    const templateId = generating !== null ? generating : selectedTemplateId;
    const template = templates.find(t => t.id === templateId);

    if (!template) {
      setError('No template found for the generated content');
      return;
    }

    setPostingToFacebook(true);
    setPostResult(null);
    try {
      await postToFacebook(editableContent, template.personaId, template.id);
      setPostResult({ success: true, message: 'Posted to Facebook successfully!' });
    } catch (err) {
      setPostResult({
        success: false,
        message: err instanceof Error ? err.message : 'Failed to post to Facebook',
      });
    } finally {
      setPostingToFacebook(false);
    }
  }

  async function handleGenerate(templateId: number) {
    const template = templates.find(t => t.id === templateId);
    
    if (template?.type === 'educational') {
      setSelectedTemplateId(templateId);
      setConceptInput('');
      setGenerateModalOpen(true);
      return;
    }
    
    await generateWithTemplate(templateId, {});
  }

  async function generateWithTemplate(templateId: number, context: Record<string, string>) {
    setGenerating(templateId);
    try {
      const result: GenerateResponse = await generateContent({ templateId, context });
      setEditableContent(result.content);
      setPostResult(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setGenerating(null);
    }
  }

  async function handleGenerateWithConcept() {
    if (selectedTemplateId === null || !conceptInput.trim()) return;
    
    setGenerateModalOpen(false);
    await generateWithTemplate(selectedTemplateId, { concept: conceptInput.trim() });
    setSelectedTemplateId(null);
    setConceptInput('');
  }

  async function handleSuggestConcept() {
    setSuggestingConcept(true);
    try {
      const result = await suggestConcept();
      setConceptInput(result.suggestion);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to suggest concept');
    } finally {
      setSuggestingConcept(false);
    }
  }

  function getPersonaName(personaId: number): string {
    const persona = personas.find((p) => p.id === personaId);
    return persona ? persona.displayName : String(personaId);
  }

  if (loading) {
    return (
      <Flex justify="center" align="center" style={{ minHeight: 256 }}>
        <Spin tip="Loading templates..." />
      </Flex>
    );
  }

  const columns: ColumnsType<Template> = [
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
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: TemplateType) => formatLabel(type),
    },
    {
      title: 'Platform',
      dataIndex: 'platform',
      key: 'platform',
      render: (platform: string) => <span className="capitalize">{platform}</span>,
    },
    {
      title: 'Persona',
      dataIndex: 'personaId',
      key: 'personaId',
      render: (personaId: number) => getPersonaName(personaId),
    },
    {
      title: 'Max Tokens',
      dataIndex: 'maxTokens',
      key: 'maxTokens',
      render: (maxTokens: number) => String(maxTokens),
    },
    {
      title: 'Temperature',
      dataIndex: 'temperature',
      key: 'temperature',
      render: (temperature: number) => String(temperature),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (createdAt: string) => new Date(createdAt).toLocaleString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 300,
      render: (_: unknown, template: Template) => (
        <Flex gap={8}>
          <Button
            type="dashed"
            size="small"
            icon={<ThunderboltOutlined />}
            loading={generating === template.id}
            onClick={() => handleGenerate(template.id)}
          >
            {generating === template.id ? 'Generating...' : 'Generate'}
          </Button>
          {role === 'admin' && (
            <>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEdit(template)}
              >
                Edit
              </Button>
              <Popconfirm
                title="Delete this template?"
                description="This action cannot be undone."
                onConfirm={() => handleDelete(template.id)}
                okText="Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Button
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                >
                  Delete
                </Button>
              </Popconfirm>
            </>
          )}
        </Flex>
      ),
    },
  ];

  return (
    <Flex vertical gap={24}>
      <Flex justify="space-between" align="center">
        <Title level={3} className="!mb-0">
          Templates
        </Title>
        {role === 'admin' && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
            Create Template
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

      <Table<Template>
        columns={columns}
        dataSource={templates}
        rowKey={(template) => String(template.id)}
        pagination={{ pageSize: 10, showSizeChanger: true }}
        locale={{ emptyText: 'No templates found' }}
      />

      {editableContent && (
        <Flex vertical gap={12}>
          <Title level={5}>Generated Content</Title>
          <TextArea
            value={editableContent}
            onChange={(e) => setEditableContent(e.target.value)}
            rows={8}
            style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}
          />
          <Flex gap={12} align="center">
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={postingToFacebook}
              onClick={handlePostToFacebook}
              disabled={!editableContent.trim()}
            >
              {postingToFacebook ? 'Posting...' : 'Post to Facebook'}
            </Button>
            <Button onClick={() => { setEditableContent(null); setPostResult(null); }}>
              Discard
            </Button>
          </Flex>
          {postResult && (
            <Alert
              type={postResult.success ? 'success' : 'error'}
              message={postResult.message}
              closable
              onClose={() => setPostResult(null)}
              showIcon
            />
          )}
        </Flex>
      )}

      {/* Create Template Modal */}
      <Modal
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        title="Create Template"
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" onFinish={handleCreate}>
          <Form.Item label="Name" required>
            <Input
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="Type">
            <Select
              value={formType}
              onChange={setFormType}
              options={ALL_TYPES.map((t) => ({ label: formatLabel(t), value: t }))}
            />
          </Form.Item>
          <Form.Item label="Platform">
            <Select
              value={formPlatform}
              onChange={setFormPlatform}
              options={ALL_PLATFORMS.map((p) => ({ label: p, value: p }))}
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
          <Form.Item label="System Prompt" required>
            <TextArea
              value={formSystemPrompt}
              onChange={(e) => setFormSystemPrompt(e.target.value)}
              rows={6}
            />
          </Form.Item>
          <Form.Item label="User Prompt Template" required>
            <TextArea
              value={formUserPromptTemplate}
              onChange={(e) => setFormUserPromptTemplate(e.target.value)}
              rows={4}
              placeholder="Use {{variable}} placeholders, e.g. Write about {{topic}} for {{coin}}"
            />
          </Form.Item>
          <Form.Item label="Max Tokens">
            <InputNumber
              value={formMaxTokens}
              onChange={(val) => setFormMaxTokens(val ?? 50000)}
              min={50}
              max={4000}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="Temperature">
            <InputNumber
              value={formTemperature}
              onChange={(val) => setFormTemperature(val ?? 0.8)}
              step={0.1}
              min={0}
              max={2}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="Hashtags">
            <Input
              value={formHashtags}
              onChange={(e) => setFormHashtags(e.target.value)}
              placeholder="Comma-separated, e.g. crypto, bitcoin, defi"
            />
          </Form.Item>
          <Flex justify="flex-end" gap={12}>
            <Button onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              disabled={!formPersonaId || !formName || !formSystemPrompt || !formUserPromptTemplate}
            >
              {saving ? 'Creating...' : 'Create Template'}
            </Button>
          </Flex>
        </Form>
      </Modal>

      {/* Edit Template Modal */}
      <Modal
        open={editModalOpen}
        onCancel={() => { setEditModalOpen(false); setEditingTemplateId(null); }}
        title="Edit Template"
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical" onFinish={handleUpdate}>
          <Form.Item label="Name" required>
            <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </Form.Item>
          <Form.Item label="Type">
            <Select
              value={editType}
              onChange={setEditType}
              options={ALL_TYPES.map((t) => ({ label: formatLabel(t), value: t }))}
            />
          </Form.Item>
          <Form.Item label="Platform">
            <Select
              value={editPlatform}
              onChange={setEditPlatform}
              options={ALL_PLATFORMS.map((p) => ({ label: p, value: p }))}
            />
          </Form.Item>
          <Form.Item label="Persona">
            <Select
              value={editPersonaId || undefined}
              onChange={setEditPersonaId}
              placeholder="Select persona..."
              options={personas.map((p) => ({ label: p.displayName, value: String(p.id) }))}
            />
          </Form.Item>
          <Form.Item label="System Prompt" required>
            <TextArea value={editSystemPrompt} onChange={(e) => setEditSystemPrompt(e.target.value)} rows={6} />
          </Form.Item>
          <Form.Item label="User Prompt Template" required>
            <TextArea
              value={editUserPromptTemplate}
              onChange={(e) => setEditUserPromptTemplate(e.target.value)}
              rows={4}
              placeholder="Use {{variable}} placeholders"
            />
          </Form.Item>
          <Form.Item label="Max Tokens">
            <InputNumber
              value={editMaxTokens}
              onChange={(val) => setEditMaxTokens(val ?? 50000)}
              min={50}
              max={50000}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="Temperature">
            <InputNumber
              value={editTemperature}
              onChange={(val) => setEditTemperature(val ?? 0.8)}
              step={0.1}
              min={0}
              max={2}
              style={{ width: '100%' }}
            />
          </Form.Item>
          <Form.Item label="Hashtags">
            <Input
              value={editHashtags}
              onChange={(e) => setEditHashtags(e.target.value)}
              placeholder="Comma-separated, e.g. crypto, bitcoin, defi"
            />
          </Form.Item>
          <Flex justify="flex-end" gap={12}>
            <Button onClick={() => { setEditModalOpen(false); setEditingTemplateId(null); }}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={editSaving}
              disabled={!editPersonaId || !editName || !editSystemPrompt || !editUserPromptTemplate}
            >
              {editSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </Flex>
        </Form>
      </Modal>

      {/* Generate Educational Content Modal */}
      <Modal
        open={generateModalOpen}
        onCancel={() => {
          setGenerateModalOpen(false);
          setSelectedTemplateId(null);
          setConceptInput('');
        }}
        title="Generate Educational Content"
        footer={null}
        destroyOnClose
      >
        <Form layout="vertical">
          <Form.Item label="Concept to explain">
            <Flex justify="space-between" align="center" className="!mb-1">
              <Text type="secondary" className="!text-xs">
                Enter the crypto concept you want to explain
              </Text>
              <Button
                type="primary"
                size="small"
                ghost
                icon={<BulbOutlined />}
                loading={suggestingConcept}
                onClick={handleSuggestConcept}
              >
                {suggestingConcept ? 'Đang gợi ý...' : 'AI Gợi ý'}
              </Button>
            </Flex>
            <TextArea
              value={conceptInput}
              onChange={(e) => setConceptInput(e.target.value)}
              placeholder="Enter the crypto concept you want to explain (e.g., 'DeFi là gì?', 'Staking hoạt động như thế nào?')"
              rows={4}
            />
          </Form.Item>
          <Flex justify="flex-end" gap={12}>
            <Button
              onClick={() => {
                setGenerateModalOpen(false);
                setSelectedTemplateId(null);
                setConceptInput('');
              }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              onClick={handleGenerateWithConcept}
              disabled={!conceptInput.trim() || generating !== null}
              loading={generating !== null}
            >
              {generating !== null ? 'Generating...' : 'Generate'}
            </Button>
          </Flex>
        </Form>
      </Modal>
    </Flex>
  );
}
