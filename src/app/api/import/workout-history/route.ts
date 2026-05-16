import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/user";
import { importBundledWorkoutHistory } from "@/lib/importers/workout-history";

export async function POST() {
  const { userId, error } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: error ?? "Sign in is required before importing workout history." }, { status: 401 });
  }

  const result = await importBundledWorkoutHistory(userId);
  return NextResponse.json({ success: result.errors.length === 0, ...result });
}
