import { NextRequest, NextResponse } from "next/server";
import { getActivePhase, advancePhaseInStore, activatePhaseInStore, updatePhaseInStore } from "@/lib/data";
import { buildNextPhase } from "@/lib/routine-engine";
import { getCurrentUserId } from "@/lib/auth/user";

export async function POST(request: NextRequest) {
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: userError ?? "Sign in is required before advancing phases." }, { status: 401 });
  }

  const current = await getActivePhase(userId);
  if (!current) {
    return NextResponse.json({ error: "No active phase found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "advance";

  if (action === "preview" || action === "regenerate") {
    const preview = buildNextPhase(current);
    return NextResponse.json({ success: true, preview, changes: {
      retained: "Foundational compound patterns and recent measurable lifts",
      new: "Accessory variations, ordering, and upper-body superset pairings",
      removed: "A portion of prior accessory work to create useful variation",
    } });
  }

  if (action === "activate") {
    if (!body.phase_id) return NextResponse.json({ error: "A phase is required." }, { status: 400 });
    const activated = await activatePhaseInStore(userId, body.phase_id);
    if (!activated) return NextResponse.json({ error: "Phase not found." }, { status: 404 });
    return NextResponse.json({ success: true, phase: activated });
  }

  if (action === "extend") {
    const days = Math.max(1, Math.min(28, Number(body.days) || 7));
    const end = new Date(`${current.end_date}T12:00:00`);
    end.setDate(end.getDate() + days);
    const phase = await updatePhaseInStore(userId, current.id, { end_date: end.toISOString().split("T")[0] });
    return NextResponse.json({ success: Boolean(phase), phase });
  }

  if (action === "edit") {
    const low = Number(body.rep_range_low ?? current.rep_range_low);
    const high = Number(body.rep_range_high ?? current.rep_range_high);
    if (low < 1 || high > 10 || low > high) return NextResponse.json({ error: "Rep range must stay between 1 and 10." }, { status: 400 });
    const phase = await updatePhaseInStore(userId, current.id, {
      name: String(body.name ?? current.name).trim().slice(0, 80),
      description: String(body.description ?? current.description).trim().slice(0, 500),
      rep_range_low: low,
      rep_range_high: high,
    });
    return NextResponse.json({ success: Boolean(phase), phase });
  }

  const next = buildNextPhase(current);
  await advancePhaseInStore(next);

  return NextResponse.json({
    success: true,
    previous: current.name,
    next: { name: next.name, type: next.phase_type, reps: `${next.rep_range_low}–${next.rep_range_high}` },
  });
}
