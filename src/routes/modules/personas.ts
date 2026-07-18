import { FastifyInstance } from "fastify";
import {
  createPersona,
  getPersona,
  listPersonas,
} from "../../models/repository.js";
import type {
  ApiResponse,
  PaginatedResponse,
  Platform,
} from "../../types/index.js";
import { requireAuth, requireAdmin } from "../../plugins/auth.js";

export function registerPersonaRoutes(app: FastifyInstance): void {
  app.get("/api/personas", { preHandler: [requireAuth] }, async (): Promise<PaginatedResponse<unknown>> => {
    const personas = await listPersonas();
    return {
      success: true,
      data: personas,
      total: personas.length,
      page: 1,
      pageSize: personas.length,
    };
  });

  app.get("/api/personas/:id", { preHandler: [requireAuth] }, async (req): Promise<ApiResponse<unknown>> => {
    const { id } = req.params as { id: string };
    const persona = await getPersona(Number(id));
    if (!persona) return { success: false, error: "Persona not found" };
    return { success: true, data: persona };
  });

  app.post("/api/personas", { preHandler: [requireAdmin] }, async (req, reply) => {
    const body = req.body as Record<string, unknown>;
    const persona = await createPersona({
      name: body.name as string,
      displayName: body.displayName as string,
      bio: (body.bio as string) ?? "",
      expertise: (body.expertise as string[]) ?? [],
      toneOfVoice: (body.toneOfVoice as "professional") ?? "professional",
      targetPlatforms: (body.targetPlatforms as Platform[]) ?? ["facebook"],
      language: "vi",
      avatarUrl: body.avatarUrl as string | undefined,
    });
    reply.send({ success: true, data: persona });
  });
}
