import { NextRequest, NextResponse } from "next/server";
import { buildDefaultPhase, generateRoutine } from "@/lib/routine-engine";
import { createDefaultActivePhase, getActivePhase, getRecentSessions, getAllSets, saveGeneratedRoutine } from "@/lib/data";
import { WorkoutTag } from "@/types";
import { getCurrentUserId } from "@/lib/auth/user";

export async function POST(req: NextRequest) {
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: userError ?? "Sign in is required before generating routines." }, { status: 401 });
  }

  let workoutType: WorkoutTag | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.workout_type) workoutType = body.workout_type as WorkoutTag;
  } catch {}

  try {
    let [phase, recentSessions, allSets] = await Promise.all([
      getActivePhase(userId),
      getRecentSessions(userId, 14), // 2 weeks of sessions for variety detection
      getAllSets(userId),
    ]);

    if (!phase) {
      const defaultPhase = buildDefaultPhase(userId);
      phase = await createDefaultActivePhase(defaultPhase);
      if (!phase) {
        console.error("[routines/generate] failed to create default active phase", {
          userId,
          defaultPhaseId: defaultPhase.id,
          defaultPhaseName: defaultPhase.name,
        });
        return NextResponse.json(
          {
            error: "No active training phase exists, and the app could not create a starter phase.",
            action: "Create or select an active training phase, then try New Routine again.",
          },
          { status: 500 }
        );
      }
    }

    const routine = generateRoutine({ phase, recentSessions, allSets, workoutType, userId });
    const saveResult = await saveGeneratedRoutine(routine);
    if (!saveResult.saved) {
      console.error("[routines/generate] failed to save generated routine", {
        userId,
        phaseId: phase.id,
        routineId: routine.id,
        workoutType: routine.workout_type,
        error: saveResult.error,
      });
      return NextResponse.json(
        { error: saveResult.error ?? "Generated routine could not be saved." },
        { status: 500 }
      );
    }

    return NextResponse.json(routine);
  } catch (error) {
    console.error("[routines/generate] unexpected generation failure", {
      userId,
      workoutType,
      error,
    });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unexpected routine generation failure." },
      { status: 500 }
    );
  }
}
