import { getEnv } from "../config/env.js";

/**
 * Publish content to the configured platform.
 * Primary platform: Facebook (via Graph API).
 */
export async function publishContent(platform: string, content: string): Promise<void> {
  switch (platform) {
    case "facebook":
      await publishToFacebook(content);
      break;
    case "twitter":
      await publishToTwitter(content);
      break;
    case "telegram":
      await publishToTelegram(content);
      break;
    default:
      console.log(`[Publisher] Simulated post to ${platform}: ${content.slice(0, 100)}...`);
      break;
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
async function publishToFacebook(content: string): Promise<void> {
  const env = getEnv();
  const pageId = env.FACEBOOK_PAGE_ID;
  const accessToken = env.FACEBOOK_PAGE_ACCESS_TOKEN;

  if (!pageId || !accessToken) {
    console.log(`[Facebook] Would post (no token configured): ${content.slice(0, 100)}...`);
    return;
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

  const data = await response.json() as { id?: string };
  console.log(`[Facebook] Posted: ${data.id}`);
}

async function publishToTwitter(content: string): Promise<void> {
  const env = getEnv();
  const apiKey = env.TWITTER_API_KEY;
  if (!apiKey) {
    console.log(`[Twitter] Would post (no token configured): ${content.slice(0, 100)}...`);
    return;
  }
  // TODO: Implement with twitter-api-v2 using OAuth 1.0a
  console.log(`[Twitter] Would post: ${content.slice(0, 100)}...`);
}

async function publishToTelegram(content: string): Promise<void> {
  const env = getEnv();
  const botToken = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) {
    console.log(`[Telegram] Would post (no token configured): ${content.slice(0, 100)}...`);
    return;
  }
  // TODO: Implement with grammy
  console.log(`[Telegram] Would post: ${content.slice(0, 100)}...`);
}
