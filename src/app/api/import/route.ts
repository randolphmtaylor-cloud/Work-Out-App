import { NextRequest, NextResponse } from "next/server";
import { parseWorkoutText } from "@/lib/parsers/text-parser";
import { normalizeExerciseName } from "@/lib/parsers/normalize";
import { insertSessionWithSets, getActivePhase, getExercises, createUnreviewedExercise } from "@/lib/data";
import { WorkoutSession, WorkoutSet } from "@/types";
import { DEMO_USER_ID } from "@/lib/constants/demo";

const DEMO_USER = DEMO_USER_ID;

// exercise canonical_name → id
const buildExMap = (exercises: Array<{ id: string; canonical_name: string; name: string; aliases: string[] }>): Map<string, string> => {
  const m = new Map<string, string>();
  for (const ex of exercises) {
    m.set(ex.canonical_name, ex.id);
    m.set(ex.name.toLowerCase(), ex.id);
    for (const a of ex.aliases) m.set(a.toLowerCase(), ex.id);
  }
  return m;
};

export async function POST(req: NextRequest) {
  const contentType = req.headers.get("content-type") ?? "";
  let rawText = "";
  let fileType: WorkoutSession["source"] = "import_text";

  try {
    if (contentType.includes("application/json")) {
      const body = await req.json();
      rawText = body.text ?? "";
      fileType = "import_text";
    } else if (contentType.includes("multipart/form-data")) {
      const fd = await req.formData();
      const file = fd.get("file") as File | null;
      if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

      const name = file.name.toLowerCase();
      if (name.endsWith(".docx")) {
        fileType = "import_docx";
        const buf = Buffer.from(await file.arrayBuffer());
        const mammoth = (await import("mammoth")).default;
        rawText = (await mammoth.extractRawText({ buffer: buf })).value;
      } else if (name.endsWith(".xlsx") || name.endsWith(".csv")) {
        fileType = "import_xlsx";
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "buffer" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        rawText = XLSX.utils.sheet_to_csv(ws);
      } else {
        fileType = "import_text";
        rawText = await file.text();
      }
    } else {
      rawText = await req.text();
    }
  } catch (err) {
    return NextResponse.json({ error: "Failed to read input" }, { status: 400 });
  }

  if (!rawText.trim()) return NextResponse.json({ error: "Empty input" }, { status: 400 });

  // Parse
  const { days, warnings } = parseWorkoutText(rawText);
  if (!days.length) return NextResponse.json({ error: "No sessions found in input", warnings }, { status: 422 });

  const exercises = await getExercises();
  const exMap = buildExMap(exercises);
  const phase = await getActivePhase(DEMO_USER);
  const createdUnreviewed = new Set<string>();
  let totalSessions = 0;
  let totalSets = 0;

  for (const day of days) {
    const sessionId = crypto.randomUUID();
    const sets: WorkoutSet[] = [];

    for (const ex of day.exercises) {
      const { canonical_name } = normalizeExerciseName(ex.exercise_name, exercises);
      let exerciseId = canonical_name ? exMap.get(canonical_name) : undefined;

      if (!exerciseId) {
        const created = await createUnreviewedExercise(ex.exercise_name, [ex.exercise_name]);
        exerciseId = created.exercise.id;
        exMap.set(created.exercise.canonical_name, created.exercise.id);
        exMap.set(created.exercise.name.toLowerCase(), created.exercise.id);
        for (const alias of created.exercise.aliases) {
          exMap.set(alias.toLowerCase(), created.exercise.id);
        }
        if (created.created) {
          createdUnreviewed.add(created.exercise.name);
        }
      }
      if (!exerciseId) {
        warnings.push(`Could not assign exercise id for "${ex.exercise_name}"`);
        continue;
      }

      ex.sets.forEach((s, i) => {
        sets.push({
          id: crypto.randomUUID(),
          session_id: sessionId,
          exercise_id: exerciseId,
          set_number: i + 1,
          reps: s.reps,
          weight_lbs: s.weight_lbs,
          is_warmup: false,
          created_at: new Date(Date.now() + totalSets * 500).toISOString(),
        });
        totalSets++;
      });
    }

    const session: WorkoutSession = {
      id: sessionId,
      user_id: DEMO_USER,
      date: day.date ?? new Date().toISOString().split("T")[0],
      source: fileType,
      raw_text: day.raw_text,
      phase_id: phase?.id,
      created_at: new Date(Date.now() + totalSessions * 1000).toISOString(),
    };

    await insertSessionWithSets(session, sets);
    totalSessions++;
  }

  return NextResponse.json({
    success: true,
    sessions_parsed: totalSessions,
    sets_parsed: totalSets,
    unreviewed_created: Array.from(createdUnreviewed),
    warnings: [
      ...warnings,
      ...Array.from(createdUnreviewed).map((n) => `Created unreviewed exercise: "${n}"`),
    ],
  });
}