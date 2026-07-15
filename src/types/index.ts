import { z } from "zod";

// === KOL Persona ===
export const PlatformEnum = z.enum(["facebook", "twitter", "telegram"]);
export type Platform = z.infer<typeof PlatformEnum>;

export const KOLPersonaSchema = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string(),
  bio: z.string(),
  expertise: z.array(z.string()),
  toneOfVoice: z.enum(["professional", "casual", "humorous", "educational", "aggressive"]),
  targetPlatforms: z.array(PlatformEnum),
  language: z.literal("vi"),
  avatarUrl: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type KOLPersona = z.infer<typeof KOLPersonaSchema>;

// === Content Template ===
export const ContentTemplateSchema = z.object({
  id: z.number(),
  personaId: z.number(),
  name: z.string(),
  type: z.enum(["market_update", "news_commentary", "educational", "meme", "alpha_call", "engagement"]),
  platform: PlatformEnum,
  systemPrompt: z.string(),
  userPromptTemplate: z.string(),
  maxTokens: z.number().default(50000),
  temperature: z.number().default(0.8),
  hashtags: z.array(z.string()).default([]),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ContentTemplate = z.infer<typeof ContentTemplateSchema>;

// === Scheduled Post ===
export const ScheduledPostSchema = z.object({
  id: z.number(),
  templateId: z.number().nullable(),
  personaId: z.number(),
  platform: PlatformEnum,
  status: z.enum(["draft", "scheduled", "generating", "posted", "failed"]),
  content: z.string().nullable(),
  scheduledAt: z.string().nullable(),
  postedAt: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ScheduledPost = z.infer<typeof ScheduledPostSchema>;

// === Analytics Event ===
export const AnalyticsEventSchema = z.object({
  id: z.number(),
  postId: z.number(),
  platform: PlatformEnum,
  eventType: z.enum(["impression", "like", "comment", "share", "retweet", "click"]),
  count: z.number().default(0),
  recordedAt: z.string(),
});
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// === Content Generation ===
export const GenerateContentRequestSchema = z.object({
  templateId: z.number(),
  context: z.record(z.string()).optional(),
});
export type GenerateContentRequest = z.infer<typeof GenerateContentRequestSchema>;

export const GenerateContentResponseSchema = z.object({
  content: z.string(),
  tokensUsed: z.number(),
  model: z.string(),
});
export type GenerateContentResponse = z.infer<typeof GenerateContentResponseSchema>;

// === API Response ===
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  pageSize: number;
}

// === Dashboard Stats ===
export const PostStatusBreakdownSchema = z.object({
  draft: z.number(),
  scheduled: z.number(),
  generating: z.number(),
  posted: z.number(),
  failed: z.number(),
});
export type PostStatusBreakdown = z.infer<typeof PostStatusBreakdownSchema>;

export const EngagementByTypeSchema = z.object({
  impression: z.number(),
  like: z.number(),
  comment: z.number(),
  share: z.number(),
  retweet: z.number(),
  click: z.number(),
});
export type EngagementByType = z.infer<typeof EngagementByTypeSchema>;

export const DashboardStatsSchema = z.object({
  totalPosts: z.number(),
  postsByStatus: PostStatusBreakdownSchema,
  postsToday: z.number(),
  totalEngagement: z.number(),
  engagementByType: EngagementByTypeSchema,
  totalPersonas: z.number(),
  totalTemplates: z.number(),
});
export type DashboardStats = z.infer<typeof DashboardStatsSchema>;

// === Analytics By Post ===
export const PostAnalyticsGroupSchema = z.object({
  postId: z.number(),
  platform: PlatformEnum,
  totalCount: z.number(),
  byEventType: EngagementByTypeSchema,
});
export type PostAnalyticsGroup = z.infer<typeof PostAnalyticsGroupSchema>;

// === Recent Post With Analytics ===
export const RecentPostWithAnalyticsSchema = ScheduledPostSchema.extend({
  analytics: PostAnalyticsGroupSchema.nullable(),
});
export type RecentPostWithAnalytics = z.infer<typeof RecentPostWithAnalyticsSchema>;

// === Scheduler Status ===
export const SchedulerStatusSchema = z.object({
  isRunning: z.boolean(),
  cronExpression: z.string(),
  nextRunEstimate: z.string().nullable(),
});
export type SchedulerStatus = z.infer<typeof SchedulerStatusSchema>;
