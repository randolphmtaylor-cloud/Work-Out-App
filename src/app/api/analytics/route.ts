import { NextResponse } from "next/server";
import { getSessions, getAllSets } from "@/lib/data";
import { computeAnalytics } from "@/lib/analytics";
import { getCurrentUserId } from "@/lib/auth/user";

export async function GET() {
  const { userId } = await getCurrentUserId();
  const [sessions, sets] = await Promise.all([
    getSessions(userId),
    getAllSets(userId),
  ]);
  const analytics = computeAnalytics(sessions, sets);
  return NextResponse.json(analytics);
}
