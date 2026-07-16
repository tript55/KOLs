import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PlayIcon,
  StopIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  SparklesIcon,
  BoltIcon,
} from "@heroicons/react/24/outline";
import StatsCard from "../components/StatsCard";
import DataTable from "../components/DataTable";
import StatusBadge from "../components/StatusBadge";
import {
  createFacebookWorkflow,
  getFacebookWorkflowStatus,
  getPersonas,
  getPosts,
  getTemplates,
  runPostWorkflow,
  startScheduler,
  stopScheduler,
} from "../lib/api";
import type {
  Persona,
  Platform,
  Post,
  SchedulerStatus,
  Template,
  WorkflowStatus,
} from "../types";

const FACEBOOK_PLATFORM: Platform = "facebook";
const QUICK_SLOT_PRESETS = [
  { label: "Morning Pulse", value: "07:15" },
  { label: "Lunch Explainer", value: "12:15" },
  { label: "Evening Recap", value: "20:30" },
] as const;

function toLocalInputValue(date: Date): string {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function createPresetDate(timeValue: string): string {
  const [hours, minutes] = timeValue.split(":").map(Number);
  const candidate = new Date();
  candidate.setSeconds(0, 0);
  candidate.setHours(hours, minutes, 0, 0);

  if (candidate.getTime() <= Date.now()) {
    candidate.setDate(candidate.getDate() + 1);
  }

  return toLocalInputValue(candidate);
}

export default function Scheduler() {
  const [workflow, setWorkflow] = useState<WorkflowStatus | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<
    "start" | "stop" | "schedule" | null
  >(null);
  const [rowActionId, setRowActionId] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<string>("");

  const [formPersonaId, setFormPersonaId] = useState("");
  const [formTemplateId, setFormTemplateId] = useState("");
  const [formScheduledAt, setFormScheduledAt] = useState(
    createPresetDate("07:15"),
  );
  const [formAudienceSegment, setFormAudienceSegment] = useState(
    "vietnamese-investor",
  );
  const [formStrategyKey, setFormStrategyKey] = useState("market_update");
  const [formTargetSlotLabel, setFormTargetSlotLabel] =
    useState("Morning Pulse");

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
        err instanceof Error
          ? err.message
          : "Failed to load workflow operations",
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
      setCountdown("");
      return;
    }

    const nextRunAt = nextRunEstimate;

    function updateCountdown() {
      const diff = new Date(nextRunAt).getTime() - Date.now();

      if (diff <= 0) {
        setCountdown("0s");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      const parts = [];

      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      parts.push(`${seconds}s`);

      setCountdown(parts.join(" "));
    }

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [workflow?.scheduler]);

  const queuePosts = useMemo(
    () =>
      posts
        .filter((post) =>
          ["draft", "scheduled", "generating", "failed"].includes(post.status),
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
    setActionLoading("start");
    try {
      await startScheduler();
      await load(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to start scheduler",
      );
    } finally {
      setActionLoading(null);
    }
  }

  async function handleStop() {
    setActionLoading("stop");
    try {
      await stopScheduler();
      await load(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to stop scheduler");
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSchedule(e: React.FormEvent) {
    e.preventDefault();
    if (!formPersonaId) {
      setError("Select a persona before scheduling");
      return;
    }

    setActionLoading("schedule");
    try {
      await createFacebookWorkflow({
        personaId: Number(formPersonaId),
        templateId: formTemplateId ? Number(formTemplateId) : undefined,
        scheduledAt: new Date(formScheduledAt).toISOString(),
        audienceSegment: formAudienceSegment,
        strategyKey: formStrategyKey,
        targetSlotLabel: formTargetSlotLabel,
        autoRunToSchedule: true,
      });
      await load(true);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create Facebook workflow",
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
      setError(err instanceof Error ? err.message : "Failed to run workflow");
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
      <div className="flex items-center justify-center h-64">
        <p className="animate-pulse text-gray-500">
          Loading Facebook workflow...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Facebook Ops</h2>
          <p className="text-sm text-gray-500">
            AI workflow for research, drafting, compliance, scheduling,
            publishing, and learning.
          </p>
        </div>
        <button
          type="button"
          onClick={() => load(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <ArrowPathIcon
            className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`}
          />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {schedulerStatus && (
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-gray-500">Workflow Scheduler</p>
                <p className="text-2xl font-semibold text-gray-900 mt-1">
                  {schedulerStatus.isRunning ? "Running" : "Stopped"}
                </p>
              </div>
              {schedulerStatus.isRunning ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  <CheckCircleIcon className="w-4 h-4" /> Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-2 rounded-full bg-red-100 px-3 py-1 text-sm font-medium text-red-700">
                  <XCircleIcon className="w-4 h-4" /> Idle
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6">
              <div>
                <p className="text-sm text-gray-500">Cron</p>
                <p className="text-sm font-mono text-gray-900 mt-1 break-all">
                  {schedulerStatus.cronExpression}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Run</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {schedulerStatus.nextRunEstimate
                    ? new Date(schedulerStatus.nextRunEstimate).toLocaleString()
                    : "N/A"}
                </p>
                {countdown && (
                  <p className="text-xs font-mono text-blue-600 mt-1">
                    in {countdown}
                  </p>
                )}
              </div>
              <div>
                <p className="text-sm text-gray-500">Next Facebook Slot</p>
                <p className="text-sm font-semibold text-gray-900 mt-1">
                  {nextPost?.scheduledAt
                    ? new Date(nextPost.scheduledAt).toLocaleString()
                    : "No queued post"}
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-6">
              <button
                type="button"
                onClick={handleStart}
                disabled={schedulerStatus.isRunning || actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <PlayIcon className="w-4 h-4" />
                {actionLoading === "start" ? "Starting..." : "Start"}
              </button>
              <button
                type="button"
                onClick={handleStop}
                disabled={!schedulerStatus.isRunning || actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                <StopIcon className="w-4 h-4" />
                {actionLoading === "stop" ? "Stopping..." : "Stop"}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <SparklesIcon className="w-5 h-5 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">
                Quick Schedule
              </h3>
            </div>

            <div className="flex flex-wrap gap-2 mb-4">
              {QUICK_SLOT_PRESETS.map((slot) => (
                <button
                  key={slot.value}
                  type="button"
                  onClick={() => applyPreset(slot.label, slot.value)}
                  className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100"
                >
                  {slot.label}
                </button>
              ))}
            </div>

            <form onSubmit={handleSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Persona
                </label>
                <select
                  value={formPersonaId}
                  onChange={(e) => setFormPersonaId(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select persona...</option>
                  {personas.map((persona) => (
                    <option key={persona.id} value={persona.id}>
                      {persona.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template
                </label>
                <select
                  value={formTemplateId}
                  onChange={(e) => {
                    const selected = templates.find(
                      (template) => String(template.id) === e.target.value,
                    );
                    setFormTemplateId(e.target.value);
                    if (selected) {
                      setFormStrategyKey(selected.type);
                    }
                  }}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="">Select template...</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Audience Segment
                  </label>
                  <input
                    type="text"
                    value={formAudienceSegment}
                    onChange={(e) => setFormAudienceSegment(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Strategy Key
                  </label>
                  <input
                    type="text"
                    value={formStrategyKey}
                    onChange={(e) => setFormStrategyKey(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Slot Label
                  </label>
                  <input
                    type="text"
                    value={formTargetSlotLabel}
                    onChange={(e) => setFormTargetSlotLabel(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Scheduled At
                  </label>
                  <input
                    type="datetime-local"
                    value={formScheduledAt}
                    onChange={(e) => setFormScheduledAt(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading !== null}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <BoltIcon className="w-4 h-4" />
                {actionLoading === "schedule"
                  ? "Scheduling..."
                  : "Create Facebook Workflow"}
              </button>
            </form>
          </div>
        </div>
      )}

      {workflow && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-4">
          <StatsCard
            label="Total Queue"
            value={workflow.queue.total}
            icon={<ClockIcon className="w-7 h-7" />}
            color="text-slate-600"
          />
          <StatsCard
            label="Scheduled"
            value={workflow.queue.scheduled}
            icon={<ClockIcon className="w-7 h-7" />}
            color="text-blue-600"
          />
          <StatsCard
            label="Generating"
            value={workflow.queue.generating}
            icon={<SparklesIcon className="w-7 h-7" />}
            color="text-yellow-600"
          />
          <StatsCard
            label="Failed"
            value={workflow.queue.failed}
            icon={<XCircleIcon className="w-7 h-7" />}
            color="text-red-600"
          />
          <StatsCard
            label="Overdue"
            value={workflow.queue.overdue}
            icon={<BoltIcon className="w-7 h-7" />}
            color="text-orange-600"
          />
          <StatsCard
            label="Posted Today"
            value={workflow.queue.postedToday}
            icon={<CheckCircleIcon className="w-7 h-7" />}
            color="text-green-600"
          />
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Facebook Queue
            </h3>
            <p className="text-sm text-gray-500">
              Posts moving through research, drafting, compliance, and
              publishing.
            </p>
          </div>
        </div>

        <DataTable
          columns={[
            {
              key: "content",
              header: "Post",
              render: (post: Post) => (
                <div className="max-w-sm whitespace-normal">
                  <p className="font-medium text-gray-900 line-clamp-2">
                    {post.content ??
                      post.metadata?.draftContent ??
                      "Awaiting draft"}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {post.metadata?.strategyKey ?? "facebook-plan"} •{" "}
                    {post.metadata?.audienceSegment ?? "vietnamese-investor"}
                  </p>
                </div>
              ),
            },
            {
              key: "status",
              header: "Status",
              render: (post: Post) => (
                <div className="space-y-1">
                  <StatusBadge status={post.status} />
                  <p className="text-xs text-gray-500 capitalize">
                    {post.workflowStage.replace(/_/g, " ")}
                  </p>
                </div>
              ),
            },
            {
              key: "scheduledAt",
              header: "Scheduled",
              render: (post: Post) => (
                <div>
                  <p>
                    {post.scheduledAt
                      ? new Date(post.scheduledAt).toLocaleString()
                      : "Not set"}
                  </p>
                  <p className="text-xs text-gray-500">
                    Attempts: {post.workflowAttempts}
                  </p>
                </div>
              ),
            },
            {
              key: "feedback",
              header: "Feedback",
              render: (post: Post) => {
                const feedback = post.metadata?.feedback;
                return feedback ? (
                  <div className="text-xs text-gray-600 whitespace-normal">
                    <p>Likes: {feedback.likes}</p>
                    <p>Comments: {feedback.comments}</p>
                    <p>Shares: {feedback.shares}</p>
                  </div>
                ) : (
                  <span className="text-gray-400">No feedback yet</span>
                );
              },
            },
            {
              key: "actions",
              header: "Actions",
              render: (post: Post) => (
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleRunWorkflow(post.id)}
                    disabled={rowActionId === post.id}
                    className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100 disabled:opacity-50"
                  >
                    <PlayIcon className="w-3 h-3" />
                    {rowActionId === post.id ? "Running..." : "Advance"}
                  </button>
                </div>
              ),
            },
          ]}
          data={queuePosts}
          keyExtractor={(post) => String(post.id)}
          emptyMessage="No Facebook posts in workflow queue"
        />
      </div>
    </div>
  );
}
