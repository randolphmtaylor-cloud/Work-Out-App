# Architecture — Gym Sessions

## System Overview

```
┌─────────────────────────────────────────────────────────┐
│                    Next.js App (Vercel)                  │
│                                                         │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐             │
│  │ Dashboard│  │  Today   │  │  History  │             │
│  │ /dashboard│  │  /today  │  │ /history  │             │
│  └──────────┘  └──────────┘  └───────────┘             │
│  ┌──────────┐  ┌──────────┐  ┌───────────┐             │
│  │  Import  │  │ Progress │  │  Coach    │             │
│  │ /import  │  │/progress │  │  /coach   │             │
│  └──────────┘  └──────────┘  └───────────┘             │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │               API Routes (server)               │   │
│  │  /api/routines/generate  /api/coach             │   │
│  │  /api/import             /api/summaries/generate│   │
│  └─────────────────────────────────────────────────┘   │
│                                                         │
│  ┌────────────────┐  ┌─────────────┐  ┌─────────────┐ │
│  │  Data Layer    │  │ Routine     │  │ AI Layer    │ │
│  │  lib/data.ts   │  │ Engine      │  │ lib/ai/     │ │
│  │  (Supabase or  │  │ lib/routine-│  │ client.ts   │ │
│  │   mock data)   │  │ engine/     │  │ (Claude)    │ │
│  └────────────────┘  └─────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────┘
           │                           │
    ┌──────▼──────┐           ┌────────▼────────┐
    │  Supabase   │           │  Anthropic API  │
    │  PostgreSQL │           │  Claude Sonnet  │
    └─────────────┘           └─────────────────┘
```

## Data Model

```
equipment (shared/global)
    └── exercises (shared/global)
            └── workout_sets
                    └── workout_sessions (per user)
                            └── training_phases (per user)

generated_routines (per user, per day)
weekly_summaries (per user, per week)
import_logs (per user)
```

## Key Design Decisions

### 1. Demo Mode / Progressive Enhancement
The app works fully in demo mode with mock data when Supabase is not configured. The `lib/data.ts` layer checks for placeholder keys and falls through to mock data. This means the UI renders immediately and the app is usable before any infrastructure is set up.

### 2. Phase System (3-week rotation)
Phases are stored in `training_phases`. The active phase drives rep ranges, rest periods, and exercise emphasis in routine generation. Phase advance logic lives in `lib/routine-engine/index.ts:advancePhase()`.

### 3. Routine Generation Logic
`lib/routine-engine/index.ts` generates routines using:
- Phase config (sets/reps/rest)
- Recent muscle group usage (48h cooldown)
- Last recorded weight for each exercise (used to suggest progression)
- Day rotation (push → pull → legs cycle)
- 30-minute budget constraint

### 4. Import Pipeline
`lib/parsers/text-parser.ts` handles free-form text. It's fault-tolerant — it extracts what it can and flags ambiguous entries as warnings rather than failing. The normalization layer (`lib/parsers/normalize.ts`) maps raw exercise names to canonical IDs using alias matching and token overlap scoring.

### 5. AI Layer
`lib/ai/client.ts` abstracts Claude API calls. Both weekly summaries and coach Q&A build a compact training context string from the user's recent data and pass it as a system-level brief. When the API key is not configured, graceful fallbacks return template-based responses.

## Folder Structure

```
src/
├── app/
│   ├── (dashboard)/        # All authenticated routes (layout with sidebar)
│   │   ├── dashboard/      # Home screen
│   │   ├── today/          # Today's routine
│   │   ├── history/        # Session history
│   │   ├── import/         # Data import
│   │   ├── progress/       # Analytics
│   │   └── coach/          # AI chat + summaries
│   ├── api/                # API routes (server-side only)
│   │   ├── routines/       # Routine generation
│   │   ├── coach/          # AI Q&A
│   │   ├── import/         # Data ingestion
│   │   └── summaries/      # Summary generation
│   └── layout.tsx
├── components/
│   ├── ui/                 # Base UI primitives
│   ├── layout/             # Sidebar, navigation
│   ├── workout/            # Routine display, import forms
│   ├── progress/           # Chart components
│   └── coach/              # Chat interface
├── lib/
│   ├── ai/                 # Anthropic client
│   ├── parsers/            # Text, docx, xlsx parsers + normalizer
│   ├── routine-engine/     # Workout generation + phase management
│   ├── supabase/           # Supabase client (browser + server)
│   ├── utils/              # cn(), date helpers
│   ├── data.ts             # Data access layer (Supabase or mock)
│   └── mock-data.ts        # Sample data for demo mode
├── types/
│   └── index.ts            # All shared TypeScript types
supabase/
├── migrations/
│   ├── 001_initial_schema.sql
│   └── 002_seed_data.sql
```

## Systems Progress App Integration Points

The codebase is structured for future integration with a "Systems Progress App." Key integration points are marked with comments in the source:

1. **`src/types/index.ts` — `WorkoutMetricExport` type**
   A clean export interface for sharing weekly metrics. Expose via `GET /api/v1/export/metrics`.

2. **`src/lib/ai/client.ts` — `generateWeeklySummary` / `answerCoachQuestion`**
   These can be called from a shared microservice or exposed as webhook-friendly endpoints.

3. **`src/lib/data.ts` — all data access functions**
   Wrap these in a versioned REST router (e.g., tRPC or Next.js route handlers) to expose data to other apps.

4. **`src/lib/routine-engine/index.ts` — `generateRoutine`**
   Pure function — can be extracted into a shared package or serverless function callable from Systems Progress App.

### Suggested integration API surface:
```
GET  /api/v1/metrics/week          → WorkoutMetricExport
GET  /api/v1/phase/current         → TrainingPhase
POST /api/v1/routines/generate     → GeneratedRoutine
POST /api/v1/summaries/generate    → WeeklySummary
```
