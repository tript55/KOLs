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
export async function getPersona(id: number): Promise<KOLPersona | undefined> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM personas WHERE id = ${id}`;
  if (rows.length === 0) return undefined;
  return deserializePersona(rows[0]!);
}

export async function getPersonaByName(name: string): Promise<KOLPersona | undefined> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM personas WHERE name = ${name}`;
  if (rows.length === 0) return undefined;
  return deserializePersona(rows[0]!);
}

export async function listPersonas(): Promise<KOLPersona[]> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM personas ORDER BY created_at DESC`;
  return rows.map(deserializePersona);
}

export async function createPersona(
  data: Omit<KOLPersona, "id" | "createdAt" | "updatedAt">,
): Promise<KOLPersona> {
  const db = getDatabase();
  const rows = await db`
    INSERT INTO personas (name, display_name, bio, expertise, tone_of_voice, target_platforms, language, avatar_url)
    VALUES (${data.name}, ${data.displayName}, ${data.bio}, ${JSON.stringify(data.expertise)}, ${data.toneOfVoice}, ${JSON.stringify(data.targetPlatforms)}, ${data.language}, ${data.avatarUrl ?? null})
    RETURNING id
  `;
  return (await getPersona(rows[0]!.id))!;
}

export async function updatePersona(
  id: number,
  data: Partial<Omit<KOLPersona, "id" | "createdAt" | "updatedAt">>,
): Promise<KOLPersona | undefined> {
  const db = getDatabase();
  const updates: Record<string, any> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.displayName !== undefined) updates.display_name = data.displayName;
  if (data.bio !== undefined) updates.bio = data.bio;
  if (data.expertise !== undefined) updates.expertise = JSON.stringify(data.expertise);
  if (data.toneOfVoice !== undefined) updates.tone_of_voice = data.toneOfVoice;
  if (data.targetPlatforms !== undefined) updates.target_platforms = JSON.stringify(data.targetPlatforms);
  if (data.language !== undefined) updates.language = data.language;
  if (data.avatarUrl !== undefined) updates.avatar_url = data.avatarUrl;

  if (Object.keys(updates).length === 0) return getPersona(id);

  updates.updated_at = db`CURRENT_TIMESTAMP`;

  await db`UPDATE personas SET ${db(updates)} WHERE id = ${id}`;
  return getPersona(id);
}

export async function deletePersona(id: number): Promise<boolean> {
  const db = getDatabase();
  const result = await db`DELETE FROM personas WHERE id = ${id}`;
  return result.count > 0;
}

// === Content Template Repository ===
export async function getTemplate(id: number): Promise<ContentTemplate | undefined> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM content_templates WHERE id = ${id}`;
  if (rows.length === 0) return undefined;
  return deserializeTemplate(rows[0]!);
}

export async function listTemplates(personaId?: number): Promise<ContentTemplate[]> {
  const db = getDatabase();
  if (personaId) {
    const rows = await db`SELECT * FROM content_templates WHERE persona_id = ${personaId} ORDER BY created_at DESC`;
    return rows.map(deserializeTemplate);
  }
  const rows = await db`SELECT * FROM content_templates ORDER BY created_at DESC`;
  return rows.map(deserializeTemplate);
}

export async function createTemplate(
  data: Omit<ContentTemplate, "id" | "createdAt" | "updatedAt">,
): Promise<ContentTemplate> {
  const db = getDatabase();
  const rows = await db`
    INSERT INTO content_templates (persona_id, name, type, platform, system_prompt, user_prompt_template, max_tokens, temperature, hashtags)
    VALUES (${data.personaId}, ${data.name}, ${data.type}, ${data.platform}, ${data.systemPrompt}, ${data.userPromptTemplate}, ${data.maxTokens}, ${data.temperature}, ${JSON.stringify(data.hashtags)})
    RETURNING id
  `;
  return (await getTemplate(rows[0]!.id))!;
}

