# AI KOL System Architecture — Crypto Minh

## Overview

Crypto Minh is an AI-powered Key Opinion Leader (KOL) for the Vietnamese crypto/finance market. The system automatically generates Vietnamese-language content, schedules posts, and publishes to social media platforms (Twitter/X, Telegram).

---

## System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                      API Server (Fastify)                 │
│  ┌──────────┐  ┌──────────────┐  ┌────────────────────┐ │
│  │ Persona  │  │   Template   │  │   Post Management  │ │
│  │   CRUD   │  │     CRUD     │  │      CRUD          │ │
│  └──────────┘  └──────────────┘  └────────────────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │           Content Generation Endpoint             │   │
│  │              POST /api/generate                   │   │
│  └──────────────────┬───────────────────────────────┘   │
└─────────────────────┼───────────────────────────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
  ┌──────▼──────┐          ┌──────▼──────┐
  │  Anthropic  │          │   OpenAI    │
  │   (Claude)  │          │  (GPT-4o)   │
  └─────────────┘          └─────────────┘
         │                         │
         └────────────┬────────────┘
                      │
         ┌────────────▼────────────┐
         │   Content Scheduler      │
         │      (node-cron)         │
         └────────────┬────────────┘
                      │
         ┌────────────┴────────────┐
         │                         │
  ┌──────▼──────┐          ┌──────▼──────┐
  │  Twitter/X  │          │  Telegram   │
  │   API v2    │          │   Bot API   │
  └─────────────┘          └─────────────┘
                      │
         ┌────────────▼────────────┐
         │      SQLite (WAL)       │
         │   koldb.sqlite           │
         └─────────────────────────┘
```

## Technology Stack

| Component | Choice | Rationale |
|-----------|--------|-----------|
| **Runtime** | Node.js 22+ | Broad ecosystem, async-first |
| **Language** | TypeScript 5.7+ (strict) | Type safety, maintainability |
| **Framework** | Fastify 5 | Faster than Express, built-in validation, plugin system |
| **Validation** | Zod | Type-safe schema validation, infers TypeScript types |
| **Database** | SQLite via `better-sqlite3` | Zero-setup, single file, fast reads, WAL mode for concurrent access |
| **LLM Primary** | Claude (Anthropic) | Best Vietnamese quality, structured output |
| **LLM Fallback** | GPT-4o (OpenAI) | Alternative provider via configuration |
| **Scheduling** | node-cron (MVP) → BullMQ (prod) | node-cron for simple MVP; BullMQ adds persistence, retries, idempotent schedules |
| **Facebook** | Graph API v21 | Primary platform — Page feed posting via Page Access Token |
| **Dev Runner** | tsx | Fast TypeScript execution without build step |
| **Telegram** | grammy | TypeScript-first, latest Bot API support, 1.6M weekly downloads |

### LLM Strategy

| Provider | Role | Vietnamese Quality | Cost |
|----------|------|-------------------|------|
| **Claude Sonnet 5** (Anthropic) | Primary writer | Best Vietnamese writing quality, most natural phrasing | $2/$10 per 1M tokens |
| **Gemini 3.5 Flash** (Google) | News/market context | Best for Vietnamese slang, current events, named entities | $1.50/$9 per 1M tokens |
| **DeepSeek V4-Flash** | Budget fallback | Weaker Vietnamese (Sino-Vietnamese) | $0.30/$1.20 per 1M tokens |

### X/Twitter API Pricing (2026)

As of February 2026, X moved to pay-per-use:
- Post creation: **$0.015/post** (~$14/month for 30 posts/day)
- 50 requests per 15-minute window per user
- 200 tweets per 24 hours for a single user account

---

## Database Schema

```
personas
├── id (INTEGER PK)
├── name (TEXT UNIQUE)
├── display_name (TEXT)
├── bio (TEXT)
├── expertise (TEXT — JSON array)
├── tone_of_voice (TEXT)
├── target_platforms (TEXT — JSON array)
├── language (TEXT, default 'vi')
├── avatar_url (TEXT, nullable)
├── created_at, updated_at

content_templates
├── id (INTEGER PK)
├── persona_id (FK → personas.id)
├── name (TEXT)
├── type (TEXT: market_update | news_commentary | educational | meme | alpha_call | engagement)
├── platform (TEXT: twitter | telegram | facebook)
├── system_prompt (TEXT)
├── user_prompt_template (TEXT — supports {{variable}} placeholders)
├── max_tokens (INTEGER, default 500)
├── temperature (REAL, default 0.8)
├── hashtags (TEXT — JSON array)
├── created_at, updated_at

