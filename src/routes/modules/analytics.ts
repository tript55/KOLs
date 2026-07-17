import { FastifyInstance } from "fastify";
import {
  getAnalyticsByPost,
  getDashboardStats,
  getRecentPosts,
} from "../../models/repository.js";
import type {
  ApiResponse,
  DashboardStats,
  PostAnalyticsGroup,
  RecentPostWithAnalytics,
} from "../../types/index.js";

export function registerAnalyticsRoutes(app: FastifyInstance): void {
  app.get(
    "/api/stats/dashboard",
    async (): Promise<ApiResponse<DashboardStats>> => {
      return { success: true, data: await getDashboardStats() };
    },
  );

  app.get(
    "/api/analytics",
    async (req): Promise<ApiResponse<PostAnalyticsGroup[]>> => {
      const query = req.query as { postId?: string };
      const postId = query.postId ? Number(query.postId) : undefined;
      if (postId !== undefined && Number.isNaN(postId)) {
        return { success: false, error: "Invalid postId" };
      }
      return { success: true, data: await getAnalyticsByPost(postId) };
    },
  );

  app.get(
    "/api/posts/recent",
    async (req): Promise<ApiResponse<RecentPostWithAnalytics[]>> => {
      const query = req.query as { limit?: string };
      const limit = query.limit ? Number(query.limit) : undefined;
      return { success: true, data: await getRecentPosts(limit) };
    },
  );
}
