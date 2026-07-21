// Enums / literal unions matching backend
export type ToneOfVoice =
  | "professional"
  | "casual"
  | "humorous"
  | "educational"
  | "aggressive";
export type Platform = "facebook" | "twitter" | "telegram";
export type TemplateType =
  | "market_update"
  | "news_commentary"
  | "educational"
  | "meme"
  | "alpha_call"
  | "engagement";
export type PostStatus =
  | "draft"
  | "scheduled"
  | "generating"
  | "posted"
  | "failed";
export type WorkflowStage =
  | "research"
  | "idea_generation"
  | "drafting"
  | "compliance"
  | "scheduling"
  | "publishing"
  | "feedback"
  | "learning"
  | "completed";

export interface ResearchSnapshot {
  marketContext: string;
  dateContext: string;
  strategyTags: string[];
  recentLearningNotes: string[];
  generatedAt: string;
}

export interface ContentIdea {
  angle: string;
  hook: string;
  audience: string;
  rationale: string;
}

export interface ComplianceCheck {
  status: "pending" | "passed" | "failed" | "needs_review";
  issues: string[];
  finalContent: string;
  checkedAt: string;
}

export interface FeedbackSnapshot {
  likes: number;
  comments: number;
  shares: number;
  fetchedAt: string;
}

export interface LearningSnapshot {
  outcome: "strong" | "average" | "weak" | "unknown";
  notes: string[];
  nextPromptAdjustments: string[];
  learnedAt: string;
}

export interface FacebookWorkflowMetadata {
  workflowVersion: 1;
  strategyKey?: string;
  audienceSegment?: string;
  targetSlotLabel?: string;
  research?: ResearchSnapshot;
  ideas?: ContentIdea[];
  selectedIdeaIndex?: number;
  draftContent?: string;
  compliance?: ComplianceCheck;
  feedback?: FeedbackSnapshot;
  learning?: LearningSnapshot;
}

export interface Persona {
  id: number;
  name: string;
  displayName: string;
  bio: string;
  expertise: string[];
  toneOfVoice: ToneOfVoice;
  targetPlatforms: Platform[];
  language: "vi";
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Template {
  id: number;
  personaId: number;
  name: string;
  type: TemplateType;
  platform: Platform;
  systemPrompt: string;
  userPromptTemplate: string;
  maxTokens: number;
  temperature: number;
  hashtags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Post {
  id: number;
  templateId: number | null;
  personaId: number;
  platform: Platform;
  status: PostStatus;
  content: string | null;
  scheduledAt: string | null;
  postedAt: string | null;
  workflowStage: WorkflowStage;
  workflowAttempts: number;
  externalPostId: string | null;
  lastError: string | null;
  metadata: FacebookWorkflowMetadata | null;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalPosts: number;
  postsByStatus: Record<PostStatus, number>;
  postsToday: number;
  totalEngagement: number;
  engagementByType: Record<string, number>;
  totalPersonas: number;
  totalTemplates: number;
}

export interface AnalyticsEvent {
  id: number;
  postId: number;
  eventType: string;
  value: number;
  timestamp: string;
}

export interface SchedulerStatus {
  isRunning: boolean;
  cronExpression: string;
  nextRunEstimate: string | null;
}

export interface WorkflowQueueSummary {
  total: number;
  scheduled: number;
  generating: number;
  failed: number;
  overdue: number;
  postedToday: number;
}

export interface WorkflowStatus {
  scheduler: SchedulerStatus;
  queue: WorkflowQueueSummary;
}

export interface GenerateRequest {
  templateId: number;
  context?: Record<string, string>;
}

export interface GenerateResponse {
  content: string;
  tokensUsed: number;
  model: string;
}

export interface SchedulerCommandResponse {
  message: string;
}

export interface CreatePersonaRequest {
  name: string;
  displayName: string;
  bio: string;
  expertise: string[];
  toneOfVoice: ToneOfVoice;
  targetPlatforms: Platform[];
  language: "vi";
  avatarUrl?: string;
}

export interface CreateTemplateRequest {
  name: string;
  type: TemplateType;
  platform: Platform;
  personaId: number;
  systemPrompt: string;
  userPromptTemplate: string;
  maxTokens: number;
  temperature: number;
  hashtags: string[];
}

export interface UpdateTemplateRequest {
  name?: string;
  type?: TemplateType;
  platform?: Platform;
  personaId?: number;
  systemPrompt?: string;
  userPromptTemplate?: string;
  maxTokens?: number;
  temperature?: number;
  hashtags?: string[];
}

export interface CreatePostRequest {
  content?: string;
  platform: Platform;
  status: PostStatus;
  personaId: number;
  templateId?: number;
  scheduledAt?: string;
  workflowStage?: WorkflowStage;
  workflowAttempts?: number;
  externalPostId?: string | null;
  lastError?: string | null;
  metadata?: FacebookWorkflowMetadata | null;
}

export interface CreateFacebookWorkflowRequest {
  personaId: number;
  templateId?: number;
  scheduledAt?: string;
  content?: string;
  strategyKey?: string;
  audienceSegment?: string;
  targetSlotLabel?: string;
  metadata?: Record<string, unknown>;
  autoRunToSchedule?: boolean;
}
