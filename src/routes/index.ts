import { FastifyInstance } from "fastify";
import { registerAnalyticsRoutes } from "./modules/analytics.js";
import { registerGenerationRoutes } from "./modules/generation.js";
import { registerHealthRoutes } from "./modules/health.js";
import { registerPersonaRoutes } from "./modules/personas.js";
import { registerPostRoutes } from "./modules/posts.js";
import { registerSchedulerRoutes } from "./modules/scheduler.js";
import { registerTemplateRoutes } from "./modules/templates.js";

export function registerRoutes(app: FastifyInstance): void {
  registerHealthRoutes(app);
  registerPersonaRoutes(app);
  registerTemplateRoutes(app);
  registerPostRoutes(app);
  registerGenerationRoutes(app);
  registerSchedulerRoutes(app);
  registerAnalyticsRoutes(app);
}
