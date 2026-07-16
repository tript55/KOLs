# Facebook Workflow Runbook

## Overview

The Facebook workflow is the implemented AI posting pipeline for Crypto Minh. It turns a single `scheduled_posts` row into a resumable workflow that moves through:

`research -> idea_generation -> drafting -> compliance -> scheduling -> publishing -> feedback -> learning -> completed`

This workflow is implemented in [src/services/facebook-workflow.ts](/workspace/src/services/facebook-workflow.ts) and executed by the scheduler in [src/services/scheduler.ts](/workspace/src/services/scheduler.ts).

## Why This Exists

The original post pipeline only tracked coarse lifecycle states:

- `draft`
- `scheduled`
- `generating`
- `posted`
- `failed`

That was enough for one-shot generation, but not enough for a Facebook operations loop that needs:

- market/context gathering
- idea generation before drafting
- compliance gating before publish
- engagement feedback after publish
- prompt learning for future posts

The implemented workflow keeps the coarse `status` field for operator-facing state and adds `workflow_stage` for detailed execution progress.

## Data Model

The workflow is stored directly on `scheduled_posts`.

### Columns

- `workflow_stage`: current detailed stage
- `workflow_attempts`: retry counter for workflow execution
- `external_post_id`: Facebook Graph API post id when available
- `last_error`: most recent blocking error
- `metadata`: JSON workflow handoff payload

### Metadata Shape

The `metadata` JSON may contain:

- `workflowVersion`
- `strategyKey`
- `audienceSegment`
- `targetSlotLabel`
- `research`
- `ideas`
- `selectedIdeaIndex`
- `draftContent`
- `compliance`
- `feedback`
- `learning`

## Execution Stages

### 1. Research

Purpose:

- collect current market context
- collect current date context
- pull recent learning notes from prior Facebook posts for the same persona

Inputs:

- current post
- CoinGecko-backed market data service
- prior `learning.nextPromptAdjustments`

Outputs written to metadata:

- `research.marketContext`
- `research.dateContext`
- `research.strategyTags`
- `research.recentLearningNotes`
- `research.generatedAt`

Transition:

- `workflow_stage` becomes `idea_generation`

### 2. Idea Generation

Purpose:

- generate candidate Facebook post angles for Vietnamese investors and salaried employees with investable cash

Mechanism:

- calls `generateCustomContent()` with a structured JSON-only prompt
- expects 2-3 candidate ideas
- falls back to a safe default idea if parsing fails

Outputs written to metadata:

- `ideas[]`
- `selectedIdeaIndex`

Transition:

- `workflow_stage` becomes `drafting`

### 3. Drafting

Purpose:

- produce the actual Facebook post draft using the selected template and generated idea

Mechanism:

- calls `generateContent(templateId, context)`
- injects `strategy_angle`, `content_hook`, `target_audience`, `rationale`, `market_data`, and `date`

Outputs:

- `content`
- `metadata.draftContent`

State change:

- `status` becomes `generating`
- `workflow_stage` becomes `compliance`

### 4. Compliance

Purpose:

- apply deterministic guardrails before publish

Checks currently implemented:

- content must not be empty
- content must remain under a Facebook-friendly length threshold
- content must not contain banned phrases such as guaranteed-return language
- financial disclaimer is appended if missing

Outputs written to metadata:

- `compliance.status`
- `compliance.issues`
- `compliance.finalContent`
- `compliance.checkedAt`

Transitions:

- if checks pass:
  - `status` becomes `scheduled`
  - `workflow_stage` becomes `scheduling`
- if checks fail:
  - `status` becomes `failed`
  - `workflow_stage` remains `compliance`
  - `last_error` is populated

## 5. Scheduling

Purpose:

- hold the post until `scheduled_at` is due

Behavior:

- if `scheduled_at` is missing, the workflow sets it to the current time
- if `scheduled_at` is in the future, the workflow exits without publishing

Transition:

- remains `scheduling` until the scheduler sees the post is due

## 6. Publishing

Purpose:

- publish the approved content to Facebook

Mechanism:

- calls `publishContent('facebook', content)`
- stores the returned `external_post_id`
- stores `posted_at`

Transitions:

- `status` becomes `posted`
- `workflow_stage` becomes `feedback`

Fallback behavior:

- if Facebook credentials are not configured, publish is simulated safely and no external id is stored

## 7. Feedback

