import { FastifyInstance } from "fastify";
import {
  createScheduledPost,
  deleteScheduledPost,
  getScheduledPost,
  listScheduledPosts,
  getWorkflowQueueSummary,
  updateScheduledPost,
} from "../../models/repository.js";
import {
  getSchedulerStatus,
  processPostNow,
} from "../../services/scheduler.js";
import { runFacebookWorkflow } from "../../services/facebook-workflow.js";
import type {
  ApiResponse,
  PaginatedResponse,
  Platform,
  WorkflowStatus,
  WorkflowStage,
} from "../../types/index.js";

export function registerPostRoutes(app: FastifyInstance): void {
  app.get("/api/posts", async (req): Promise<PaginatedResponse<unknown>> => {
    const query = req.query as { status?: string; personaId?: string };
    const posts = await listScheduledPosts({
      status: query.status,
      personaId: query.personaId ? Number(query.personaId) : undefined,
    });
    return {
      success: true,
      data: posts,
      total: posts.length,
      page: 1,
      pageSize: posts.length,
    };
  });

  app.get("/api/posts/:id", async (req): Promise<ApiResponse<unknown>> => {
    const { id } = req.params as { id: string };
    const post = await getScheduledPost(Number(id));
    if (!post) return { success: false, error: "Post not found" };
    return { success: true, data: post };
  });

  app.post("/api/posts", async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const post = await createScheduledPost({
      templateId: (body.templateId as number | null) ?? null,
      personaId: body.personaId as number,
      platform: (body.platform as Platform) ?? "facebook",
      status: (body.status as "draft") ?? "scheduled",
      content: (body.content as string | null) ?? null,
      scheduledAt: (body.scheduledAt as string) ?? null,
      workflowStage: (body.workflowStage as WorkflowStage) ?? "research",
      workflowAttempts: (body.workflowAttempts as number) ?? 0,
      externalPostId: (body.externalPostId as string | null) ?? null,
      lastError: (body.lastError as string | null) ?? null,
      metadata: (body.metadata as Record<string, unknown> | null) ?? null,
    });
    reply.send({ success: true, data: post });
  });

  app.post("/api/posts/from-template", async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const content = body.content as string;
    const personaId = body.personaId as number;
    const templateId = (body.templateId as number | undefined) ?? null;

    if (!content || !personaId) {
      return reply.status(400).send({ success: false, error: "content and personaId are required" });
    }

    const post = await createScheduledPost({
      templateId,
      personaId,
      platform: "facebook",
      status: "draft",
      content,
      scheduledAt: null,
      workflowStage: "publishing",
      workflowAttempts: 0,
      externalPostId: null,
      lastError: null,
      metadata: null,
    });

    const { publishContent } = await import("../../services/publisher.js");
    try {
      await updateScheduledPost(post.id, { status: "generating" });
      const result = await publishContent("facebook", content);
      await updateScheduledPost(post.id, {
        status: "posted",
        externalPostId: result.externalPostId,
      });
      const updated = await getScheduledPost(post.id);
      reply.send({ success: true, data: updated });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Publish failed";
      await updateScheduledPost(post.id, {
        status: "failed",
        lastError: errorMessage,
      });
      return reply.status(500).send({ success: false, error: errorMessage });
    }
  });

  app.put("/api/posts/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const existing = await getScheduledPost(Number(id));
    if (!existing)
      return reply
        .status(404)
        .send({ success: false, error: "Post not found" });

    const updated = await updateScheduledPost(Number(id), {
      templateId:
        body.templateId !== undefined
          ? (body.templateId as number | null)
          : existing.templateId,
      personaId:
        body.personaId !== undefined
          ? (body.personaId as number)
          : existing.personaId,
      platform:
        body.platform !== undefined
          ? (body.platform as Platform)
          : existing.platform,
      status:
        body.status !== undefined
          ? (body.status as
              | "draft"
              | "scheduled"
              | "generating"
              | "posted"
              | "failed")
          : existing.status,
      content:
        body.content !== undefined
          ? (body.content as string | null)
          : existing.content,
      scheduledAt:
        body.scheduledAt !== undefined
          ? (body.scheduledAt as string | null)
          : existing.scheduledAt,
      workflowStage:
        body.workflowStage !== undefined
          ? (body.workflowStage as WorkflowStage)
          : existing.workflowStage,
      workflowAttempts:
        body.workflowAttempts !== undefined
          ? (body.workflowAttempts as number)
          : existing.workflowAttempts,
      externalPostId:
        body.externalPostId !== undefined
          ? (body.externalPostId as string | null)
          : existing.externalPostId,
      lastError:
        body.lastError !== undefined
          ? (body.lastError as string | null)
          : existing.lastError,
      metadata:
        body.metadata !== undefined
          ? (body.metadata as Record<string, unknown> | null)
          : existing.metadata,
    });
    reply.send({ success: true, data: updated });
  });

  app.delete("/api/posts/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const deleted = await deleteScheduledPost(Number(id));
    if (!deleted)
      return reply
        .status(404)
        .send({ success: false, error: "Post not found" });
    reply.send({ success: true, data: { message: `Post ${id} deleted` } });
  });

  app.post(
    "/api/posts/:id/process",
    async (req): Promise<ApiResponse<unknown>> => {
      const { id } = req.params as { id: string };
      try {
        await processPostNow(Number(id));
        return { success: true, data: { message: `Post ${id} processed` } };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  app.post(
    "/api/posts/workflows/facebook",
    async (req, reply): Promise<void> => {
      const body = req.body as Record<string, unknown>;
      const metadata = {
        workflowVersion: 1,
        strategyKey:
          (body.strategyKey as string | undefined) ?? "facebook-plan",
        audienceSegment:
          (body.audienceSegment as string | undefined) ?? "vietnamese-investor",
        targetSlotLabel: (body.targetSlotLabel as string | undefined) ?? null,
        ...(body.metadata as Record<string, unknown> | undefined),
      };

      const post = await createScheduledPost({
        templateId: (body.templateId as number | null) ?? null,
        personaId: body.personaId as number,
        platform: "facebook",
        status: "draft",
        content: (body.content as string | null) ?? null,
        scheduledAt: (body.scheduledAt as string | null) ?? null,
        workflowStage: "research",
        workflowAttempts: 0,
        externalPostId: null,
        lastError: null,
        metadata,
      });

      const autoRun = body.autoRunToSchedule !== false;
      const data = autoRun ? await runFacebookWorkflow(post.id) : post;
      reply.send({ success: true, data });
    },
  );

  app.post(
    "/api/posts/:id/workflow/run",
    async (req): Promise<ApiResponse<unknown>> => {
      const { id } = req.params as { id: string };
      try {
        const post = await runFacebookWorkflow(Number(id));
        return { success: true, data: post };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    },
  );

  app.get(
    "/api/posts/workflows/facebook/status",
    async (): Promise<ApiResponse<WorkflowStatus>> => {
      const now = new Date().toISOString();
      return {
        success: true,
        data: {
          scheduler: getSchedulerStatus(),
          queue: await getWorkflowQueueSummary(now),
        },
      };
    },
  );
}
