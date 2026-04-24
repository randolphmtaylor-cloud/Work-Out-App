import { NextRequest, NextResponse } from "next/server";
import { generateRoutine } from "@/lib/routine-engine";
import { getActivePhase, getRecentSessions, getAllSets, saveGeneratedRoutine } from "@/lib/data";
import { WorkoutTag } from "@/types";
import { DEMO_USER_ID } from "@/lib/constants/demo";

const DEMO_USER = DEMO_USER_ID;

export async function POST(req: NextRequest) {
  let workoutType: WorkoutTag | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body.workout_type) workoutType = body.workout_type as WorkoutTag;
  } catch {}

  const [phase, recentSessions, allSets] = await Promise.all([
    getActivePhase(DEMO_USER),
    getRecentSessions(DEMO_USER, 14), // 2 weeks of sessions for variety detection
    getAllSets(DEMO_USER),
  ]);

  if (!phase) {
    return NextResponse.json({ error: "No active training phase found" }, { status: 404 });
  }

  const routine = generateRoutine({ phase, recentSessions, allSets, workoutType, userId: DEMO_USER });
  await saveGeneratedRoutine(routine);

  return NextResponse.json(routine);
}