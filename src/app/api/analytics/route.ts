import { NextResponse } from "next/server";
import { getSessions, getAllSets } from "@/lib/data";
import { computeAnalytics } from "@/lib/analytics";
import { DEMO_USER_ID } from "@/lib/constants/demo";

const DEMO_USER = DEMO_USER_ID;

export async function GET() {
  const [sessions, sets] = await Promise.all([
    getSessions(DEMO_USER),
    getAllSets(DEMO_USER),
  ]);
  const analytics = computeAnalytics(sessions, sets);
  return NextResponse.json(analytics);
}