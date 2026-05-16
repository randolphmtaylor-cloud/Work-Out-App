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

> **Local-only mode:** The app works immediately without Supabase using built-in sample data. Add Supabase env vars and sign in at `/login` to persist imports and manual logs under your authenticated user.

## Setup Guide

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Copy your project URL and anon key to `.env.local`
3. Run the schema migrations in the Supabase SQL editor:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_data.sql`
   - `supabase/migrations/003_workout_categories.sql`
   - `supabase/migrations/004_workout_import_metadata.sql`

4. In **Authentication → Providers → Email**, verify the sign-in method you want:
   - Enable **Email provider** for magic links.
   - Enable email/password sign-ups if you want the `/login` password flow to create accounts.
5. In **Authentication → URL Configuration**, add your local and deployed callback URLs:
   - `http://localhost:3000/auth/callback`
   - `https://YOUR_DOMAIN/auth/callback`

When Supabase is configured, imports and manual workout logs require sign-in and are saved with the authenticated `auth.users.id` as `user_id`. Dashboard, history, progress, coach, and routine data load from Supabase for that user after login.

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
| `/login`     | Supabase email/password, account creation, and magic link sign-in |
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