scheduled_posts
├── id (INTEGER PK)
├── template_id (FK → content_templates.id, nullable)
├── persona_id (FK → personas.id)
├── platform (TEXT)
├── status (TEXT: draft | scheduled | generating | posted | failed)
├── content (TEXT, nullable — null until generated)
├── scheduled_at (TEXT — ISO 8601)
├── posted_at (TEXT, nullable)
├── metadata (TEXT — JSON, nullable)
├── created_at, updated_at

analytics_events
├── id (INTEGER PK)
├── post_id (FK → scheduled_posts.id)
├── platform (TEXT)
├── event_type (TEXT: impression | like | comment | share | retweet | click)
├── count (INTEGER)
├── recorded_at (TEXT)
```

---

## API Design

### Base URL: `http://localhost:3000`

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/health` | Health check |
| `GET` | `/api/personas` | List all personas |
| `GET` | `/api/personas/:id` | Get persona by ID |
| `POST` | `/api/personas` | Create persona |
| `GET` | `/api/templates?personaId=` | List templates |
| `GET` | `/api/templates/:id` | Get template by ID |
| `POST` | `/api/templates` | Create template |
| `GET` | `/api/posts?status=&personaId=` | List posts |
| `GET` | `/api/posts/:id` | Get post by ID |
| `POST` | `/api/posts` | Schedule a new post |
| `POST` | `/api/generate` | Generate content from template |
| `POST` | `/api/posts/:id/process` | Process a specific post now |
| `POST` | `/api/scheduler/start` | Start scheduler |
| `POST` | `/api/scheduler/stop` | Stop scheduler |

### Content Generation Flow

```
1. Admin creates persona (name, bio, tone, expertise)
2. Admin creates content templates (type, platform, system prompt, user prompt template)
3. Admin schedules posts (picks template, sets time)
4. Scheduler (node-cron) triggers at interval:
   a. Finds posts where status=scheduled AND scheduled_at <= now
   b. Sets status → "generating"
   c. Calls LLM with template's system_prompt + rendered user_prompt_template
   d. Sets status → "posted", stores generated content
   e. Publishes to platform API (Twitter/Telegram)
```

---

## Content Generation Prompt Architecture

Each template has two prompts:

1. **System Prompt**: Defines the KOL persona, tone, writing rules, constraints
   - Example: "Bạn là Crypto Minh, chuyên gia phân tích crypto người Việt Nam..."
   - Includes: language rules (Vietnamese with tone marks), character limits, hashtag rules, emoji policy

2. **User Prompt Template**: The specific content request with `{{variable}}` placeholders
   - Example: "Hãy viết một tweet cập nhật thị trường về {{topic}}. Đề cập đến {{coin}}."
   - Variables replaced at generation time with real-time context

---

## Deployment

**Recommended**: Single VPS (2GB RAM, 1 vCPU) with:
- Node.js 22+ via nvm
- PM2 for process management
- SQLite on local disk (backups via litestream or cron)
- nginx reverse proxy (optional)

### Environment Variables

All configuration via `.env` file. See `.env.example` for full list.

### Startup

```bash
npm install
npm run db:migrate && npm run db:seed
npm run build && npm start
# or for development:
npm run dev
```

---

## 2026 Vietnam Regulatory Context

Vietnam's crypto regulatory framework shifted significantly in 2026:

- **Resolution 05/2025/NQ-CP**: Established a 5-year pilot program for digital assets
- **Circular 32/2026/TT-BTC** (effective March 27, 2026): Imposed **0.1% transfer tax** for individuals, same rate as listed stocks
- 5 exchanges shortlisted for **Q3/2026 licensing**
- Crypto is **legal to own and trade** but NOT legal as payment
- MOF pushing users from foreign exchanges to licensed domestic venues

This regulatory transition creates a unique content opportunity — no top KOL is positioned as the go-to resource for navigating the new rules.

## Future Enhancements

- [ ] Real-time market data integration (CoinGecko/Binance WebSocket)
- [ ] Multi-persona support (different tones for different audiences)
- [ ] Facebook/TikTok API integration
- [ ] Analytics dashboard
- [ ] Content performance feedback loop (use engagement data to optimize prompts)
- [ ] A/B testing for content templates
- [ ] Vietnamese-specific NLP for content quality scoring
- [ ] Image generation for post thumbnails (DALL-E / Stable Diffusion)
