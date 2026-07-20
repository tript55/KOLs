import { useCallback, useEffect, useState } from 'react';
import { PlusIcon, SparklesIcon, LightBulbIcon } from '@heroicons/react/24/outline';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { getTemplates, getPersonas, createTemplate, generateContent, suggestConcept } from '../lib/api';
import type { Template, TemplateType, Platform, Persona, CreateTemplateRequest, GenerateResponse } from '../types';
import { useAuth } from '../context/AuthContext';

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
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
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
    setGeneratedContent(null);
    try {
      const result: GenerateResponse = await generateContent({ templateId, context });
      setGeneratedContent(result.content);
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
      <div className="flex items-center justify-center h-64">
        <p className="animate-pulse text-ink-2">Loading templates...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink-1">Templates</h2>
        {role === 'admin' && (
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-4 h-4" />
            Create Template
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <DataTable
        columns={[
          { key: 'id', header: 'ID', render: (template: Template) => String(template.id) },
          { key: 'name', header: 'Name', render: (template: Template) => template.name },
          {
            key: 'type',
            header: 'Type',
            render: (template: Template) => formatLabel(template.type),
          },
          {
            key: 'platform',
            header: 'Platform',
            render: (template: Template) => <span className="capitalize">{template.platform}</span>,
          },
          {
            key: 'personaId',
            header: 'Persona',
            render: (template: Template) => getPersonaName(template.personaId),
          },
          {
            key: 'maxTokens',
            header: 'Max Tokens',
            render: (template: Template) => String(template.maxTokens),
          },
          {
            key: 'temperature',
            header: 'Temperature',
            render: (template: Template) => String(template.temperature),
          },
          {
            key: 'createdAt',
            header: 'Created',
            render: (template: Template) => new Date(template.createdAt).toLocaleString(),
          },
          {
            key: 'actions',
            header: 'Actions',
            render: (template: Template) => (
              <button
                onClick={() => handleGenerate(template.id)}
                disabled={generating === template.id}
                className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
              >
                <SparklesIcon className="w-3 h-3" />
                {generating === template.id ? 'Generating...' : 'Generate'}
              </button>
            ),
          },
        ]}
        data={templates}
        keyExtractor={(template) => String(template.id)}
        emptyMessage="No templates found"
      />

      {generatedContent && (
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-sm text-green-800 whitespace-pre-wrap">
          {generatedContent}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Template">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Type</label>
            <select
              value={formType}
              onChange={(e) => setFormType(e.target.value as TemplateType)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {ALL_TYPES.map((t) => (
                <option key={t} value={t}>{formatLabel(t)}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Platform</label>
            <select
              value={formPlatform}
              onChange={(e) => setFormPlatform(e.target.value as Platform)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {ALL_PLATFORMS.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Persona</label>
            <select
              value={formPersonaId}
              onChange={(e) => setFormPersonaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select persona...</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>{p.displayName}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">System Prompt</label>
            <textarea
              value={formSystemPrompt}
              onChange={(e) => setFormSystemPrompt(e.target.value)}
              required
              rows={6}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">User Prompt Template</label>
            <textarea
              value={formUserPromptTemplate}
              onChange={(e) => setFormUserPromptTemplate(e.target.value)}
              required
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Use {{variable}} placeholders, e.g. Write about {{topic}} for {{coin}}"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Max Tokens</label>
            <input
              type="number"
              value={formMaxTokens}
              onChange={(e) => setFormMaxTokens(Number(e.target.value))}
              min={50}
              max={4000}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Temperature</label>
            <input
              type="number"
              value={formTemperature}
              onChange={(e) => setFormTemperature(Number(e.target.value))}
              step={0.1}
              min={0}
              max={2}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Hashtags</label>
            <input
              type="text"
              value={formHashtags}
              onChange={(e) => setFormHashtags(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Comma-separated, e.g. crypto, bitcoin, defi"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-ink-1 hover:bg-paper-1 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formPersonaId || !formName || !formSystemPrompt || !formUserPromptTemplate}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating...' : 'Create Template'}
            </button>
          </div>
        </form>
      </Modal>

      <Modal 
        open={generateModalOpen} 
        onClose={() => {
          setGenerateModalOpen(false);
          setSelectedTemplateId(null);
          setConceptInput('');
        }} 
        title="Generate Educational Content"
      >
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-ink-1">
                Concept to explain
              </label>
              <button
                type="button"
                onClick={handleSuggestConcept}
                disabled={suggestingConcept}
                className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-r from-purple-500 to-pink-500 px-3 py-1 text-xs font-medium text-white hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 transition-all"
              >
                <LightBulbIcon className="w-3.5 h-3.5" />
                {suggestingConcept ? 'Đang gợi ý...' : 'AI Gợi ý'}
              </button>
            </div>
            <textarea
              value={conceptInput}
              onChange={(e) => setConceptInput(e.target.value)}
              placeholder="Enter the crypto concept you want to explain (e.g., 'DeFi là gì?', 'Staking hoạt động như thế nào?')"
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setGenerateModalOpen(false);
                setSelectedTemplateId(null);
                setConceptInput('');
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-ink-1 hover:bg-paper-1 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleGenerateWithConcept}
              disabled={!conceptInput.trim() || generating !== null}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {generating !== null ? 'Generating...' : 'Generate'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
