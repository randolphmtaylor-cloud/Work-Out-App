import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUserId } from "@/lib/auth/user";
import { deleteWorkoutGoal, saveWorkoutGoal } from "@/lib/data";

const GoalSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).default(""),
  focus_area: z.string().trim().min(1).max(50),
  status: z.enum(["active", "archived"]),
});

type Params = { params: Promise<{ id: string }> };

function refreshGoalViews() {
  revalidatePath("/goals");
  revalidatePath("/today");
  revalidatePath("/dashboard");
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { userId, error } = await getCurrentUserId({ requireAuth: true });
  if (!userId) return NextResponse.json({ error: error ?? "Sign in is required." }, { status: 401 });
  const parsed = GoalSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: "Goal fields are invalid." }, { status: 400 });
  const result = await saveWorkoutGoal(userId, { id, ...parsed.data });
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 400 });
  refreshGoalViews();
  return NextResponse.json(result);
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { userId, error } = await getCurrentUserId({ requireAuth: true });
  if (!userId) return NextResponse.json({ error: error ?? "Sign in is required." }, { status: 401 });
  const result = await deleteWorkoutGoal(userId, id);
  if (!result.success) return NextResponse.json({ error: result.error }, { status: 404 });
  refreshGoalViews();
  return NextResponse.json(result);
}