export async function updateTemplate(
  id: number,
  data: Partial<Omit<ContentTemplate, "id" | "createdAt" | "updatedAt">>,
): Promise<ContentTemplate | undefined> {
  const db = getDatabase();
  const updates: Record<string, any> = {};

  if (data.name !== undefined) updates.name = data.name;
  if (data.type !== undefined) updates.type = data.type;
  if (data.platform !== undefined) updates.platform = data.platform;
  if (data.systemPrompt !== undefined) updates.system_prompt = data.systemPrompt;
  if (data.userPromptTemplate !== undefined) updates.user_prompt_template = data.userPromptTemplate;
  if (data.maxTokens !== undefined) updates.max_tokens = data.maxTokens;
  if (data.temperature !== undefined) updates.temperature = data.temperature;
  if (data.personaId !== undefined) updates.persona_id = data.personaId;
  if (data.hashtags !== undefined) updates.hashtags = JSON.stringify(data.hashtags);

  if (Object.keys(updates).length === 0) return getTemplate(id);

  updates.updated_at = db`CURRENT_TIMESTAMP`;

  await db`UPDATE content_templates SET ${db(updates)} WHERE id = ${id}`;
  return getTemplate(id);
}

export async function deleteTemplate(id: number): Promise<boolean> {
  const db = getDatabase();
  const result = await db`DELETE FROM content_templates WHERE id = ${id}`;
  return result.count > 0;
}

// === Scheduled Post Repository ===
export async function getScheduledPost(id: number): Promise<ScheduledPost | undefined> {
  const db = getDatabase();
  const rows = await db`SELECT * FROM scheduled_posts WHERE id = ${id}`;
  if (rows.length === 0) return undefined;
  return deserializePost(rows[0]!);
}

export async function listScheduledPosts(filter?: {
  status?: string;
  personaId?: number;
}): Promise<ScheduledPost[]> {
  const db = getDatabase();
  
  if (filter?.status && filter?.personaId) {
    const rows = await db`SELECT * FROM scheduled_posts WHERE status = ${filter.status} AND persona_id = ${filter.personaId} ORDER BY scheduled_at ASC`;
    return rows.map(deserializePost);
  } else if (filter?.status) {
    const rows = await db`SELECT * FROM scheduled_posts WHERE status = ${filter.status} ORDER BY scheduled_at ASC`;
    return rows.map(deserializePost);
  } else if (filter?.personaId) {
    const rows = await db`SELECT * FROM scheduled_posts WHERE persona_id = ${filter.personaId} ORDER BY scheduled_at ASC`;
    return rows.map(deserializePost);
  } else {
    const rows = await db`SELECT * FROM scheduled_posts ORDER BY scheduled_at ASC`;
    return rows.map(deserializePost);
  }
}

export async function createScheduledPost(
  data: Omit<ScheduledPost, "id" | "postedAt" | "createdAt" | "updatedAt">,
): Promise<ScheduledPost> {
  const db = getDatabase();
  const rows = await db`
    INSERT INTO scheduled_posts (template_id, persona_id, platform, status, content, scheduled_at, workflow_stage, workflow_attempts, external_post_id, last_error, metadata)
    VALUES (${data.templateId ?? null}, ${data.personaId}, ${data.platform}, ${data.status}, ${data.content ?? null}, ${data.scheduledAt ?? null}, ${data.workflowStage}, ${data.workflowAttempts}, ${data.externalPostId ?? null}, ${data.lastError ?? null}, ${data.metadata ? JSON.stringify(data.metadata) : null})
    RETURNING id
  `;
  return (await getScheduledPost(rows[0]!.id))!;
}

export async function updatePostStatus(
  id: number,
  status: string,
  content?: string,
): Promise<void> {
  const db = getDatabase();
  if (content) {
    await db`UPDATE scheduled_posts SET status = ${status}, content = ${content}, posted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
  } else {
    await db`UPDATE scheduled_posts SET status = ${status}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
  }
}

