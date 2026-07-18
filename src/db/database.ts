import postgres from "postgres";
import { getEnv } from "../config/env.js";

let sql: postgres.Sql | null = null;

export function getDatabase(): postgres.Sql {
  if (!sql) {
    const env = getEnv();
    sql = postgres(env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      ssl: "require",
    });
  }
  return sql;
}

export async function closeDatabase(): Promise<void> {
  if (sql) {
    await sql.end();
    sql = null;
  }
}

export async function migrate(): Promise<void> {
  const db = getDatabase();

  await db`
    CREATE TABLE IF NOT EXISTS personas (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      expertise TEXT NOT NULL DEFAULT '[]',
      tone_of_voice TEXT NOT NULL DEFAULT 'professional',
      target_platforms TEXT NOT NULL DEFAULT '[]',
      language TEXT NOT NULL DEFAULT 'vi',
      avatar_url TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `;

  await db`
    CREATE TABLE IF NOT EXISTS content_templates (
      id SERIAL PRIMARY KEY,
      persona_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'market_update',
      platform TEXT NOT NULL DEFAULT 'twitter',
      system_prompt TEXT NOT NULL DEFAULT '',
      user_prompt_template TEXT NOT NULL DEFAULT '',
      max_tokens INTEGER NOT NULL DEFAULT 500,
      temperature REAL NOT NULL DEFAULT 0.8,
      hashtags TEXT NOT NULL DEFAULT '[]',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
    );
  `;

  await db`
    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id SERIAL PRIMARY KEY,
      template_id INTEGER,
      persona_id INTEGER NOT NULL,
      platform TEXT NOT NULL DEFAULT 'twitter',
      status TEXT NOT NULL DEFAULT 'draft',
      content TEXT,
      scheduled_at TIMESTAMP,
      posted_at TIMESTAMP,
      metadata TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      workflow_stage TEXT NOT NULL DEFAULT 'research',
      workflow_attempts INTEGER NOT NULL DEFAULT 0,
      external_post_id TEXT,
      last_error TEXT,
      FOREIGN KEY (template_id) REFERENCES content_templates(id) ON DELETE SET NULL,
      FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
    );
  `;

  await db`
    CREATE TABLE IF NOT EXISTS analytics_events (
      id SERIAL PRIMARY KEY,
      post_id INTEGER NOT NULL,
      platform TEXT NOT NULL DEFAULT 'twitter',
      event_type TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES scheduled_posts(id) ON DELETE CASCADE
    );
  `;

  await db`CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);`;
  await db`CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);`;
  await db`CREATE INDEX IF NOT EXISTS idx_analytics_events_post_id ON analytics_events(post_id);`;
  await db`
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_platform_status_stage_scheduled_at
    ON scheduled_posts(platform, status, workflow_stage, scheduled_at);
  `;

  // Grant admin role to specific user via db migration
  try {
    await db`
      UPDATE auth.users
      SET raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
      WHERE email = 'trongtri92nd@gmail.com';
    `;
  } catch (e) {
    console.warn("Could not update admin role in auth.users:", e);
  }
}
