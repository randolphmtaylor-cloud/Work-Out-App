// POST /api/export/workout
// Writes a completed workout to the shared activity_exports table so the
// Progress App can import it into daily notes.
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/auth/user";
import { validationIssues } from "@/lib/api/validation";
import type { DailyActivityExport } from "@/lib/export/types";

const ExerciseSetSchema = z.object({
  exercise_name: z.string(),
  set_number: z.number().int().positive(),
  reps: z.number().int().positive().optional(),
  weight_lbs: z.number().positive().optional(),
  bodyweight_lbs: z.number().nonnegative().optional(),
});

const ExerciseGroupSchema = z.object({
  exercise_id: z.string(),
  exercise_name: z.string(),
  sets: z.array(ExerciseSetSchema),
});

const ExportSchema = z.object({
  session_id: z.string().uuid(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  workout_type: z.string(),
  duration_minutes: z.number().int().positive(),
  bodyweight_lbs: z.number().positive().optional(),
  exercises: z.array(ExerciseGroupSchema),
});

type ExportBody = z.infer<typeof ExportSchema>;

function formatDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function buildMarkdown(body: ExportBody): string {
  const title = `${body.workout_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Workout`;
  const lines: string[] = [
    `## ${title}`,
    "",
    `**Date:** ${formatDate(body.date)}`,
  ];

  if (body.bodyweight_lbs) {
    lines.push(`**Bodyweight:** ${body.bodyweight_lbs} lbs`);
  }

  if (body.exercises.length > 0) {
    lines.push("", "### Exercises", "");
    for (const ex of body.exercises) {
      lines.push(`**${ex.exercise_name}**`);
      for (const s of ex.sets) {
        const weight =
          s.weight_lbs != null
            ? `${s.weight_lbs} lbs`
            : s.bodyweight_lbs != null
              ? "Bodyweight"
              : "—";
        const reps = s.reps != null ? `× ${s.reps}` : "";
        lines.push(`${weight} ${reps}`.trim());
      }
      lines.push("");
    }
  }

  const totalSets = body.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalReps = body.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s2, s) => s2 + (s.reps ?? 0), 0),
    0,
  );
  const totalVolume = body.exercises.reduce(
    (sum, ex) =>
      sum +
      ex.sets.reduce((s2, s) => {
        const w = s.weight_lbs ?? s.bodyweight_lbs ?? 0;
        return s2 + w * (s.reps ?? 0);
      }, 0),
    0,
  );

  lines.push("### Stats", "");
  lines.push(`- **Sets:** ${totalSets}`);
  lines.push(`- **Reps:** ${totalReps}`);
  lines.push(`- **Volume:** ${totalVolume.toLocaleString()} lbs`);
  lines.push(`- **Duration:** ${body.duration_minutes} min`);

  return lines.join("\n");
}

function buildExport(userId: string, body: ExportBody): DailyActivityExport & { user_id: string } {
  const totalSets = body.exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const totalReps = body.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s2, s) => s2 + (s.reps ?? 0), 0),
    0,
  );
  const totalVolume = Math.round(
    body.exercises.reduce(
      (sum, ex) =>
        sum +
        ex.sets.reduce((s2, s) => {
          const w = s.weight_lbs ?? s.bodyweight_lbs ?? 0;
          return s2 + w * (s.reps ?? 0);
        }, 0),
      0,
    ),
  );

  const workoutType = body.workout_type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const title = `${workoutType} Workout`;

  return {
    user_id: userId,
    source: "gym-sessions",
    sourceRecordId: body.session_id,
    date: body.date,
    title,
    content: buildMarkdown(body),
    metrics: {
      workoutCompleted: true,
      workoutDurationMinutes: body.duration_minutes,
      workoutVolume: totalVolume,
      bodyweight: body.bodyweight_lbs,
      exercisesCompleted: body.exercises.length,
      setsCompleted: totalSets,
      repsCompleted: totalReps,
    },
  };
}

export async function POST(req: NextRequest) {
  const { userId, error: userError } = await getCurrentUserId({ requireAuth: true });
  if (!userId) {
    return NextResponse.json({ error: userError ?? "Sign in required." }, { status: 401 });
  }

  let body: ExportBody;
  try {
    body = ExportSchema.parse(await req.json());
  } catch (e) {
    const issues = validationIssues(e);
    return NextResponse.json(
      { error: "Invalid export request.", issues },
      { status: 400 },
    );
  }

  const exportRecord = buildExport(userId, body);

  const supabase = await createClient();
  const { error } = await supabase.from("activity_exports").upsert(
    {
      user_id: exportRecord.user_id,
      source: exportRecord.source,
      source_record_id: exportRecord.sourceRecordId,
      date: exportRecord.date,
      title: exportRecord.title,
      content: exportRecord.content,
      metrics: exportRecord.metrics,
    },
    { onConflict: "user_id,source,source_record_id" },
  );

  if (error) {
    console.error("[export/workout] upsert failed", error);
    return NextResponse.json({ error: "Export failed. Please try again." }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
