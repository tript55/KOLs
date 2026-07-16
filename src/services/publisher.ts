import { getEnv } from "../config/env.js";
import type { FeedbackSnapshot, PublishResult } from "../types/index.js";

/**
 * Publish content to the configured platform.
 * Primary platform: Facebook (via Graph API).
 */
export async function publishContent(
  platform: string,
  content: string,
): Promise<PublishResult> {
  switch (platform) {
    case "facebook":
      return publishToFacebook(content);
    case "twitter":
      return publishToTwitter(content);
    case "telegram":
      return publishToTelegram(content);
    default:
      console.log(
        `[Publisher] Simulated post to ${platform}: ${content.slice(0, 100)}...`,
      );
      return {
        externalPostId: null,
        publishedAt: new Date().toISOString(),
        permalinkUrl: null,
      };
  }
}

/**
 * Facebook Graph API — post to a Page feed.
 *
 * Setup required:
 * 1. Create a Facebook App at developers.facebook.com
 * 2. Get a Page Access Token via Graph API Explorer or OAuth flow:
 *    - User Token (with pages_manage_posts, pages_read_engagement)
 *    - Exchange for long-lived token
 *    - GET /me/accounts → get Page Access Token
 * 3. Set FACEBOOK_PAGE_ID and FACEBOOK_PAGE_ACCESS_TOKEN in .env
 *
 * Endpoint: POST https://graph.facebook.com/v21.0/{page-id}/feed
 * Permissions needed: pages_manage_posts, pages_read_engagement
 * Rate limit: 200 calls/hour per user (standard)
 */
async function publishToFacebook(content: string): Promise<PublishResult> {
  const env = getEnv();
  const pageId = env.FACEBOOK_PAGE_ID;
  const accessToken = env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    console.log(
      `[Facebook] Would post (no token configured): ${content.slice(0, 100)}...`,
    );
    return {
      externalPostId: null,
      publishedAt: new Date().toISOString(),
      permalinkUrl: null,
    };
  }

  const url = `https://graph.facebook.com/v21.0/${pageId}/feed`;
  const body = new URLSearchParams({
    message: content,
    access_token: accessToken,
  });

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Facebook API error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as { id?: string };
  console.log(`[Facebook] Posted: ${data.id}`);
  return {
    externalPostId: data.id ?? null,
    publishedAt: new Date().toISOString(),
    permalinkUrl: data.id ? `https://www.facebook.com/${data.id}` : null,
  };
}

async function publishToTwitter(content: string): Promise<PublishResult> {
  const env = getEnv();
  const apiKey = env.TWITTER_API_KEY;
  if (!apiKey) {
    console.log(
      `[Twitter] Would post (no token configured): ${content.slice(0, 100)}...`,
    );
    return {
      externalPostId: null,
      publishedAt: new Date().toISOString(),
      permalinkUrl: null,
    };
  }
  // TODO: Implement with twitter-api-v2 using OAuth 1.0a
  console.log(`[Twitter] Would post: ${content.slice(0, 100)}...`);
  return {
    externalPostId: null,
    publishedAt: new Date().toISOString(),
    permalinkUrl: null,
  };
}

async function publishToTelegram(content: string): Promise<PublishResult> {
  const env = getEnv();
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.log(
      `[Telegram] Would post (no token configured): ${content.slice(0, 100)}...`,
    );
    return {
      externalPostId: null,
      publishedAt: new Date().toISOString(),
      permalinkUrl: null,
    };
  }
  // TODO: Implement with grammy
  console.log(`[Telegram] Would post: ${content.slice(0, 100)}...`);
  return {
    externalPostId: null,
    publishedAt: new Date().toISOString(),
    permalinkUrl: null,
  };
}

export async function fetchFacebookFeedback(
  externalPostId: string,
): Promise<FeedbackSnapshot> {
  const env = getEnv();
  const pageId = env.FACEBOOK_PAGE_ID;
  const accessToken = env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    return {
      likes: 0,
      comments: 0,
      shares: 0,
      fetchedAt: new Date().toISOString(),
    };
  }

  const fields =
    "reactions.summary(total_count),comments.summary(total_count),shares";
  const url = `https://graph.facebook.com/v21.0/${externalPostId}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(accessToken)}`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Facebook feedback API error: ${response.status} ${err}`);
  }

  const data = (await response.json()) as {
    reactions?: { summary?: { total_count?: number } };
    comments?: { summary?: { total_count?: number } };
    shares?: { count?: number };
  };

  return {
    likes: data.reactions?.summary?.total_count ?? 0,
    comments: data.comments?.summary?.total_count ?? 0,
    shares: data.shares?.count ?? 0,
    fetchedAt: new Date().toISOString(),
  };
}
