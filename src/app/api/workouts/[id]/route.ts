import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createUnreviewedExercise, deleteWorkoutSession, getWorkoutSessionWithSets, updateWorkoutSessionWithSets } from "@/lib/data";
import { getCurrentUserId } from "@/lib/auth/user";
import type { WorkoutSet } from "@/types";
import { validationIssues } from "@/lib/api/validation";

const SetSchema = z.object({
  id: z.string().optional(),
  exercise_id: z.string().optional(),
  exercise_name: z.string().trim().min(1).optional(),
  set_number: z.number().int().positive(),
  reps: z.number().int().positive().optional(),
  weight_lbs: z.number().positive().optional(),
  bodyweight_lbs: z.number().nonnegative().optional(),
  is_warmup: z.boolean().default(false),
  rpe: z.number().min(1).max(10).optional(),
  notes: z.string().optional(),
}).refine((set) => Boolean(set.exercise_id || set.exercise_name), {
  message: "exercise_id or exercise_name is required",
});

const WorkoutUpdateSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  duration_minutes: z.number().int().positive().max(480).optional(),
  workout_type: z.string().trim().min(1).optional(),
  notes: z.string().optional(),
  sets: z.array(SetSchema).min(1),
});

type Params = {
  params: Promise<{ id: string }>;
};

function refreshWorkoutViews() {
  revalidatePath("/history");
  revalidatePath("/dashboard");
  revalidatePath("/progress");
  revalidatePath("/coach");
  revalidatePath("/exercises");
}

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: userError ?? "Sign in is required." }, { status: 401 });
  }

  const result = await getWorkoutSessionWithSets(userId, id);
  if (!result) {
    return NextResponse.json({ error: "Workout session not found." }, { status: 404 });
  }
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: userError ?? "Sign in is required." }, { status: 401 });
  }

  let body: z.infer<typeof WorkoutUpdateSchema>;
  try {
    body = WorkoutUpdateSchema.parse(await req.json());
  } catch (error) {
    const issues = validationIssues(error);
    console.error("[workouts/:id] invalid update request", {
      id,
      userId,
      issues,
      error,
    });
    return NextResponse.json(
      {
        error: issues.length
          ? "Workout update request has invalid fields."
          : "Workout update request must be valid JSON.",
        issues,
      },
      { status: 400 }
    );
  }

  const now = new Date().toISOString();
  const sets: WorkoutSet[] = [];
  for (const [index, set] of body.sets.entries()) {
    let exerciseId = set.exercise_id;
    if (!exerciseId && set.exercise_name) {
      const { exercise } = await createUnreviewedExercise(set.exercise_name);
      exerciseId = exercise.id;
    }
    if (!exerciseId) {
      return NextResponse.json({ error: "Invalid exercise." }, { status: 400 });
    }
    sets.push({
      id: set.id || crypto.randomUUID(),
      session_id: id,
      exercise_id: exerciseId,
      set_number: set.set_number,
      reps: set.reps,
      weight_lbs: set.weight_lbs,
      bodyweight_lbs: set.bodyweight_lbs,
      is_warmup: set.is_warmup,
      rpe: set.rpe,
      notes: set.notes,
      created_at: new Date(Date.now() + index * 1000).toISOString(),
    });
  }

  const result = await updateWorkoutSessionWithSets(
    userId,
    {
      id,
      date: body.date,
      notes: body.notes,
      workout_type: body.workout_type,
      duration_minutes: body.duration_minutes,
    },
    sets
  );
  if (!result.success) {
    console.error("[workouts/:id] update failed", { id, userId, error: result.error });
    return NextResponse.json({ error: result.error ?? "Workout update failed." }, { status: 500 });
  }

  refreshWorkoutViews();
  return NextResponse.json({ ...result, updated_at: now });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: userError ?? "Sign in is required." }, { status: 401 });
  }

  const result = await deleteWorkoutSession(userId, id);
  if (!result.success) {
    console.error("[workouts/:id] delete failed", { id, userId, error: result.error });
    return NextResponse.json({ error: result.error ?? "Workout delete failed." }, { status: 404 });
  }

  refreshWorkoutViews();
  return NextResponse.json(result);
}
