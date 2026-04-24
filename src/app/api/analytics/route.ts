import { NextResponse } from "next/server";
import { getSessions, getAllSets } from "@/lib/data";
import { computeAnalytics } from "@/lib/analytics";

const DEMO_USER = "demo-user";

export async function GET() {
  const [sessions, sets] = await Promise.all([
    getSessions(DEMO_USER),
    getAllSets(DEMO_USER),
  ]);
  const analytics = computeAnalytics(sessions, sets);
  return NextResponse.json(analytics);
}
