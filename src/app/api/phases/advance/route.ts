import { NextResponse } from "next/server";
import { getActivePhase, advancePhaseInStore } from "@/lib/data";
import { buildNextPhase } from "@/lib/routine-engine";

const DEMO_USER = "demo-user";

export async function POST() {
  const current = await getActivePhase(DEMO_USER);
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