export async function updateScheduledPost(
  id: number,
  data: Partial<Omit<ScheduledPost, "id" | "createdAt" | "updatedAt">>,
): Promise<ScheduledPost | undefined> {
  const db = getDatabase();
  const updates: Record<string, any> = {};

  if (data.templateId !== undefined) updates.template_id = data.templateId;
  if (data.personaId !== undefined) updates.persona_id = data.personaId;
  if (data.platform !== undefined) updates.platform = data.platform;
  if (data.status !== undefined) updates.status = data.status;
  if (data.content !== undefined) updates.content = data.content;
  if (data.scheduledAt !== undefined) updates.scheduled_at = data.scheduledAt;
  if (data.workflowStage !== undefined) updates.workflow_stage = data.workflowStage;
  if (data.workflowAttempts !== undefined) updates.workflow_attempts = data.workflowAttempts;
  if (data.externalPostId !== undefined) updates.external_post_id = data.externalPostId;
  if (data.lastError !== undefined) updates.last_error = data.lastError;
  if (data.metadata !== undefined) updates.metadata = data.metadata ? JSON.stringify(data.metadata) : null;

  if (Object.keys(updates).length === 0) return getScheduledPost(id);

  updates.updated_at = db`CURRENT_TIMESTAMP`;

  await db`UPDATE scheduled_posts SET ${db(updates)} WHERE id = ${id}`;
  return getScheduledPost(id);
}

export async function deleteScheduledPost(id: number): Promise<boolean> {
  const db = getDatabase();
  const result = await db`DELETE FROM scheduled_posts WHERE id = ${id}`;
  return result.count > 0;
}

export async function getDueWorkflowPosts(now: string): Promise<ScheduledPost[]> {
  const db = getDatabase();
  const rows = await db`
    SELECT *
    FROM scheduled_posts
    WHERE platform = 'facebook'
      AND (
        (status IN ('scheduled', 'generating') AND scheduled_at IS NOT NULL AND scheduled_at <= ${now})
        OR (status = 'posted' AND workflow_stage IN ('feedback', 'learning'))
      )
    ORDER BY scheduled_at ASC, created_at ASC
  `;
  return rows.map(deserializePost);
}

export async function updateWorkflowState(
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
): Promise<ScheduledPost | undefined> {
  const db = getDatabase();
  const updates: Record<string, any> = {};

  if (patch.status !== undefined) updates.status = patch.status;
  if (patch.content !== undefined) updates.content = patch.content;
  if (patch.scheduledAt !== undefined) updates.scheduled_at = patch.scheduledAt;
  if (patch.workflowStage !== undefined) updates.workflow_stage = patch.workflowStage;
  if (patch.workflowAttempts !== undefined) updates.workflow_attempts = patch.workflowAttempts;
  if (patch.externalPostId !== undefined) updates.external_post_id = patch.externalPostId;
  if (patch.lastError !== undefined) updates.last_error = patch.lastError;
  if (patch.metadata !== undefined) updates.metadata = patch.metadata ? JSON.stringify(patch.metadata) : null;
  if (patch.postedAt !== undefined) updates.posted_at = patch.postedAt;

  if (Object.keys(updates).length === 0) return getScheduledPost(id);

  updates.updated_at = db`CURRENT_TIMESTAMP`;

  await db`UPDATE scheduled_posts SET ${db(updates)} WHERE id = ${id}`;
  return getScheduledPost(id);
}

export async function getWorkflowQueueSummary(now: string): Promise<WorkflowQueueSummary> {
  const db = getDatabase();
  const [r1, r2, r3, r4, r5, r6] = await Promise.all([
    db`SELECT COUNT(*)::int AS total FROM scheduled_posts WHERE platform = 'facebook'`,
    db`SELECT COUNT(*)::int AS scheduled FROM scheduled_posts WHERE platform = 'facebook' AND status = 'scheduled'`,
    db`SELECT COUNT(*)::int AS generating FROM scheduled_posts WHERE platform = 'facebook' AND status = 'generating'`,
    db`SELECT COUNT(*)::int AS failed FROM scheduled_posts WHERE platform = 'facebook' AND status = 'failed'`,
    db`SELECT COUNT(*)::int AS overdue FROM scheduled_posts WHERE platform = 'facebook' AND status IN ('scheduled', 'generating') AND scheduled_at IS NOT NULL AND scheduled_at <= ${now}`,
    db`SELECT COUNT(*)::int AS "postedToday" FROM scheduled_posts WHERE platform = 'facebook' AND status = 'posted' AND DATE(posted_at) = CURRENT_DATE`
  ]);

  return { total: r1[0]!.total, scheduled: r2[0]!.scheduled, generating: r3[0]!.generating, failed: r4[0]!.failed, overdue: r5[0]!.overdue, postedToday: r6[0]!.postedToday };
}

