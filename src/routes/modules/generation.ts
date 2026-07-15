import { FastifyInstance } from "fastify";
import { generateContent } from "../../services/content-generator.js";
import type { ApiResponse } from "../../types/index.js";

export function registerGenerationRoutes(app: FastifyInstance): void {
  app.post("/api/generate", async (req): Promise<ApiResponse<unknown>> => {
    const body = req.body as {
      templateId: number;
      context?: Record<string, string>;
    };
    try {
      const result = await generateContent(body.templateId, body.context ?? {});
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
