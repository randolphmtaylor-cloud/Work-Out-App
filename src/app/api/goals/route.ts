import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/user";
import { getGoals, saveWorkoutGoal } from "@/lib/data";

const GoalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).default(""),
  focus_area: z.string().trim().min(1).max(50),
  status: z.enum(["active", "archived"]).default("active"),
});

export async function GET() {
  const { userId, error } = await getCurrentUserId({ requireAuth: true });
  if (!userId) return NextResponse.json({ error: error ?? "Sign in is required." }, { status: 401 });
  return NextResponse.json({ goals: await getGoals(userId, { ensureStarter: true }) });
}

export async function POST(req: NextRequest) {
  const { userId, error } = await getCurrentUserId({ requireAuth: true });
  if (!userId) return NextResponse.json({ error: error ?? "Sign in is required." }, { status: 401 });
  const parsed = GoalSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Goal fields are invalid." }, { status: 400 });
  const result = await saveWorkoutGoal(userId, parsed.data);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
  revalidatePath("/goals");
  revalidatePath("/today");
  return NextResponse.json(result);
}
