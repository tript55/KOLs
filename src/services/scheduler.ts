import cron from "node-cron";
import { CronExpressionParser } from "cron-parser";
import { getEnv } from "../config/env.js";
import { listScheduledPosts, getTemplate, updatePostStatus } from "../models/repository.js";
import { generateContent } from "./content-generator.js";
import { publishContent } from "./publisher.js";
import type { SchedulerStatus } from "../types/index.js";

let cronJob: cron.ScheduledTask | null = null;

export function startScheduler(): void {
  const env = getEnv();

  cronJob = cron.schedule(env.CONTENT_SCHEDULE, async () => {
    console.log(`[Scheduler] Running content generation cycle at ${new Date().toISOString()}`);
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
  const duePosts = listScheduledPosts({ status: "scheduled" })
    .filter(p => p.scheduledAt !== null && p.scheduledAt <= now);

  for (const post of duePosts) {
    try {
      // mark as generating
      updatePostStatus(post.id, "generating");

      let content: string;

      if (post.templateId) {
        const result = await generateContent(post.templateId);
        content = result.content;
      } else if (post.content) {
        content = post.content;
      } else {
        throw new Error(`Post ${post.id} has no template or content`);
      }

      // publish to platform
      await publishContent(post.platform, content);

      // mark as posted
      updatePostStatus(post.id, "posted", content);
      console.log(`[Scheduler] Posted ${post.id} to ${post.platform}`);
    } catch (err) {
      console.error(`[Scheduler] Failed to process post ${post.id}:`, err);
      updatePostStatus(post.id, "failed");
    }
  }
}

/**
 * Process a single post immediately (bypass scheduler).
 */
export async function processPostNow(postId: number): Promise<void> {
  const posts = listScheduledPosts().filter(p => p.id === postId);
  const post = posts[0];
  if (!post) throw new Error(`Post ${postId} not found`);

  if (post.status === "posted") throw new Error(`Post ${postId} already posted`);

  updatePostStatus(post.id, "generating");

  let content: string;
  if (post.templateId) {
    const result = await generateContent(post.templateId);
    content = result.content;
  } else if (post.content) {
    content = post.content;
  } else {
    throw new Error(`Post ${post.id} has no template or content`);
  }

  await publishContent(post.platform, content);
  updatePostStatus(post.id, "posted", content);
}
