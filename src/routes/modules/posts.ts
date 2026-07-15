import { FastifyInstance } from "fastify";
import {
  createScheduledPost,
  deleteScheduledPost,
  getScheduledPost,
  listScheduledPosts,
  updateScheduledPost,
} from "../../models/repository.js";
import { processPostNow } from "../../services/scheduler.js";
import type {
  ApiResponse,
  PaginatedResponse,
  Platform,
} from "../../types/index.js";

export function registerPostRoutes(app: FastifyInstance): void {
  app.get("/api/posts", async (req): Promise<PaginatedResponse<unknown>> => {
    const query = req.query as { status?: string; personaId?: string };
    const posts = listScheduledPosts({
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
    const post = getScheduledPost(Number(id));
    if (!post) return { success: false, error: "Post not found" };
    return { success: true, data: post };
  });

  app.post("/api/posts", (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const post = createScheduledPost({
      templateId: (body.templateId as number | null) ?? null,
      personaId: body.personaId as number,
      platform: (body.platform as Platform) ?? "facebook",
      status: (body.status as "draft") ?? "scheduled",
      content: (body.content as string | null) ?? null,
      scheduledAt: (body.scheduledAt as string) ?? null,
      metadata: (body.metadata as Record<string, unknown> | null) ?? null,
    });
    reply.send({ success: true, data: post });
  });

  app.put("/api/posts/:id", (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const existing = getScheduledPost(Number(id));
    if (!existing)
      return reply
        .status(404)
        .send({ success: false, error: "Post not found" });

    const updated = updateScheduledPost(Number(id), {
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
      metadata:
        body.metadata !== undefined
          ? (body.metadata as Record<string, unknown> | null)
          : existing.metadata,
    });
    reply.send({ success: true, data: updated });
  });

  app.delete("/api/posts/:id", (req, reply) => {
    const { id } = req.params as { id: string };
    const deleted = deleteScheduledPost(Number(id));
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
}
