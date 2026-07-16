import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { getEnv } from "../config/env.js";

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    const env = getEnv();
    mkdirSync(dirname(env.DATABASE_PATH), { recursive: true });
    db = new Database(env.DATABASE_PATH);
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
  }
  return db;
}

export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

export function migrate(): void {
  const database = getDatabase();

  database.exec(`
    CREATE TABLE IF NOT EXISTS personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      display_name TEXT NOT NULL,
      bio TEXT NOT NULL DEFAULT '',
      expertise TEXT NOT NULL DEFAULT '[]',
      tone_of_voice TEXT NOT NULL DEFAULT 'professional',
      target_platforms TEXT NOT NULL DEFAULT '[]',
      language TEXT NOT NULL DEFAULT 'vi',
      avatar_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS content_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      persona_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'market_update',
      platform TEXT NOT NULL DEFAULT 'twitter',
      system_prompt TEXT NOT NULL DEFAULT '',
      user_prompt_template TEXT NOT NULL DEFAULT '',
      max_tokens INTEGER NOT NULL DEFAULT 500,
      temperature REAL NOT NULL DEFAULT 0.8,
      hashtags TEXT NOT NULL DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS scheduled_posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      template_id INTEGER,
      persona_id INTEGER NOT NULL,
      platform TEXT NOT NULL DEFAULT 'twitter',
      status TEXT NOT NULL DEFAULT 'draft',
      content TEXT,
      scheduled_at TEXT,
      posted_at TEXT,
      metadata TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (template_id) REFERENCES content_templates(id) ON DELETE SET NULL,
      FOREIGN KEY (persona_id) REFERENCES personas(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      platform TEXT NOT NULL DEFAULT 'twitter',
      event_type TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (post_id) REFERENCES scheduled_posts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_status ON scheduled_posts(status);
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_scheduled_at ON scheduled_posts(scheduled_at);
    CREATE INDEX IF NOT EXISTS idx_analytics_events_post_id ON analytics_events(post_id);
  `);

  ensureColumn(
    database,
    "scheduled_posts",
    "workflow_stage",
    "TEXT NOT NULL DEFAULT 'research'",
  );
  ensureColumn(
    database,
    "scheduled_posts",
    "workflow_attempts",
    "INTEGER NOT NULL DEFAULT 0",
  );
  ensureColumn(database, "scheduled_posts", "external_post_id", "TEXT");
  ensureColumn(database, "scheduled_posts", "last_error", "TEXT");

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_scheduled_posts_platform_status_stage_scheduled_at
    ON scheduled_posts(platform, status, workflow_stage, scheduled_at);
  `);
}

function ensureColumn(
  database: Database.Database,
  tableName: string,
  columnName: string,
  definition: string,
): void {
  const rows = database
    .prepare(`PRAGMA table_info(${tableName})`)
    .all() as Array<{ name: string }>;
  const hasColumn = rows.some((row) => row.name === columnName);

  if (!hasColumn) {
    database.exec(
      `ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${definition}`,
    );
  }
}
