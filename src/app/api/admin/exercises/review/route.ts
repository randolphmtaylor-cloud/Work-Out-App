import { NextResponse } from "next/server";
import { getCanonicalExercises, getUnreviewedExercises } from "@/lib/data";

export async function GET() {
  const [canonical, unreviewed] = await Promise.all([
    getCanonicalExercises(),
    getUnreviewedExercises(),
  ]);

  return NextResponse.json({
    canonical,
    unreviewed,
  });
}

