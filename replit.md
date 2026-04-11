# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI Integration**: OpenAI (via Replit AI Integrations) for OCR/vision

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Artifacts

### Japanese Flashcards (jp-flashcards)
- **Path**: `/` (root)
- **Type**: React + Vite frontend
- **Description**: Spaced repetition flashcard app for Japanese/English vocabulary with WaniKani-style SRS stages

**Features:**
- Upload screenshots → AI (GPT-4o Vision) extracts vocabulary pairs automatically
- Edit extracted pairs before adding to deck
- 9 SRS stages: Apprentice 1-4, Guru 1-2, Master, Enlightened, Burned
- Lesson mode: review new cards
- Review mode: type English answers, immediate feedback
- Dashboard: reviews due, lessons queue, stage distribution, accuracy
- Vocabulary browser: searchable, filterable, editable
- Stats page: 7-day accuracy chart, stage distribution pie chart
- All data stored in localStorage — no account needed

**Key Files:**
- `artifacts/jp-flashcards/src/lib/srs.ts` — SRS algorithm implementation
- `artifacts/jp-flashcards/src/lib/storage.ts` — localStorage operations
- `artifacts/api-server/src/routes/ocr.ts` — OCR endpoint using OpenAI vision
- `lib/api-spec/openapi.yaml` — API spec with /ocr/extract endpoint

**SRS Intervals:**
- Apprentice 1: 4h, Apprentice 2: 8h, Apprentice 3: 1d, Apprentice 4: 2d
- Guru 1: 7d, Guru 2: 14d
- Master: 30d, Enlightened: 120d, Burned: never reviewed again
