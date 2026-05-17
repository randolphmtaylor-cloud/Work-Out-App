import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/user";
import { undoImportBatch } from "@/lib/data";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: userError ?? "Sign in is required." }, { status: 401 });
  }

  const { id } = await params;
  const result = await undoImportBatch(userId, id);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Undo failed" }, { status: 500 });
  }

  return NextResponse.json(result);
}
