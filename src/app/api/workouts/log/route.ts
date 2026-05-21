// POST /api/workouts/log
// Saves a completed session from the Today page set-tracker.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUnreviewedExercise, insertSessionWithSets, markRoutineComplete, getActivePhase } from "@/lib/data";
import { WorkoutSession, WorkoutSet } from "@/types";
import { getCurrentUserId } from "@/lib/auth/user";

const SetSchema = z.object({
  exercise_id: z.string().optional(),
  exercise_name: z.string().trim().min(1).optional(),
  set_number: z.number().int().positive(),
  reps: z.number().int().positive().optional(),
  weight_lbs: z.number().positive().optional(),
  is_warmup: z.boolean().default(false),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
}).refine((set) => Boolean(set.exercise_id || set.exercise_name), {
  message: "exercise_id or exercise_name is required",
});

const LogSchema = z.object({
  routine_id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: z.number().int().positive().max(240),
  workout_type: z.enum(["gym", "home", "push", "pull", "legs", "upper", "lower", "full_body", "core"]).default("gym"),
  sets: z.array(SetSchema).min(1),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  console.log("[workouts/log] request received");
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    console.error("[workouts/log] auth failed", userError);
    return NextResponse.json({ error: userError ?? "Sign in is required before logging workouts." }, { status: 401 });
  }

  let body: z.infer<typeof LogSchema>;
  try {
    body = LogSchema.parse(await req.json());
  } catch (e) {
    console.error("[workouts/log] invalid request", e);
    return NextResponse.json({ error: "Invalid request", details: e }, { status: 400 });
  }

  const phase = await getActivePhase(userId);
  const sessionId = crypto.randomUUID();

  const sessionNotes = [
    body.workout_type === "home" ? "Home Workout" : undefined,
    body.notes,
  ].filter(Boolean).join(" · ");

  const session: WorkoutSession = {
    id: sessionId,
    user_id: userId,
    date: body.date,
    notes: sessionNotes || undefined,
    workout_type: body.workout_type,
    source: "manual",
    duration_minutes: body.duration_minutes,
    phase_id: phase?.id,
    created_at: new Date().toISOString(),
  };

  const sets: WorkoutSet[] = [];
  for (const [i, s] of body.sets.entries()) {
    let exerciseId = s.exercise_id;
    if (!exerciseId && s.exercise_name) {
      const { exercise } = await createUnreviewedExercise(s.exercise_name);
      exerciseId = exercise.id;
    }

    if (!exerciseId) {
      return NextResponse.json({ error: "Invalid exercise" }, { status: 400 });
    }

    sets.push({
      id: crypto.randomUUID(),
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: s.set_number,
      reps: s.reps,
      weight_lbs: s.weight_lbs,
      is_warmup: s.is_warmup,
      rpe: s.rpe,
      notes: s.notes,
      created_at: new Date(Date.now() + i * 1000).toISOString(),
    });
  }

  try {
    await insertSessionWithSets(session, sets);

    if (body.routine_id) {
      await markRoutineComplete(body.routine_id, sessionId);
    }
  } catch (error) {
    console.error("[workouts/log] save failed", {
      sessionId,
      userId,
      date: body.date,
      workoutType: body.workout_type,
      setCount: sets.length,
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Workout save failed. Your entries were not cleared." },
      { status: 500 }
    );
  }

  console.log("[workouts/log] save succeeded", {
    sessionId,
    userId,
    date: body.date,
    workoutType: body.workout_type,
    setCount: sets.length,
  });
  return NextResponse.json({ success: true, session_id: sessionId, sets_logged: sets.length });
}
