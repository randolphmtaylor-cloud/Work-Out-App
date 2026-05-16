import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { mapUnreviewedExerciseToCanonical } from "@/lib/data";

const BodySchema = z.object({
  exercise_id: z.string().min(1),
  canonical_exercise_id: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = BodySchema.parse(await req.json());
    const result = await mapUnreviewedExerciseToCanonical(
      body.exercise_id,
      body.canonical_exercise_id
    );
    return NextResponse.json({ success: true, ...result });
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

