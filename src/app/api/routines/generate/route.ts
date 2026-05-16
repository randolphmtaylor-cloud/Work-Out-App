import { NextRequest, NextResponse } from "next/server";
import { generateRoutine } from "@/lib/routine-engine";
import { getActivePhase, getRecentSessions, getAllSets, saveGeneratedRoutine } from "@/lib/data";
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

  const [phase, recentSessions, allSets] = await Promise.all([
    getActivePhase(userId),
    getRecentSessions(userId, 14), // 2 weeks of sessions for variety detection
    getAllSets(userId),
  ]);

  if (!phase) {
    return NextResponse.json({ error: "No active training phase found" }, { status: 404 });
  }

  const routine = generateRoutine({ phase, recentSessions, allSets, workoutType, userId });
  await saveGeneratedRoutine(routine);

  return NextResponse.json(routine);
}
