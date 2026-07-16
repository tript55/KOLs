import { getDatabase } from "../db/database.js";
import type {
  KOLPersona,
  ContentTemplate,
  ScheduledPost,
  AnalyticsEvent,
  DashboardStats,
  PostAnalyticsGroup,
  RecentPostWithAnalytics,
  PostStatusBreakdown,
  EngagementByType,
  WorkflowStage,
  WorkflowQueueSummary,
} from "../types/index.js";

// === Persona Repository ===
export function getPersona(id: number): KOLPersona | undefined {
  const row = getDatabase()
    .prepare("SELECT * FROM personas WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return deserializePersona(row);
}

export function getPersonaByName(name: string): KOLPersona | undefined {
  const row = getDatabase()
    .prepare("SELECT * FROM personas WHERE name = ?")
    .get(name) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return deserializePersona(row);
}

export function listPersonas(): KOLPersona[] {
  const rows = getDatabase()
    .prepare("SELECT * FROM personas ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(deserializePersona);
}

export function createPersona(
  data: Omit<KOLPersona, "id" | "createdAt" | "updatedAt">,
): KOLPersona {
  const stmt = getDatabase().prepare(`
    INSERT INTO personas (name, display_name, bio, expertise, tone_of_voice, target_platforms, language, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.name,
    data.displayName,
    data.bio,
    JSON.stringify(data.expertise),
    data.toneOfVoice,
    JSON.stringify(data.targetPlatforms),
    data.language,
    data.avatarUrl ?? null,
  );
  return getPersona(Number(result.lastInsertRowid))!;
}

// === Content Template Repository ===
export function getTemplate(id: number): ContentTemplate | undefined {
  const row = getDatabase()
    .prepare("SELECT * FROM content_templates WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return deserializeTemplate(row);
}

export function listTemplates(personaId?: number): ContentTemplate[] {
  if (personaId) {
    const rows = getDatabase()
      .prepare(
        "SELECT * FROM content_templates WHERE persona_id = ? ORDER BY created_at DESC",
      )
      .all(personaId) as Record<string, unknown>[];
    return rows.map(deserializeTemplate);
  }
  const rows = getDatabase()
    .prepare("SELECT * FROM content_templates ORDER BY created_at DESC")
    .all() as Record<string, unknown>[];
  return rows.map(deserializeTemplate);
}

export function createTemplate(
  data: Omit<ContentTemplate, "id" | "createdAt" | "updatedAt">,
): ContentTemplate {
  const stmt = getDatabase().prepare(`
    INSERT INTO content_templates (persona_id, name, type, platform, system_prompt, user_prompt_template, max_tokens, temperature, hashtags)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.personaId,
    data.name,
    data.type,
    data.platform,
    data.systemPrompt,
    data.userPromptTemplate,
    data.maxTokens,
    data.temperature,
    JSON.stringify(data.hashtags),
  );
  return getTemplate(Number(result.lastInsertRowid))!;
}

// === Scheduled Post Repository ===
export function getScheduledPost(id: number): ScheduledPost | undefined {
  const row = getDatabase()
    .prepare("SELECT * FROM scheduled_posts WHERE id = ?")
    .get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return deserializePost(row);
}

export function listScheduledPosts(filter?: {
  status?: string;
  personaId?: number;
}): ScheduledPost[] {
  let sql = "SELECT * FROM scheduled_posts WHERE 1=1";
  const params: unknown[] = [];
  if (filter?.status) {
    sql += " AND status = ?";
    params.push(filter.status);
  }
  if (filter?.personaId) {
    sql += " AND persona_id = ?";
    params.push(filter.personaId);
  }
  sql += " ORDER BY scheduled_at ASC";
  const rows = getDatabase()
    .prepare(sql)
    .all(...params) as Record<string, unknown>[];
  return rows.map(deserializePost);
}

export function createScheduledPost(
  data: Omit<ScheduledPost, "id" | "postedAt" | "createdAt" | "updatedAt">,
): ScheduledPost {
  const stmt = getDatabase().prepare(`
    INSERT INTO scheduled_posts (template_id, persona_id, platform, status, content, scheduled_at, workflow_stage, workflow_attempts, external_post_id, last_error, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.templateId ?? null,
    data.personaId,
    data.platform,
    data.status,
    data.content ?? null,
    data.scheduledAt ?? null,
    data.workflowStage,
    data.workflowAttempts,
    data.externalPostId ?? null,
    data.lastError ?? null,
    data.metadata ? JSON.stringify(data.metadata) : null,
  );
  return getScheduledPost(Number(result.lastInsertRowid))!;
}

export function updatePostStatus(
  id: number,
  status: string,
  content?: string,
): void {
  if (content) {
    getDatabase()
      .prepare(
        "UPDATE scheduled_posts SET status = ?, content = ?, posted_at = datetime('now'), updated_at = datetime('now') WHERE id = ?",
      )
      .run(status, content, id);
  } else {
    getDatabase()
      .prepare(
        "UPDATE scheduled_posts SET status = ?, updated_at = datetime('now') WHERE id = ?",
      )
      .run(status, id);
  }
}

export function updateScheduledPost(
  id: number,
  data: Partial<Omit<ScheduledPost, "id" | "createdAt" | "updatedAt">>,
): ScheduledPost | undefined {
  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.templateId !== undefined) {
    updates.push("template_id = ?");
    params.push(data.templateId);
  }
  if (data.personaId !== undefined) {
    updates.push("persona_id = ?");
    params.push(data.personaId);
  }
  if (data.platform !== undefined) {
    updates.push("platform = ?");
    params.push(data.platform);
  }
  if (data.status !== undefined) {
    updates.push("status = ?");
    params.push(data.status);
  }
  if (data.content !== undefined) {
    updates.push("content = ?");
    params.push(data.content);
  }
  if (data.scheduledAt !== undefined) {
    updates.push("scheduled_at = ?");
    params.push(data.scheduledAt);
  }
  if (data.workflowStage !== undefined) {
    updates.push("workflow_stage = ?");
    params.push(data.workflowStage);
  }
  if (data.workflowAttempts !== undefined) {
    updates.push("workflow_attempts = ?");
    params.push(data.workflowAttempts);
  }
  if (data.externalPostId !== undefined) {
    updates.push("external_post_id = ?");
    params.push(data.externalPostId);
  }
  if (data.lastError !== undefined) {
    updates.push("last_error = ?");
    params.push(data.lastError);
  }
  if (data.metadata !== undefined) {
    updates.push("metadata = ?");
    params.push(data.metadata ? JSON.stringify(data.metadata) : null);
  }

  if (updates.length === 0) return getScheduledPost(id);

  updates.push("updated_at = datetime('now')");
  params.push(id);

  getDatabase()
    .prepare(`UPDATE scheduled_posts SET ${updates.join(", ")} WHERE id = ?`)
    .run(...params);
  return getScheduledPost(id);
}

export function deleteScheduledPost(id: number): boolean {
  const result = getDatabase()
    .prepare("DELETE FROM scheduled_posts WHERE id = ?")
    .run(id);
  return result.changes > 0;
}

export function getDueWorkflowPosts(now: string): ScheduledPost[] {
  const rows = getDatabase()
    .prepare(
      `
    SELECT *
    FROM scheduled_posts
    WHERE platform = 'facebook'
      AND (
        (status IN ('scheduled', 'generating') AND scheduled_at IS NOT NULL AND scheduled_at <= ?)
        OR (status = 'posted' AND workflow_stage IN ('feedback', 'learning'))
      )
    ORDER BY scheduled_at ASC, created_at ASC
  `,
    )
    .all(now) as Record<string, unknown>[];

  return rows.map(deserializePost);
}

export function updateWorkflowState(
  id: number,
  patch: {
    status?: ScheduledPost["status"];
    content?: string | null;
    scheduledAt?: string | null;
    workflowStage?: WorkflowStage;
    workflowAttempts?: number;
    externalPostId?: string | null;
    lastError?: string | null;
    metadata?: ScheduledPost["metadata"];
    postedAt?: string | null;
  },
): ScheduledPost | undefined {
  const updates: string[] = [];
  const params: unknown[] = [];

  if (patch.status !== undefined) {
    updates.push("status = ?");
    params.push(patch.status);
  }
  if (patch.content !== undefined) {
    updates.push("content = ?");
    params.push(patch.content);
  }
  if (patch.scheduledAt !== undefined) {
    updates.push("scheduled_at = ?");
    params.push(patch.scheduledAt);
  }
  if (patch.workflowStage !== undefined) {
    updates.push("workflow_stage = ?");
    params.push(patch.workflowStage);
  }
  if (patch.workflowAttempts !== undefined) {
    updates.push("workflow_attempts = ?");
    params.push(patch.workflowAttempts);
  }
  if (patch.externalPostId !== undefined) {
    updates.push("external_post_id = ?");
    params.push(patch.externalPostId);
  }
  if (patch.lastError !== undefined) {
    updates.push("last_error = ?");
    params.push(patch.lastError);
  }
  if (patch.metadata !== undefined) {
    updates.push("metadata = ?");
    params.push(patch.metadata ? JSON.stringify(patch.metadata) : null);
  }
  if (patch.postedAt !== undefined) {
    updates.push("posted_at = ?");
    params.push(patch.postedAt);
  }

  if (updates.length === 0) return getScheduledPost(id);

  updates.push("updated_at = datetime('now')");
  params.push(id);

  getDatabase()
    .prepare(`UPDATE scheduled_posts SET ${updates.join(", ")} WHERE id = ?`)
    .run(...params);
  return getScheduledPost(id);
}

export function getWorkflowQueueSummary(now: string): WorkflowQueueSummary {
  const db = getDatabase();
  const baseQuery = `FROM scheduled_posts WHERE platform = 'facebook'`;

  const total = (
    db.prepare(`SELECT COUNT(*) AS c ${baseQuery}`).get() as { c: number }
  ).c;
  const scheduled = (
    db
      .prepare(`SELECT COUNT(*) AS c ${baseQuery} AND status = 'scheduled'`)
      .get() as { c: number }
  ).c;
  const generating = (
    db
      .prepare(`SELECT COUNT(*) AS c ${baseQuery} AND status = 'generating'`)
      .get() as { c: number }
  ).c;
  const failed = (
    db
      .prepare(`SELECT COUNT(*) AS c ${baseQuery} AND status = 'failed'`)
      .get() as { c: number }
  ).c;
  const overdue = (
    db
      .prepare(
        `SELECT COUNT(*) AS c ${baseQuery} AND status IN ('scheduled', 'generating') AND scheduled_at IS NOT NULL AND scheduled_at <= ?`,
      )
      .get(now) as { c: number }
  ).c;
  const postedToday = (
    db
      .prepare(
        `SELECT COUNT(*) AS c ${baseQuery} AND status = 'posted' AND date(posted_at) = date('now')`,
      )
      .get() as { c: number }
  ).c;

  return { total, scheduled, generating, failed, overdue, postedToday };
}

// === Analytics Repository ===
export function recordAnalytics(
  data: Omit<AnalyticsEvent, "id">,
): AnalyticsEvent {
  const stmt = getDatabase().prepare(`
    INSERT INTO analytics_events (post_id, platform, event_type, count, recorded_at)
    VALUES (?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.postId,
    data.platform,
    data.eventType,
    data.count,
    data.recordedAt,
  );
  const row = getDatabase()
    .prepare("SELECT * FROM analytics_events WHERE id = ?")
    .get(Number(result.lastInsertRowid)) as Record<string, unknown>;
  return deserializeAnalytics(row);
}

// === Dashboard Stats Repository ===
export function getDashboardStats(): DashboardStats {
  const db = getDatabase();

  const totalPostsRow = db
    .prepare("SELECT COUNT(*) AS c FROM scheduled_posts")
    .get() as { c: number };
  const totalPosts = totalPostsRow.c;

  const statusRows = db
    .prepare(
      "SELECT status, COUNT(*) AS c FROM scheduled_posts GROUP BY status",
    )
    .all() as Array<{ status: string; c: number }>;
  const postsByStatus: PostStatusBreakdown = {
    draft: 0,
    scheduled: 0,
    generating: 0,
    posted: 0,
    failed: 0,
  };
  for (const row of statusRows) {
    if (row.status in postsByStatus) {
      postsByStatus[row.status as keyof PostStatusBreakdown] = row.c;
    }
  }

  const postsTodayRow = db
    .prepare(
      "SELECT COUNT(*) AS c FROM scheduled_posts WHERE date(created_at) = date('now')",
    )
    .get() as { c: number };
  const postsToday = postsTodayRow.c;

  const engagementRows = db
    .prepare(
      "SELECT event_type, COALESCE(SUM(count), 0) AS s FROM analytics_events GROUP BY event_type",
    )
    .all() as Array<{ event_type: string; s: number }>;
  const engagementByType: EngagementByType = {
    impression: 0,
    like: 0,
    comment: 0,
    share: 0,
    retweet: 0,
    click: 0,
  };
  let totalEngagement = 0;
  for (const row of engagementRows) {
    if (row.event_type in engagementByType) {
      engagementByType[row.event_type as keyof EngagementByType] = row.s;
    }
    totalEngagement += row.s;
  }

  const personasRow = db
    .prepare("SELECT COUNT(*) AS c FROM personas")
    .get() as { c: number };
  const templatesRow = db
    .prepare("SELECT COUNT(*) AS c FROM content_templates")
    .get() as { c: number };

  return {
    totalPosts,
    postsByStatus,
    postsToday,
    totalEngagement,
    engagementByType,
    totalPersonas: personasRow.c,
    totalTemplates: templatesRow.c,
  };
}

// === Analytics By Post Repository ===
export function getAnalyticsByPost(postId?: number): PostAnalyticsGroup[] {
  const db = getDatabase();
  const where = postId !== undefined ? "WHERE ae.post_id = ?" : "";
  const params: unknown[] = postId !== undefined ? [postId] : [];

  const rows = db
    .prepare(
      `
    SELECT ae.post_id, ae.platform, ae.event_type, COALESCE(SUM(ae.count), 0) AS total
    FROM analytics_events ae
    ${where}
    GROUP BY ae.post_id, ae.platform, ae.event_type
    ORDER BY ae.post_id DESC, ae.platform ASC
  `,
    )
    .all(...params) as Array<{
    post_id: number;
    platform: string;
    event_type: string;
    total: number;
  }>;

  const grouped = new Map<string, PostAnalyticsGroup>();
  for (const row of rows) {
    const key = `${row.post_id}::${row.platform}`;
    let group = grouped.get(key);
    if (!group) {
      group = {
        postId: row.post_id,
        platform: row.platform as PostAnalyticsGroup["platform"],
        totalCount: 0,
        byEventType: {
          impression: 0,
          like: 0,
          comment: 0,
          share: 0,
          retweet: 0,
          click: 0,
        },
      };
      grouped.set(key, group);
    }
    if (row.event_type in group.byEventType) {
      group.byEventType[row.event_type as keyof EngagementByType] = row.total;
    }
    group.totalCount += row.total;
  }

  return Array.from(grouped.values());
}

// === Recent Posts With Analytics ===
export function getRecentPosts(limit?: number): RecentPostWithAnalytics[] {
  const safeLimit = limit && limit > 0 ? limit : 10;
  const db = getDatabase();

  const postRows = db
    .prepare("SELECT * FROM scheduled_posts ORDER BY created_at DESC LIMIT ?")
    .all(safeLimit) as Record<string, unknown>[];

  const posts = postRows.map(deserializePost);

  if (posts.length === 0) return [];

  const placeholders = posts.map(() => "?").join(",");
  const analyticsRows = db
    .prepare(
      `
    SELECT post_id, event_type, COALESCE(SUM(count), 0) AS total
    FROM analytics_events
    WHERE post_id IN (${placeholders})
    GROUP BY post_id, event_type
  `,
    )
    .all(...posts.map((p) => p.id)) as Array<{
    post_id: number;
    event_type: string;
    total: number;
  }>;

  const analyticsByPost = new Map<
    number,
    {
      byEventType: EngagementByType;
      total: number;
      platform: PostAnalyticsGroup["platform"] | null;
    }
  >();
  for (const row of analyticsRows) {
    let entry = analyticsByPost.get(row.post_id);
    if (!entry) {
      entry = {
        byEventType: {
          impression: 0,
          like: 0,
          comment: 0,
          share: 0,
          retweet: 0,
          click: 0,
        },
        total: 0,
        platform: null,
      };
      analyticsByPost.set(row.post_id, entry);
    }
    if (row.event_type in entry.byEventType) {
      entry.byEventType[row.event_type as keyof EngagementByType] = row.total;
    }
    entry.total += row.total;
  }

  // Determine platform per post from the post's own column (not analytics_events to avoid duplication)
  return posts.map((post) => {
    const entry = analyticsByPost.get(post.id);
    return {
      ...post,
      analytics: entry
        ? {
            postId: post.id,
            platform: post.platform,
            totalCount: entry.total,
            byEventType: entry.byEventType,
          }
        : null,
    };
  });
}

// === Deserializers (json fields from DB) ===
function deserializePersona(row: Record<string, unknown>): KOLPersona {
  return {
    id: row.id as number,
    name: row.name as string,
    displayName: row.display_name as string,
    bio: row.bio as string,
    expertise: JSON.parse(row.expertise as string),
    toneOfVoice: row.tone_of_voice as KOLPersona["toneOfVoice"],
    targetPlatforms: JSON.parse(row.target_platforms as string),
    language: row.language as "vi",
    avatarUrl: row.avatar_url as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function deserializeTemplate(row: Record<string, unknown>): ContentTemplate {
  return {
    id: row.id as number,
    personaId: row.persona_id as number,
    name: row.name as string,
    type: row.type as ContentTemplate["type"],
    platform: row.platform as ContentTemplate["platform"],
    systemPrompt: row.system_prompt as string,
    userPromptTemplate: row.user_prompt_template as string,
    maxTokens: row.max_tokens as number,
    temperature: row.temperature as number,
    hashtags: JSON.parse(row.hashtags as string),
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function deserializePost(row: Record<string, unknown>): ScheduledPost {
  return {
    id: row.id as number,
    templateId: row.template_id as number | null,
    personaId: row.persona_id as number,
    platform: row.platform as ScheduledPost["platform"],
    status: row.status as ScheduledPost["status"],
    content: row.content as string | null,
    scheduledAt: row.scheduled_at as string,
    postedAt: row.posted_at as string | null,
    workflowStage:
      (row.workflow_stage as ScheduledPost["workflowStage"] | undefined) ??
      "research",
    workflowAttempts: (row.workflow_attempts as number | undefined) ?? 0,
    externalPostId: (row.external_post_id as string | null | undefined) ?? null,
    lastError: (row.last_error as string | null | undefined) ?? null,
    metadata: row.metadata ? JSON.parse(row.metadata as string) : null,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

function deserializeAnalytics(row: Record<string, unknown>): AnalyticsEvent {
  return {
    id: row.id as number,
    postId: row.post_id as number,
    platform: row.platform as AnalyticsEvent["platform"],
    eventType: row.event_type as AnalyticsEvent["eventType"],
    count: row.count as number,
    recordedAt: row.recorded_at as string,
  };
}
