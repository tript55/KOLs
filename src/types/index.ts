import { z } from "zod";

// === KOL Persona ===
export const PlatformEnum = z.enum(["facebook", "twitter", "telegram"]);
export type Platform = z.infer<typeof PlatformEnum>;

export const WorkflowStageEnum = z.enum([
  "research",
  "idea_generation",
  "drafting",
  "compliance",
  "scheduling",
  "publishing",
  "feedback",
  "learning",
  "completed",
]);
export type WorkflowStage = z.infer<typeof WorkflowStageEnum>;

export const ComplianceStatusEnum = z.enum([
  "pending",
  "passed",
  "failed",
  "needs_review",
]);
export type ComplianceStatus = z.infer<typeof ComplianceStatusEnum>;

export const KOLPersonaSchema = z.object({
  id: z.number(),
  name: z.string(),
  displayName: z.string(),
  bio: z.string(),
  expertise: z.array(z.string()),
  toneOfVoice: z.enum([
    "professional",
    "casual",
    "humorous",
    "educational",
    "aggressive",
  ]),
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
  type: z.enum([
    "market_update",
    "news_commentary",
    "educational",
    "meme",
    "alpha_call",
    "engagement",
  ]),
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
  workflowStage: WorkflowStageEnum,
  workflowAttempts: z.number().default(0),
  externalPostId: z.string().nullable(),
  lastError: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type ScheduledPost = z.infer<typeof ScheduledPostSchema>;

export const ResearchSnapshotSchema = z.object({
  marketContext: z.string(),
  dateContext: z.string(),
  strategyTags: z.array(z.string()),
  recentLearningNotes: z.array(z.string()),
  generatedAt: z.string(),
  /** Formatted crypto/macro/regulatory headlines for prompt injection */
  newsContext: z.string().optional(),
  /** Fear & Greed index summary for prompt injection */
  sentimentContext: z.string().optional(),
});
export type ResearchSnapshot = z.infer<typeof ResearchSnapshotSchema>;

export const ContentIdeaSchema = z.object({
  angle: z.string(),
  hook: z.string(),
  audience: z.string(),
  rationale: z.string(),
});
export type ContentIdea = z.infer<typeof ContentIdeaSchema>;

export const ComplianceCheckSchema = z.object({
  status: ComplianceStatusEnum,
  issues: z.array(z.string()),
  finalContent: z.string(),
  checkedAt: z.string(),
});
export type ComplianceCheck = z.infer<typeof ComplianceCheckSchema>;

export const FeedbackSnapshotSchema = z.object({
  likes: z.number(),
  comments: z.number(),
  shares: z.number(),
  fetchedAt: z.string(),
});
export type FeedbackSnapshot = z.infer<typeof FeedbackSnapshotSchema>;

export const LearningSnapshotSchema = z.object({
  outcome: z.enum(["strong", "average", "weak", "unknown"]),
  notes: z.array(z.string()),
  nextPromptAdjustments: z.array(z.string()),
  learnedAt: z.string(),
});
export type LearningSnapshot = z.infer<typeof LearningSnapshotSchema>;

export const FacebookWorkflowMetadataSchema = z.object({
  workflowVersion: z.literal(1),
  strategyKey: z.string().optional(),
  audienceSegment: z.string().optional(),
  targetSlotLabel: z.string().optional(),
  research: ResearchSnapshotSchema.optional(),
  ideas: z.array(ContentIdeaSchema).optional(),
  selectedIdeaIndex: z.number().optional(),
  draftContent: z.string().optional(),
  compliance: ComplianceCheckSchema.optional(),
  feedback: FeedbackSnapshotSchema.optional(),
  learning: LearningSnapshotSchema.optional(),
});
export type FacebookWorkflowMetadata = z.infer<
  typeof FacebookWorkflowMetadataSchema
>;

// === Analytics Event ===
export const AnalyticsEventSchema = z.object({
  id: z.number(),
  postId: z.number(),
  platform: PlatformEnum,
  eventType: z.enum([
    "impression",
    "like",
    "comment",
    "share",
    "retweet",
    "click",
  ]),
  count: z.number().default(0),
  recordedAt: z.string(),
});
export type AnalyticsEvent = z.infer<typeof AnalyticsEventSchema>;

// === Content Generation ===
export const GenerateContentRequestSchema = z.object({
  templateId: z.number(),
  context: z.record(z.string()).optional(),
});
export type GenerateContentRequest = z.infer<
  typeof GenerateContentRequestSchema
>;

export const GenerateContentResponseSchema = z.object({
  content: z.string(),
  tokensUsed: z.number(),
  model: z.string(),
});
export type GenerateContentResponse = z.infer<
  typeof GenerateContentResponseSchema
>;

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
export type RecentPostWithAnalytics = z.infer<
  typeof RecentPostWithAnalyticsSchema
>;

// === Scheduler Status ===
export const SchedulerStatusSchema = z.object({
  isRunning: z.boolean(),
  cronExpression: z.string(),
  nextRunEstimate: z.string().nullable(),
});
export type SchedulerStatus = z.infer<typeof SchedulerStatusSchema>;

export const WorkflowQueueSummarySchema = z.object({
  total: z.number(),
  scheduled: z.number(),
  generating: z.number(),
  failed: z.number(),
  overdue: z.number(),
  postedToday: z.number(),
});
export type WorkflowQueueSummary = z.infer<typeof WorkflowQueueSummarySchema>;

export const WorkflowStatusSchema = z.object({
  scheduler: SchedulerStatusSchema,
  queue: WorkflowQueueSummarySchema,
});
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>;

export interface PublishResult {
  externalPostId: string | null;
  publishedAt: string;
  permalinkUrl?: string | null;
}
