import { FastifyInstance } from "fastify";
import {
  createTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
  deleteTemplate,
} from "../../models/repository.js";
import type {
  ApiResponse,
  PaginatedResponse,
  Platform,
  ContentTemplate,
} from "../../types/index.js";

export function registerTemplateRoutes(app: FastifyInstance): void {
  app.get(
    "/api/templates",
    async (req): Promise<PaginatedResponse<unknown>> => {
      const query = req.query as { personaId?: string };
      const templates = await listTemplates(
        query.personaId ? Number(query.personaId) : undefined,
      );
      return {
        success: true,
        data: templates,
        total: templates.length,
        page: 1,
        pageSize: templates.length,
      };
    },
  );

  app.get("/api/templates/:id", async (req): Promise<ApiResponse<unknown>> => {
    const { id } = req.params as { id: string };
    const template = await getTemplate(Number(id));
    if (!template) return { success: false, error: "Template not found" };
    return { success: true, data: template };
  });

  app.post("/api/templates", async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const template = await createTemplate({
      personaId: body.personaId as number,
      name: body.name as string,
      type: (body.type as "market_update") ?? "market_update",
      platform: (body.platform as Platform) ?? "facebook",
      systemPrompt: (body.systemPrompt as string) ?? "",
      userPromptTemplate: (body.userPromptTemplate as string) ?? "",
      maxTokens: (body.maxTokens as number) ?? 50000,
      temperature: (body.temperature as number) ?? 0.8,
      hashtags: (body.hashtags as string[]) ?? [],
    });
    reply.send({ success: true, data: template });
  });

  app.put("/api/templates/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const existing = await getTemplate(Number(id));
    if (!existing) return reply.status(404).send({ success: false, error: "Template not found" });

    const updated = await updateTemplate(Number(id), {
      name: body.name !== undefined ? (body.name as string) : existing.name,
      type: body.type !== undefined ? (body.type as ContentTemplate["type"]) : existing.type,
      platform: body.platform !== undefined ? (body.platform as Platform) : existing.platform,
      personaId: body.personaId !== undefined ? (body.personaId as number) : existing.personaId,
      systemPrompt: body.systemPrompt !== undefined ? (body.systemPrompt as string) : existing.systemPrompt,
      userPromptTemplate: body.userPromptTemplate !== undefined ? (body.userPromptTemplate as string) : existing.userPromptTemplate,
      maxTokens: body.maxTokens !== undefined ? (body.maxTokens as number) : existing.maxTokens,
      temperature: body.temperature !== undefined ? (body.temperature as number) : existing.temperature,
      hashtags: body.hashtags !== undefined ? (body.hashtags as string[]) : existing.hashtags,
    });
    reply.send({ success: true, data: updated });
  });

  app.delete("/api/templates/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const deleted = await deleteTemplate(Number(id));
    if (!deleted) return reply.status(404).send({ success: false, error: "Template not found" });
    reply.send({ success: true, data: { message: `Template ${id} deleted` } });
  });
}