// === Analytics Repository ===
export async function recordAnalytics(
  data: Omit<AnalyticsEvent, "id">,
): Promise<AnalyticsEvent> {
  const db = getDatabase();
  const rows = await db`
    INSERT INTO analytics_events (post_id, platform, event_type, count, recorded_at)
    VALUES (${data.postId}, ${data.platform}, ${data.eventType}, ${data.count}, ${data.recordedAt})
    RETURNING id
  `;
  const eventRows = await db`SELECT * FROM analytics_events WHERE id = ${rows[0]!.id}`;
  return deserializeAnalytics(eventRows[0]!);
}

// === Dashboard Stats Repository ===
export async function getDashboardStats(): Promise<DashboardStats> {
  const db = getDatabase();

  const r7 = await db`SELECT COUNT(*)::int AS c FROM scheduled_posts`; const totalPosts = r7[0]!.c;
  const statusRows = await db`SELECT status, COUNT(*)::int AS c FROM scheduled_posts GROUP BY status`;
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

  const r8 = await db`SELECT COUNT(*)::int AS c FROM scheduled_posts WHERE DATE(created_at) = CURRENT_DATE`; const postsToday = r8[0]!.c;

  const engagementRows = await db`SELECT event_type, COALESCE(SUM(count), 0)::int AS s FROM analytics_events GROUP BY event_type`;
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

  const r9 = await db`SELECT COUNT(*)::int AS c FROM personas`; const totalPersonas = r9[0]!.c;
  const r10 = await db`SELECT COUNT(*)::int AS c FROM content_templates`; const totalTemplates = r10[0]!.c;

  return {
    totalPosts,
    postsByStatus,
    postsToday,
    totalEngagement,
    engagementByType,
    totalPersonas,
    totalTemplates,
  };
}

