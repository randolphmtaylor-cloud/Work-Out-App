# Gym Sessions — AI Strength Coach

A production-ready personal strength coaching app that ingests your workout history, tracks your progress, generates personalized routines, and answers training questions via AI.

## Features

- **Smart Routine Generation** — Auto-generated 30-minute workouts based on your phase, recent history, and equipment
- **3-Week Training Phases** — Automatic phase rotation (Accumulation → Intensification → Density)
- **Workout Import** — Paste text logs, upload .docx, .xlsx, or .csv files
- **Progress Analytics** — Lift progression charts, consistency tracking, plateau detection
- **AI Coach** — Ask questions like "How am I doing?" or "Where am I plateauing?" using Claude
- **Weekly Summaries** — AI-generated coaching summaries every week

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env.local

# 3. Add your API keys to .env.local
#    - NEXT_PUBLIC_SUPABASE_URL
#    - NEXT_PUBLIC_SUPABASE_ANON_KEY
#    - ANTHROPIC_API_KEY

# 4. Run the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

> **Demo mode:** The app works immediately without API keys using built-in sample data. Connect Supabase and Anthropic to unlock persistence and AI features.

## Setup Guide

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Run the schema migrations in the Supabase SQL editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_data.sql`

### Anthropic API

1. Get an API key from [console.anthropic.com](https://console.anthropic.com)
2. Add it as `ANTHROPIC_API_KEY=sk-ant-...` in `.env.local`

## Deployment (Vercel)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add all environment variables in the Vercel dashboard under **Settings → Environment Variables**.

## Tech Stack

| Layer       | Technology              |
|-------------|-------------------------|
| Framework   | Next.js 16 (App Router) |
| Language    | TypeScript              |
| Styling     | Tailwind CSS v4         |
| UI          | Custom shadcn-style     |
| Database    | Supabase (PostgreSQL)   |
| Auth        | Supabase Auth           |
| AI          | Anthropic Claude        |
| Charts      | Recharts                |
| Validation  | Zod                     |
| File parsing| mammoth (docx), xlsx    |

## App Screens

| Route        | Description                                  |
|--------------|----------------------------------------------|
| `/dashboard` | Home: stats, phase progress, today's preview |
| `/today`     | Today's generated workout with set tracking  |
| `/history`   | All past sessions grouped by month           |
| `/import`    | Text paste + file upload import              |
| `/progress`  | Charts: lifts, consistency, plateaus, gear   |
| `/coach`     | AI chat + weekly summary                     |

## Implementation Order

1. ✅ Architecture plan + README
2. ✅ App skeleton + database schema
3. ✅ Import/parsing pipeline
4. ✅ Routine generation engine
5. ✅ Analytics and charts
6. ✅ AI summaries and chat
7. ✅ Deployment configuration

See [ARCHITECTURE.md](ARCHITECTURE.md) for the full system design.
