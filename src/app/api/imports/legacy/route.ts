import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth/user";
import { assignLegacyImportBatch, getLegacyImportPreview } from "@/lib/data";

export async function GET() {
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: userError ?? "Sign in is required." }, { status: 401 });
  }

  const preview = await getLegacyImportPreview(userId);
  return NextResponse.json(preview);
}

export async function POST() {
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: userError ?? "Sign in is required." }, { status: 401 });
  }

  const result = await assignLegacyImportBatch(userId);
  if (!result.success) {
    return NextResponse.json({ error: result.error ?? "Legacy assignment failed" }, { status: 500 });
  }

  return NextResponse.json(result);
}
