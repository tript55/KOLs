import cron from "node-cron";
import { CronExpressionParser } from "cron-parser";
import { getEnv } from "../config/env.js";
import {
  getDueWorkflowPosts,
  listScheduledPosts,
  updateWorkflowState,
} from "../models/repository.js";
import { runFacebookWorkflow } from "./facebook-workflow.js";
import type { SchedulerStatus } from "../types/index.js";

let cronJob: cron.ScheduledTask | null = null;

export function startScheduler(): void {
  const env = getEnv();

  cronJob = cron.schedule(env.CONTENT_SCHEDULE, async () => {
    console.log(
      `[Scheduler] Running content generation cycle at ${new Date().toISOString()}`,
    );
    await processScheduledPosts();
  });

  console.log(`[Scheduler] Started with schedule: ${env.CONTENT_SCHEDULE}`);
}

export function stopScheduler(): void {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log("[Scheduler] Stopped");
  }
}

export function getSchedulerStatus(): SchedulerStatus {
  const env = getEnv();
  let nextRunEstimate: string | null = null;

  if (cronJob !== null) {
    try {
      const expression = CronExpressionParser.parse(env.CONTENT_SCHEDULE);
      const next = expression.next().toDate();
      nextRunEstimate = next.toISOString();
    } catch {
      // invalid cron expression
    }
  }

  return {
    isRunning: cronJob !== null,
    cronExpression: env.CONTENT_SCHEDULE,
    nextRunEstimate,
  };
}

async function processScheduledPosts(): Promise<void> {
  const now = new Date().toISOString();
  const duePosts = await getDueWorkflowPosts(now);

  for (const post of duePosts) {
    try {
      if (post.platform === "facebook") {
        const result = await runFacebookWorkflow(post.id);
        console.log(
          `[Scheduler] Advanced Facebook workflow ${result.id} to ${result.workflowStage}`,
        );
        continue;
      }

      if (post.status !== "scheduled") {
        continue;
      }

      await updateWorkflowState(post.id, {
        status: "failed",
        lastError: `Platform ${post.platform} is not supported by the workflow scheduler`,
      });
    } catch (err) {
      console.error(`[Scheduler] Failed to process post ${post.id}:`, err);
      await updateWorkflowState(post.id, {
        status: "failed",
        lastError: (err as Error).message,
      });
    }
  }
}

/**
 * Process a single post immediately (bypass scheduler).
 */
export async function processPostNow(postId: number): Promise<void> {
  const posts = (await listScheduledPosts()).filter((p) => p.id === postId);
  const post = posts[0];
  if (!post) throw new Error(`Post ${postId} not found`);

  if (post.platform === "facebook") {
    const result = await runFacebookWorkflow(post.id);
    if (result.status === "failed") {
      throw new Error(result.lastError ?? `Post ${postId} failed`);
    }
    return;
  }

  throw new Error(
    `Platform ${post.platform} is not supported by processPostNow`,
  );
}
