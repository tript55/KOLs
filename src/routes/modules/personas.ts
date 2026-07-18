import { FastifyInstance } from "fastify";
import {
  createPersona,
  getPersona,
  listPersonas,
  updatePersona,
  deletePersona,
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

  app.put("/api/personas/:id", { preHandler: [requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = req.body as Record<string, unknown>;
    const persona = await updatePersona(Number(id), {
      name: body.name as string | undefined,
      displayName: body.displayName as string | undefined,
      bio: body.bio as string | undefined,
      expertise: body.expertise as string[] | undefined,
      toneOfVoice: body.toneOfVoice as "professional" | undefined,
      targetPlatforms: body.targetPlatforms as Platform[] | undefined,
      avatarUrl: body.avatarUrl as string | undefined,
    });
    if (!persona) return reply.status(404).send({ success: false, error: "Persona not found" });
    reply.send({ success: true, data: persona });
  });

  app.delete("/api/personas/:id", { preHandler: [requireAdmin] }, async (req, reply) => {
    const { id } = req.params as { id: string };
    const success = await deletePersona(Number(id));
    if (!success) return reply.status(404).send({ success: false, error: "Persona not found or could not be deleted" });
    reply.send({ success: true });
  });
}
