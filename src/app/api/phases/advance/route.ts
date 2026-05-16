import { NextResponse } from "next/server";
import { getActivePhase, advancePhaseInStore } from "@/lib/data";
import { buildNextPhase } from "@/lib/routine-engine";
import { getCurrentUserId } from "@/lib/auth/user";

export async function POST() {
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: userError ?? "Sign in is required before advancing phases." }, { status: 401 });
  }

  const current = await getActivePhase(userId);
  if (!current) {
    return NextResponse.json({ error: "No active phase found" }, { status: 404 });
  }

  const next = buildNextPhase(current);
  await advancePhaseInStore(next);

  return NextResponse.json({
    success: true,
    previous: current.name,
    next: { name: next.name, type: next.phase_type, reps: `${next.rep_range_low}–${next.rep_range_high}` },
  });
}
