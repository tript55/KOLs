import { useCallback, useEffect, useState } from "react";
import {
  PlusIcon,
  PlayIcon,
  PencilIcon,
  TrashIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import Modal from "../components/Modal";
import {
  getPosts,
  getPersonas,
  getTemplates,
  createPost,
  updatePost,
  deletePost,
  processPost,
  generateContent,
} from "../lib/api";
import type { Post, PostStatus, Platform, Persona, Template } from "../types";

const ALL_STATUSES: PostStatus[] = [
  "draft",
  "scheduled",
  "generating",
  "posted",
  "failed",
];
const ALL_PLATFORMS: Platform[] = ["facebook", "twitter", "telegram"];

export default function Posts() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<PostStatus | "">("");
  const [platformFilter, setPlatformFilter] = useState<Platform | "">(
    "facebook",
  );
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [processing, setProcessing] = useState<number | null>(null);

  const [formPlatform, setFormPlatform] = useState<Platform>("facebook");
  const [formStatus, setFormStatus] = useState<PostStatus>("draft");
  const [formPersonaId, setFormPersonaId] = useState("");
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formScheduledAt, setFormScheduledAt] = useState("");
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
      setError(err instanceof Error ? err.message : "Failed to load posts");
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
      setError(err instanceof Error ? err.message : "Failed to process post");
    } finally {
      setProcessing(null);
    }
  }

  function handleEdit(post: Post) {
    setEditingPost(post);
    setFormPlatform(post.platform);
    setFormStatus(post.status);
    setFormPersonaId(String(post.personaId));
    setFormTemplateId(post.templateId ? String(post.templateId) : "");
    setFormContent(post.content ?? "");
    setFormScheduledAt(
      post.scheduledAt
        ? new Date(post.scheduledAt).toISOString().slice(0, 16)
        : "",
    );
    setModalOpen(true);
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await deletePost(id);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    }
  }

  async function handleGenerate() {
    if (!formTemplateId) {
      setError("Please select a template first");
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
        err instanceof Error ? err.message : "Failed to generate content",
      );
    } finally {
      setGenerating(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const postData = {
        platform: formPlatform,
        status: formStatus,
        personaId: Number(formPersonaId),
        templateId: formTemplateId ? Number(formTemplateId) : undefined,
        content: formContent || undefined,
        scheduledAt: formScheduledAt || undefined,
      };

      if (editingPost) {
        await updatePost(editingPost.id, postData);
      } else {
        await createPost(postData);
      }

      setModalOpen(false);
      setEditingPost(null);
      setFormPlatform("facebook");
      setFormStatus("draft");
      setFormPersonaId("");
      setFormTemplateId("");
      setFormContent("");
      setFormScheduledAt("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save post");
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
      <div className="flex items-center justify-center h-64">
        <p className="animate-pulse text-ink-2">Loading posts...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-ink-1">Posts</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4" />
          Schedule New Post
        </button>
      </div>

      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PostStatus | "")}
          className="rounded-lg border border-gray-300 bg-paper-2 px-3 py-2 text-sm text-ink-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {ALL_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={platformFilter}
          onChange={(e) => setPlatformFilter(e.target.value as Platform | "")}
          className="rounded-lg border border-gray-300 bg-paper-2 px-3 py-2 text-sm text-ink-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Platforms</option>
          {ALL_PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      <DataTable
        columns={[
          { key: "id", header: "ID", render: (post: Post) => String(post.id) },
          {
            key: "content",
            header: "Content",
            render: (post: Post) => (
              <span className="block max-w-xs truncate text-ink-1">
                {post.content ?? "\u2014"}
              </span>
            ),
          },
          {
            key: "platform",
            header: "Platform",
            render: (post: Post) => (
              <span className="capitalize">{post.platform}</span>
            ),
          },
          {
            key: "status",
            header: "Status",
            render: (post: Post) => <StatusBadge status={post.status} />,
          },
          {
            key: "scheduledAt",
            header: "Scheduled At",
            render: (post: Post) =>
              post.scheduledAt
                ? new Date(post.scheduledAt).toLocaleString()
                : "\u2014",
          },
          {
            key: "actions",
            header: "Actions",
            render: (post: Post) => (
              <div className="flex gap-1">
                <button
                  onClick={() => handleProcess(post.id)}
                  disabled={processing === post.id}
                  className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50 transition-colors"
                >
                  <PlayIcon className="w-3 h-3" />
                  {processing === post.id ? "Processing..." : "Process now"}
                </button>
                <button
                  onClick={() => handleEdit(post)}
                  className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  <PencilIcon className="w-3 h-3" />
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(post.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
                >
                  <TrashIcon className="w-3 h-3" />
                  Delete
                </button>
              </div>
            ),
          },
        ]}
        data={filtered}
        keyExtractor={(post) => String(post.id)}
        emptyMessage="No posts found"
      />

      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingPost(null);
        }}
        title={editingPost ? "Edit Post" : "Schedule New Post"}
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">
              Platform
            </label>
            <select
              value={formPlatform}
              onChange={(e) => setFormPlatform(e.target.value as Platform)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {ALL_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">
              Status
            </label>
            <select
              value={formStatus}
              onChange={(e) => setFormStatus(e.target.value as PostStatus)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">
              Persona
            </label>
            <select
              value={formPersonaId}
              onChange={(e) => setFormPersonaId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select persona...</option>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.displayName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">
              Template (optional)
            </label>
            <select
              value={formTemplateId}
              onChange={(e) => setFormTemplateId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              <option value="">None</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-sm font-medium text-ink-1">
                Content (optional)
              </label>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || !formTemplateId}
                className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2.5 py-1 text-xs font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50 transition-colors"
              >
                <SparklesIcon className="w-3 h-3" />
                {generating ? "Generating..." : "AI Generate"}
              </button>
            </div>
            <textarea
              value={formContent}
              onChange={(e) => setFormContent(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              placeholder="Leave empty or click AI Generate..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-ink-1 mb-1">
              Scheduled At (optional)
            </label>
            <input
              type="datetime-local"
              value={formScheduledAt}
              onChange={(e) => setFormScheduledAt(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setModalOpen(false);
                setEditingPost(null);
              }}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-ink-1 hover:bg-paper-1 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !formPersonaId}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving
                ? "Saving..."
                : editingPost
                  ? "Update Post"
                  : "Create Post"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
