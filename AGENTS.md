# AGENTS.md — crypto-kol

## Project Layout

- **Backend**: `src/` — Fastify 5 API server, TypeScript ESM, Node 22+
- **Frontend**: `frontend/` — React 19 + Vite 8 + Tailwind v4 (separate `package.json` and `node_modules`)
- **Database**: `data/koldb.sqlite` — SQLite with WAL mode via `better-sqlite3`
- **Docs**: `docs/architecture.md` has full system diagram, API routes, schema, and deployment notes

## Commands

### Backend (root)

| Command              | Purpose                                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`        | Run with `tsx watch` (hot reload, no build)                                                                                             |
| `npm run build`      | `tsc` → `dist/`                                                                                                                         |
| `npm run typecheck`  | `tsc --noEmit`                                                                                                                          |
| `npm run lint`       | `eslint src/`                                                                                                                           |
| `npm run db:migrate` | **Broken** — references nonexistent `src/db/migrate.ts`. Migrations run automatically on server boot via `migrate()` in `src/index.ts`. |
| `npm run db:seed`    | Seed persona + templates (idempotent, skips if data exists; also runs migrations internally)                                            |

### Frontend (`frontend/`)

| Command         | Purpose                                             |
| --------------- | --------------------------------------------------- |
| `npm run dev`   | Vite dev server (proxies `/api` → `localhost:3000`) |
| `npm run build` | `tsc -b && vite build`                              |
| `npm run lint`  | `oxlint` (NOT eslint — different linter)            |

**No test framework is configured.** There are no test files or test scripts in either package.

## Architecture Gotchas

- **Migrations are inline** in `src/db/database.ts` `migrate()` — there are no migration files. Schema changes go in the `CREATE TABLE IF NOT EXISTS` block.
- **Env validation** uses Zod in `src/config/env.ts`. Adding a new env var requires updating the schema there AND `.env.example`.
- **LLM provider** is selected at runtime via `LLM_PROVIDER` env (`openai` | `anthropic`). Both SDKs are dynamically imported. `LLM_MODEL` is a free-form string passed directly to the provider API.
- **Publisher** (`src/services/publisher.ts`): Facebook is the only implemented platform. Twitter and Telegram are stubs (log-only, marked TODO).
- **Scheduler** starts automatically on server boot via `node-cron`. Control via `POST /api/scheduler/start|stop`.
- **Frontend proxies `/api`** to the backend in dev (Vite config). In production, serve the frontend build from the Fastify server or a reverse proxy.

## TypeScript Conventions

- ESM (`"type": "module"`) — imports must include `.js` extension
- `strict: true` + `noUncheckedIndexedAccess` — array/object access returns `T | undefined`
- Backend `rootDir` is `src/`, output to `dist/`. Frontend has its own `tsconfig.json` with project references.
- No `as any` or `@ts-ignore` — the codebase uses `as` casts sparingly for untyped Fastify request bodies.

## Content Domain

- All generated content is **Vietnamese language** (`CONTENT_LANGUAGE=vi`)
- Persona "Crypto Minh" is seeded by default with 3 Facebook templates
- Template `user_prompt_template` uses `{{variable}}` placeholders, replaced at generation time
- Post statuses: `draft → scheduled → generating → posted | failed`

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