// === Analytics By Post Repository ===
export async function getAnalyticsByPost(postId?: number): Promise<PostAnalyticsGroup[]> {
  const db = getDatabase();
  
  let rows;
  if (postId !== undefined) {
    rows = await db`
      SELECT ae.post_id, ae.platform, ae.event_type, COALESCE(SUM(ae.count), 0)::int AS total
      FROM analytics_events ae
      WHERE ae.post_id = ${postId}
      GROUP BY ae.post_id, ae.platform, ae.event_type
      ORDER BY ae.post_id DESC, ae.platform ASC
    `;
  } else {
    rows = await db`
      SELECT ae.post_id, ae.platform, ae.event_type, COALESCE(SUM(ae.count), 0)::int AS total
      FROM analytics_events ae
      GROUP BY ae.post_id, ae.platform, ae.event_type
      ORDER BY ae.post_id DESC, ae.platform ASC
    `;
  }

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
export async function getRecentPosts(limit?: number): Promise<RecentPostWithAnalytics[]> {
  const safeLimit = limit && limit > 0 ? limit : 10;
  const db = getDatabase();

  const postRows = await db`SELECT * FROM scheduled_posts ORDER BY created_at DESC LIMIT ${safeLimit}`;
  const posts = postRows.map(deserializePost);

  if (posts.length === 0) return [];

  const postIds = posts.map((p) => p.id);
  const analyticsRows = await db`
    SELECT post_id, event_type, COALESCE(SUM(count), 0)::int AS total
    FROM analytics_events
    WHERE post_id IN ${db(postIds)}
    GROUP BY post_id, event_type
  `;

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

export async function getRecentEducationalPosts(
  personaId: number,
  limit: number = 10,
  sinceIso?: string,
): Promise<Array<{ id: number; content: string | null; metadata: ScheduledPost["metadata"]; created_at: string; content_fingerprint: string | null }>> {
  const db = getDatabase();
  const sinceDate = sinceIso ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const rows = await db`
    SELECT sp.id, sp.content, sp.metadata, sp.created_at, sp.content_fingerprint
    FROM scheduled_posts sp
    JOIN content_templates ct ON sp.template_id = ct.id
    WHERE ct.type = 'educational'
      AND sp.persona_id = ${personaId}
      AND sp.created_at > ${sinceDate}
      AND sp.status IN ('posted', 'scheduled', 'generating')
    ORDER BY sp.created_at DESC
    LIMIT ${limit}
  `;

  return rows.map((row: Record<string, unknown>) => ({
    id: row.id as number,
    content: row.content as string | null,
    metadata: row.metadata
      ? (typeof row.metadata === "string" ? JSON.parse(row.metadata) : row.metadata)
      : null,
    created_at: row.created_at instanceof Date
      ? row.created_at.toISOString()
      : String(row.created_at),
    content_fingerprint: row.content_fingerprint as string | null,
  }));
}

export async function updatePostContentFingerprint(
  id: number,
  fingerprint: string,
): Promise<void> {
  const db = getDatabase();
  await db`UPDATE scheduled_posts SET content_fingerprint = ${fingerprint}, updated_at = CURRENT_TIMESTAMP WHERE id = ${id}`;
}

// === Deserializers (json fields from DB) ===
function deserializePersona(row: Record<string, any>): KOLPersona {
  return {
    id: row.id as number,
    name: row.name as string,
    displayName: row.display_name as string,
    bio: row.bio as string,
    expertise: typeof row.expertise === 'string' ? JSON.parse(row.expertise) : row.expertise,
    toneOfVoice: row.tone_of_voice as KOLPersona["toneOfVoice"],
    targetPlatforms: typeof row.target_platforms === 'string' ? JSON.parse(row.target_platforms) : row.target_platforms,
    language: row.language as "vi",
    avatarUrl: row.avatar_url as string | undefined,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function deserializeTemplate(row: Record<string, any>): ContentTemplate {
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
    hashtags: typeof row.hashtags === 'string' ? JSON.parse(row.hashtags) : row.hashtags,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function deserializePost(row: Record<string, any>): ScheduledPost {
  return {
    id: row.id as number,
    templateId: row.template_id as number | null,
    personaId: row.persona_id as number,
    platform: row.platform as ScheduledPost["platform"],
    status: row.status as ScheduledPost["status"],
    content: row.content as string | null,
    scheduledAt: row.scheduled_at instanceof Date ? row.scheduled_at.toISOString() : row.scheduled_at ? String(row.scheduled_at) : null,
    postedAt: row.posted_at instanceof Date ? row.posted_at.toISOString() : row.posted_at ? String(row.posted_at) : null,
    workflowStage: (row.workflow_stage as ScheduledPost["workflowStage"] | undefined) ?? "research",
    workflowAttempts: (row.workflow_attempts as number | undefined) ?? 0,
    externalPostId: (row.external_post_id as string | null | undefined) ?? null,
    lastError: (row.last_error as string | null | undefined) ?? null,
    metadata: row.metadata ? (typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata) : null,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at),
    updatedAt: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at),
  };
}

function deserializeAnalytics(row: Record<string, any>): AnalyticsEvent {
  return {
    id: row.id as number,
    postId: row.post_id as number,
    platform: row.platform as AnalyticsEvent["platform"],
    eventType: row.event_type as AnalyticsEvent["eventType"],
    count: row.count as number,
    recordedAt: row.recorded_at instanceof Date ? row.recorded_at.toISOString() : String(row.recorded_at),
  };
}
