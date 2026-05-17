import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { archiveExerciseDefinition, getExercises, saveExerciseDefinition } from "@/lib/data";
import type { ExerciseLibraryCategory, WorkoutTag } from "@/types";

const Categories = ["Strength", "Calisthenics", "Home Workout", "Running/Cardio", "Warmup", "Recovery"] as const;
const Tags = ["push", "pull", "legs", "upper", "lower", "full_body", "core", "home", "compound", "isolation"] as const;

const ExerciseSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1),
  aliases: z.union([z.string(), z.array(z.string())]).optional(),
  library_category: z.enum(Categories).default("Strength"),
  phase_order: z.number().int().min(0).optional(),
  tags: z.array(z.enum(Tags)).optional(),
  notes: z.string().optional(),
});

export async function GET() {
  const exercises = await getExercises();
  return NextResponse.json({
    exercises: exercises.sort((a, b) => {
      const category = (a.library_category ?? "Strength").localeCompare(b.library_category ?? "Strength");
      if (category !== 0) return category;
      return (a.phase_order ?? 0) - (b.phase_order ?? 0) || a.name.localeCompare(b.name);
    }),
  });
}

export async function POST(req: NextRequest) {
  const body = ExerciseSchema.parse(await req.json());
  const result = await saveExerciseDefinition({
    ...body,
    library_category: body.library_category as ExerciseLibraryCategory,
    tags: body.tags as WorkoutTag[] | undefined,
  });
  if (!result.success) {
    return NextResponse.json({ error: result.error, duplicate: result.duplicate }, { status: 409 });
  }
  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const body = ExerciseSchema.extend({ id: z.string().min(1) }).parse(await req.json());
  const result = await saveExerciseDefinition({
    ...body,
    library_category: body.library_category as ExerciseLibraryCategory,
    tags: body.tags as WorkoutTag[] | undefined,
  });
  if (!result.success) {
    return NextResponse.json({ error: result.error, duplicate: result.duplicate }, { status: 409 });
  }
  return NextResponse.json(result);
}

export async function DELETE(req: NextRequest) {
  const { id } = z.object({ id: z.string().min(1) }).parse(await req.json());
  const result = await archiveExerciseDefinition(id);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 404 });
  }
  return NextResponse.json(result);
}
