import type {
  Persona,
  Template,
  Post,
  DashboardStats,
  AnalyticsEvent,
  SchedulerStatus,
  SchedulerCommandResponse,
  GenerateRequest,
  GenerateResponse,
  CreatePersonaRequest,
  CreateTemplateRequest,
  CreatePostRequest,
  CreateFacebookWorkflowRequest,
  WorkflowStatus,
} from "../types";

const BASE_URL = import.meta.env.VITE_API_URL || "/api";

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE_URL}${url}`, {
    headers: {
      "Content-Type": "application/json",
    },
    ...options,
  });

  const json = (await response.json()) as {
    success: boolean;
    data?: T;
    error?: string;
  };

  if (!response.ok || !json.success) {
    throw new Error(json.error ?? `API Error ${response.status}`);
  }

  return json.data as T;
}

// Health
export async function getHealth(options?: RequestInit): Promise<{ status: string }> {
  const response = await fetch(`${BASE_URL}/health`, options);
  if (!response.ok) {
    throw new Error(`API Error ${response.status}`);
  }
  return response.json();
}

// Dashboard Stats
export async function getDashboardStats(): Promise<DashboardStats> {
  return fetchJson("/stats/dashboard");
}

// Analytics
export async function getAnalytics(postId?: number): Promise<AnalyticsEvent[]> {
  const query = postId !== undefined ? `?postId=${postId}` : "";
  return fetchJson(`/analytics${query}`);
}

// Personas
export async function getPersonas(): Promise<Persona[]> {
  return fetchJson("/personas");
}

export async function getPersona(id: number): Promise<Persona> {
  return fetchJson(`/personas/${id}`);
}

export async function createPersona(
  data: CreatePersonaRequest,
): Promise<Persona> {
  return fetchJson("/personas", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Templates
export async function getTemplates(): Promise<Template[]> {
  return fetchJson("/templates");
}

export async function getTemplate(id: number): Promise<Template> {
  return fetchJson(`/templates/${id}`);
}

export async function createTemplate(
  data: CreateTemplateRequest,
): Promise<Template> {
  return fetchJson("/templates", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Posts
export async function getPosts(): Promise<Post[]> {
  return fetchJson("/posts");
}

export async function getPost(id: number): Promise<Post> {
  return fetchJson(`/posts/${id}`);
}

export async function createPost(data: CreatePostRequest): Promise<Post> {
  return fetchJson("/posts", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function updatePost(
  id: number,
  data: Partial<CreatePostRequest>,
): Promise<Post> {
  return fetchJson(`/posts/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deletePost(id: number): Promise<void> {
  return fetchJson(`/posts/${id}`, {
    method: "DELETE",
  });
}

export async function processPost(id: number): Promise<Post> {
  return fetchJson(`/posts/${id}/process`, {
    method: "POST",
  });
}

// Generate
export async function generateContent(
  data: GenerateRequest,
): Promise<GenerateResponse> {
  return fetchJson("/generate", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

// Scheduler
export async function getSchedulerStatus(): Promise<SchedulerStatus> {
  return fetchJson("/scheduler/status");
}

export async function startScheduler(): Promise<SchedulerCommandResponse> {
  return fetchJson("/scheduler/start", { method: "POST" });
}

export async function stopScheduler(): Promise<SchedulerCommandResponse> {
  return fetchJson("/scheduler/stop", { method: "POST" });
}

export async function getFacebookWorkflowStatus(): Promise<WorkflowStatus> {
  return fetchJson("/posts/workflows/facebook/status");
}

export async function createFacebookWorkflow(
  data: CreateFacebookWorkflowRequest,
): Promise<Post> {
  return fetchJson("/posts/workflows/facebook", {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function runPostWorkflow(id: number): Promise<Post> {
  return fetchJson(`/posts/${id}/workflow/run`, {
    method: "POST",
  });
}
