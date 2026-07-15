// Enums / literal unions matching backend
export type ToneOfVoice = 'professional' | 'casual' | 'humorous' | 'educational' | 'aggressive';
export type Platform = 'facebook' | 'twitter' | 'telegram';
export type TemplateType = 'market_update' | 'news_commentary' | 'educational' | 'meme' | 'alpha_call' | 'engagement';
export type PostStatus = 'draft' | 'scheduled' | 'generating' | 'posted' | 'failed';

export interface Persona {
  id: number;
  name: string;
  displayName: string;
  bio: string;
  expertise: string[];
  toneOfVoice: ToneOfVoice;
  targetPlatforms: Platform[];
  language: 'vi';
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
  metadata: Record<string, unknown> | null;
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

export interface GenerateRequest {
  templateId: number;
  personaId?: number;
  platform?: Platform;
}

export interface GenerateResponse {
  content: string;
  postId: number;
}

export interface CreatePersonaRequest {
  name: string;
  displayName: string;
  bio: string;
  expertise: string[];
  toneOfVoice: ToneOfVoice;
  targetPlatforms: Platform[];
  language: 'vi';
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

export interface CreatePostRequest {
  content?: string;
  platform: Platform;
  status: PostStatus;
  personaId: number;
  templateId?: number;
  scheduledAt?: string;
}
