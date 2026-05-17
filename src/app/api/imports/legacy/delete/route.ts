import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/user";
import { deleteLegacyImportedHistory } from "@/lib/data";

export async function POST() {
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: userError ?? "Sign in is required." }, { status: 401 });
  }

  const result = await deleteLegacyImportedHistory(userId);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Legacy delete failed" }, { status: 500 });
  }

  return NextResponse.json(result);
}
