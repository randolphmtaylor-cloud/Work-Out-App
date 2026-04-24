// POST /api/workouts/log
// Saves a completed session from the Today page set-tracker.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { insertSessionWithSets, markRoutineComplete, getActivePhase } from "@/lib/data";
import { WorkoutSession, WorkoutSet } from "@/types";

const DEMO_USER = "demo-user";

const SetSchema = z.object({
  exercise_id: z.string(),
  set_number: z.number().int().positive(),
  reps: z.number().int().positive().optional(),
  weight_lbs: z.number().positive().optional(),
  is_warmup: z.boolean().default(false),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
});

const LogSchema = z.object({
  routine_id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: z.number().int().positive().max(120),
  sets: z.array(SetSchema).min(1),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  let body: z.infer<typeof LogSchema>;
  try {
    body = LogSchema.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ error: "Invalid request", details: e }, { status: 400 });
  }

  const phase = await getActivePhase(DEMO_USER);
  const sessionId = crypto.randomUUID();

  const session: WorkoutSession = {
    id: sessionId,
    user_id: DEMO_USER,
    date: body.date,
    notes: body.notes,
    source: "manual",
    duration_minutes: body.duration_minutes,
    phase_id: phase?.id,
    created_at: new Date().toISOString(),
  };

  const sets: WorkoutSet[] = body.sets.map((s, i) => ({
    id: crypto.randomUUID(),
    session_id: sessionId,
    exercise_id: s.exercise_id,
    set_number: s.set_number,
    reps: s.reps,
    weight_lbs: s.weight_lbs,
    is_warmup: s.is_warmup,
    rpe: s.rpe,
    notes: s.notes,
    created_at: new Date(Date.now() + i * 1000).toISOString(),
  }));

  await insertSessionWithSets(session, sets);

  if (body.routine_id) {
    await markRoutineComplete(body.routine_id, sessionId);
  }

  return NextResponse.json({ success: true, session_id: sessionId, sets_logged: sets.length });
}
