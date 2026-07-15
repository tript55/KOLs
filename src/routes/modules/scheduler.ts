import { FastifyInstance } from "fastify";
import {
  getSchedulerStatus,
  startScheduler,
  stopScheduler,
} from "../../services/scheduler.js";
import type { ApiResponse, SchedulerStatus } from "../../types/index.js";

export function registerSchedulerRoutes(app: FastifyInstance): void {
  app.post("/api/scheduler/start", async () => {
    startScheduler();
    return { success: true, data: { message: "Scheduler started" } };
  });

  app.post("/api/scheduler/stop", async () => {
    stopScheduler();
    return { success: true, data: { message: "Scheduler stopped" } };
  });

  app.get(
    "/api/scheduler/status",
    async (): Promise<ApiResponse<SchedulerStatus>> => {
      return { success: true, data: getSchedulerStatus() };
    },
  );
}
