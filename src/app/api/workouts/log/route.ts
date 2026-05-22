// POST /api/workouts/log
// Saves a completed session from the Today page set-tracker.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUnreviewedExercise, insertSessionWithSets, markRoutineComplete, getActivePhase, getExercises } from "@/lib/data";
import { Exercise, WorkoutSession, WorkoutSet } from "@/types";
import { getCurrentUserId } from "@/lib/auth/user";
import { validationIssues } from "@/lib/api/validation";

const OptionalPositiveNumber = z.preprocess((value) => {
  if (value === "" || value === null || value === undefined) return undefined;
  return typeof value === "string" ? Number(value) : value;
}, z.number().positive().optional());

const SetSchema = z.object({
  exercise_id: z.string().optional(),
  exercise_name: z.string().trim().min(1).optional(),
  set_number: z.number().int().positive(),
  reps: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return typeof value === "string" ? Number(value) : value;
  }, z.number().int().positive().optional()),
  weight_lbs: OptionalPositiveNumber,
  bodyweight_lbs: OptionalPositiveNumber,
  is_warmup: z.boolean().default(false),
  rpe: z.preprocess((value) => {
    if (value === "" || value === null || value === undefined) return undefined;
    return typeof value === "string" ? Number(value) : value;
  }, z.number().min(1).max(10).optional()),
  notes: z.string().optional(),
}).refine((set) => Boolean(set.exercise_id || set.exercise_name), {
  message: "exercise_id or exercise_name is required",
});

const LogSchema = z.object({
  routine_id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: z.number().int().positive().max(240),
  workout_type: z.string().trim().min(1).max(50).default("gym"),
  sets: z.array(SetSchema).min(1),
  notes: z.string().optional(),
});

function canonicalName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function findExerciseByName(exercises: Exercise[], name: string) {
  const trimmed = name.trim();
  const lower = trimmed.toLowerCase();
  const canonical = canonicalName(trimmed);
  return exercises.find(
    (exercise) =>
      exercise.name.toLowerCase() === lower ||
      exercise.canonical_name === canonical ||
      (exercise.aliases ?? []).some((alias) => alias.toLowerCase() === lower || canonicalName(alias) === canonical)
  );
}

async function resolveExerciseId(
  set: z.infer<typeof SetSchema>,
  exercises: Exercise[],
  createdExercises: Map<string, Exercise>
) {
  if (set.exercise_id && exercises.some((exercise) => exercise.id === set.exercise_id)) {
    return set.exercise_id;
  }

  if (!set.exercise_name) return null;

  const canonical = canonicalName(set.exercise_name);
  const cached = createdExercises.get(canonical);
  if (cached) return cached.id;

  const existing = findExerciseByName(exercises, set.exercise_name);
  if (existing) {
    createdExercises.set(canonical, existing);
    return existing.id;
  }

  const { exercise } = await createUnreviewedExercise(set.exercise_name);
  createdExercises.set(canonical, exercise);
  exercises.push(exercise);
  return exercise.id;
}

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
    const issues = validationIssues(e);
    console.error("[workouts/log] invalid request", {
      issues,
      error: e,
    });
    return NextResponse.json(
      {
        error: issues.length
          ? "Workout log request has invalid fields."
          : "Workout log request must be valid JSON.",
        issues,
      },
      { status: 400 }
    );
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

  const exercises = await getExercises();
  const createdExercises = new Map<string, Exercise>();
  const sets: WorkoutSet[] = [];
  for (const [i, s] of body.sets.entries()) {
    const exerciseId = await resolveExerciseId(s, exercises, createdExercises);
    if (!exerciseId) {
      console.warn("[workouts/log] set has unresolved exercise", {
        setNumber: s.set_number,
        hasExerciseId: Boolean(s.exercise_id),
        hasExerciseName: Boolean(s.exercise_name),
      });
      return NextResponse.json(
        { error: "One exercise could not be matched to your exercise library. Add or rename it, then try again." },
        { status: 400 }
      );
    }

    sets.push({
      id: crypto.randomUUID(),
      session_id: sessionId,
      exercise_id: exerciseId,
      set_number: s.set_number,
      reps: s.reps,
      weight_lbs: s.weight_lbs,
      bodyweight_lbs: s.bodyweight_lbs,
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
      { error: error instanceof Error ? error.message : "Workout save failed. Your entries were not cleared. Please try again." },
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