Purpose:

- pull post-level engagement metrics and store them in the analytics system

Mechanism:

- if `external_post_id` exists, calls Facebook Graph API fields:
  - reactions summary
  - comments summary
  - shares
- otherwise uses a zeroed snapshot for development/simulated mode

Outputs written to metadata:

- `feedback.likes`
- `feedback.comments`
- `feedback.shares`
- `feedback.fetchedAt`

Analytics side effects:

- writes `like`, `comment`, and `share` rows to `analytics_events`

Transition:

- `workflow_stage` becomes `learning`

## 8. Learning

Purpose:

- derive reusable guidance for future prompts from engagement results

Mechanism:

- heuristic scoring, not a second LLM call
- marks outcomes as `strong`, `average`, `weak`, or `unknown`

Outputs written to metadata:

- `learning.outcome`
- `learning.notes`
- `learning.nextPromptAdjustments`
- `learning.learnedAt`

Transition:

- `workflow_stage` becomes `completed`

## Scheduler Integration

The scheduler runs in [src/services/scheduler.ts](/workspace/src/services/scheduler.ts).

### Cron Behavior

At each tick, it queries due workflow posts from the repository and advances them if:

- `platform = 'facebook'` and `status in ('scheduled', 'generating')` and `scheduled_at <= now`
- or `platform = 'facebook'` and `status = 'posted'` and `workflow_stage in ('feedback', 'learning')`

### Manual Execution

Manual execution also uses the same workflow engine through:

- `POST /api/posts/:id/process`
- `POST /api/posts/:id/workflow/run`

This keeps cron-driven and operator-driven execution on the same code path.

## API Endpoints

### Create Facebook Workflow Post

`POST /api/posts/workflows/facebook`

Purpose:

- create a new Facebook workflow post
- optionally run it immediately through research, ideas, drafting, compliance, and scheduling

Useful request fields:

- `personaId`
- `templateId`
- `scheduledAt`
- `strategyKey`
- `audienceSegment`
- `targetSlotLabel`
- `autoRunToSchedule`

### Advance Workflow Manually

`POST /api/posts/:id/workflow/run`

Purpose:

- advance a workflow from its current stage
- useful for retries, debugging, or forcing progress after edits

### Get Workflow Status

`GET /api/posts/workflows/facebook/status`

Returns:

- scheduler status
- Facebook queue summary

## Frontend Surface

The implemented operator UI lives at:

- [frontend/src/pages/Scheduler.tsx](/workspace/frontend/src/pages/Scheduler.tsx)

It provides:

- scheduler start/stop status
- queue summary cards
- quick schedule form for Facebook workflow posts
- workflow queue table with manual advance actions

The existing post workbench remains available at:

- [frontend/src/pages/Posts.tsx](/workspace/frontend/src/pages/Posts.tsx)

## Failure Handling

If a workflow stage throws:

- `status` becomes `failed`
- `last_error` is recorded
- `workflow_attempts` is incremented
- `workflow_stage` remains at the failing stage for operator inspection

Common failure points:

- missing template on drafting stage
- compliance failure due to banned phrases or empty content
- Facebook API errors during publish or feedback pull

## Environment Requirements

For real Facebook posting and feedback retrieval, configure:

- `FACEBOOK_PAGE_ID`
- `FACEBOOK_PAGE_ACCESS_TOKEN`

Without them:

- publishing is simulated
- feedback returns zeroed values
- the workflow still completes for local development

## Current Limitations

- workflow orchestration is Facebook-first; other platforms are not yet mapped to the same staged pipeline
- compliance is deterministic and rule-based, not a richer review engine
- feedback is metrics-only; comments are not yet ingested or classified
- learning is heuristic, not model-driven
- scheduler state is process-local and in-memory

## Related Files

- [src/services/facebook-workflow.ts](/workspace/src/services/facebook-workflow.ts)
- [src/services/scheduler.ts](/workspace/src/services/scheduler.ts)
- [src/services/publisher.ts](/workspace/src/services/publisher.ts)
- [src/models/repository.ts](/workspace/src/models/repository.ts)
- [src/routes/modules/posts.ts](/workspace/src/routes/modules/posts.ts)
- [frontend/src/pages/Scheduler.tsx](/workspace/frontend/src/pages/Scheduler.tsx)
- [docs/architecture.md](/workspace/docs/architecture.md)
