import { useCallback, useEffect, useState } from 'react';
import { PlusIcon } from '@heroicons/react/24/outline';
import DataTable from '../components/DataTable';
import Modal from '../components/Modal';
import { getPersonas, createPersona } from '../lib/api';
import type { Persona, ToneOfVoice, Platform } from '../types';

const ALL_TONES: ToneOfVoice[] = ['professional', 'casual', 'humorous', 'educational', 'aggressive'];
const ALL_PLATFORMS: Platform[] = ['facebook', 'twitter', 'telegram'];

export default function Personas() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

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

  function togglePlatform(platform: Platform) {
    setFormTargetPlatforms((prev) =>
      prev.includes(platform)
        ? prev.filter((p) => p !== platform)
        : [...prev, platform]
    );
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName || !formDisplayName || !formBio) return;
    setSaving(true);
    try {
      await createPersona({
        name: formName,
        displayName: formDisplayName,
        bio: formBio,
        expertise: formExpertise.split(',').map((s) => s.trim()).filter(Boolean),
        toneOfVoice: formToneOfVoice,
        targetPlatforms: formTargetPlatforms,
        language: 'vi',
        avatarUrl: formAvatarUrl || undefined,
      });
      setModalOpen(false);
      setFormName('');
      setFormDisplayName('');
      setFormBio('');
      setFormExpertise('');
      setFormToneOfVoice('professional');
      setFormTargetPlatforms([]);
      setFormAvatarUrl('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create persona');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="animate-pulse text-ink-2">Loading personas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink-1">Personas</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Create Persona
        </button>
      </div>

      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      <DataTable
        columns={[
          { key: 'id', header: 'ID', render: (persona: Persona) => String(persona.id) },
          { key: 'name', header: 'Name', render: (persona: Persona) => persona.name },
          { key: 'displayName', header: 'Display Name', render: (persona: Persona) => persona.displayName },
          {
            key: 'toneOfVoice',
            header: 'Tone',
            render: (persona: Persona) => (
              <span className="inline-flex items-center rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-medium text-purple-700 capitalize">
                {persona.toneOfVoice}
              </span>
            ),
          },
          {
            key: 'targetPlatforms',
            header: 'Platforms',
            render: (persona: Persona) => (
              <span className="text-ink-1">
                {persona.targetPlatforms.join(', ')}
              </span>
            ),
          },
          {
            key: 'expertise',
            header: 'Expertise',
            render: (persona: Persona) => (
              <span className="block max-w-xs truncate text-ink-1">
                {persona.expertise.join(', ') || '\u2014'}
              </span>
            ),
          },
          {
            key: 'createdAt',
            header: 'Created',
            render: (persona: Persona) => new Date(persona.createdAt).toLocaleString(),
          },
        ]}
        data={personas}
        keyExtractor={(persona) => String(persona.id)}
        emptyMessage="No personas found"
      />

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Create Persona">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Name</label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. crypto_minh"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Display Name</label>
            <input
              type="text"
              value={formDisplayName}
              onChange={(e) => setFormDisplayName(e.target.value)}
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. Crypto Minh"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Bio</label>
            <textarea
              value={formBio}
              onChange={(e) => setFormBio(e.target.value)}
              required
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Describe this persona..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Expertise (comma-separated)</label>
            <input
              type="text"
              value={formExpertise}
              onChange={(e) => setFormExpertise(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="e.g. DeFi, NFT, Bitcoin"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Tone of Voice</label>
            <select
              value={formToneOfVoice}
              onChange={(e) => setFormToneOfVoice(e.target.value as ToneOfVoice)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {ALL_TONES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Target Platforms</label>
            <div className="flex gap-4">
              {ALL_PLATFORMS.map((platform) => (
                <label key={platform} className="inline-flex items-center gap-2 text-sm text-ink-1">
                  <input
                    type="checkbox"
                    checked={formTargetPlatforms.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="capitalize">{platform}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">Avatar URL (optional)</label>
            <input
              type="text"
              value={formAvatarUrl}
              onChange={(e) => setFormAvatarUrl(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="https://..."
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
              disabled={saving || !formName || !formDisplayName || !formBio}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating...' : 'Create Persona'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
