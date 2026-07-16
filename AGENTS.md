# AGENTS.md — crypto-kol

## Codebase Navigation: Graphify Knowledge Graph

This project has a Graphify knowledge graph at `graphify-out/graph.json`,
with a human-readable summary at `graphify-out/GRAPH_REPORT.md`.

**Before searching, grepping, or reading files to understand the codebase,
check the graph first:**

1. For architecture / "how does X work" / "what calls Y" questions:
   run `graphify query "<question>"` and use the returned nodes/edges
   as your primary source. Do not fall back to `grep`/`find`/reading
   files wholesale unless the query returns nothing useful.

2. For broad orientation (module boundaries, entry points, god nodes):
   read `graphify-out/GRAPH_REPORT.md` instead of walking the tree.

3. Only read raw source files once the graph has told you _which_
   files are relevant and _why_ (via EXTRACTED/INFERRED edges) — then
   read just those files, not the whole directory.

4. If `graphify-out/graph.json` is missing or stale (post branch switch,
   large refactor), run `/graphify .` to rebuild before falling back
   to raw search.

**Priority order:** graphify query > GRAPH_REPORT.md > targeted file
read > grep/find. Raw recursive search (`grep -r`, `find .`, `ls -R`)
should be a last resort, not a first move.

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
