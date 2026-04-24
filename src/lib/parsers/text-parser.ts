// ============================================================
// Text / pasted log parser
// Handles common workout log formats:
//   "April 5 — Pull Day"
//   "Pull-ups: 3x8, 3x7, 3x6"
//   "Hammer Row: 175x3x6"
//   "Leg Press 320lbs 3 sets 12 reps"
// ============================================================
import { WorkoutSession, WorkoutSet } from "@/types";

interface ParsedSet {
  exercise_name: string;
  sets: Array<{ reps: number; weight_lbs?: number }>;
}

interface ParsedDay {
  date?: string;
  notes?: string;
  exercises: ParsedSet[];
  raw_text: string;
}

// Common date patterns
const DATE_PATTERNS = [
  /(\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s*\d{4})?)/i,
  /(\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/,
  /(\d{4}-\d{2}-\d{2})/,
];

// Set patterns: "3x8", "3 sets x 8 reps", "8 reps", "175x3x6" (weight x sets x reps)
const SET_PATTERNS = [
  // weight x sets x reps: "185x3x6"
  { re: /(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)/i, type: "wxsxr" as const },
  // sets x reps @ weight: "3x8 @ 175lbs"
  { re: /(\d+)\s*[x×]\s*(\d+)\s*@?\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?/i, type: "sxr_w" as const },
  // weight sets reps: "175 3 sets 8 reps"
  { re: /(\d+(?:\.\d+)?)\s*(?:lbs?|kg)\s+(\d+)\s*sets?\s+(\d+)\s*reps?/i, type: "wsxr" as const },
  // sets x reps: "3x8" or "3 sets 8 reps"
  { re: /(\d+)\s*[x×]\s*(\d+)/i, type: "sxr" as const },
  // just reps
  { re: /(\d+)\s*reps?/i, type: "r" as const },
];

function parseMonthYear(raw: string): string | undefined {
  // Try to parse a date string into ISO format
  for (const re of DATE_PATTERNS) {
    const m = raw.match(re);
    if (m) {
      const d = new Date(m[1]);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split("T")[0];
      }
    }
  }
  return undefined;
}

function parseSetsFromLine(line: string): Array<{ reps: number; weight_lbs?: number }> {
  const results: Array<{ reps: number; weight_lbs?: number }> = [];
  let matched = false;

  for (const { re, type } of SET_PATTERNS) {
    const m = line.match(re);
    if (!m) continue;
    matched = true;

    if (type === "wxsxr") {
      const weight = parseFloat(m[1]);
      const sets = parseInt(m[2]);
      const reps = parseInt(m[3]);
      for (let i = 0; i < sets; i++) results.push({ reps, weight_lbs: weight });
    } else if (type === "sxr_w") {
      const sets = parseInt(m[1]);
      const reps = parseInt(m[2]);
      const weight = parseFloat(m[3]);
      for (let i = 0; i < sets; i++) results.push({ reps, weight_lbs: weight });
    } else if (type === "wsxr") {
      const weight = parseFloat(m[1]);
      const sets = parseInt(m[2]);
      const reps = parseInt(m[3]);
      for (let i = 0; i < sets; i++) results.push({ reps, weight_lbs: weight });
    } else if (type === "sxr") {
      const sets = parseInt(m[1]);
      const reps = parseInt(m[2]);
      for (let i = 0; i < sets; i++) results.push({ reps });
    } else if (type === "r") {
      results.push({ reps: parseInt(m[1]) });
    }
    break;
  }

  if (!matched) return [];
  return results;
}

// Check if a line looks like an exercise entry
function isExerciseLine(line: string): boolean {
  if (line.trim().length < 3) return false;
  // Has digit + some pattern
  return /\d/.test(line) && (
    SET_PATTERNS.some(({ re }) => re.test(line)) ||
    /\b(sets?|reps?|x|lbs?|kg)\b/i.test(line)
  );
}

function extractExerciseName(line: string): string {
  // Strip the set/rep info and clean up
  let name = line
    .replace(/(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?\s*[x×]\s*(\d+)\s*[x×]\s*(\d+)/gi, "")
    .replace(/(\d+)\s*[x×]\s*(\d+)\s*@?\s*(\d+(?:\.\d+)?)\s*(?:lbs?|kg)?/gi, "")
    .replace(/(\d+(?:\.\d+)?)\s*(?:lbs?|kg)\s+(\d+)\s*sets?\s+(\d+)\s*reps?/gi, "")
    .replace(/(\d+)\s*[x×]\s*(\d+)/gi, "")
    .replace(/\d+\s*(?:lbs?|kg|reps?|sets?)/gi, "")
    .replace(/[:\-–—,@]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Capitalize words
  return name
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

export interface TextParseResult {
  days: ParsedDay[];
  warnings: string[];
}

export function parseWorkoutText(raw: string): TextParseResult {
  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const warnings: string[] = [];
  const days: ParsedDay[] = [];

  let currentDay: ParsedDay | null = null;
  let currentExercise: ParsedSet | null = null;

  for (const line of lines) {
    // Skip comments
    if (line.startsWith("#") || line.startsWith("//")) continue;

    // Try to detect a date/day header
    const date = parseMonthYear(line);
    const isDayHeader = date !== undefined || /^\s*(day\s*\d+|push|pull|legs|upper|lower|full\s*body|rest)\b/i.test(line);

    if (isDayHeader) {
      if (currentExercise && currentDay) currentDay.exercises.push(currentExercise);
      if (currentDay) days.push(currentDay);
      currentExercise = null;
      currentDay = {
        date,
        notes: isDayHeader && !date ? line : undefined,
        exercises: [],
        raw_text: line,
      };
      continue;
    }

    if (!currentDay) {
      // Create an implicit day for undated entries
      currentDay = { exercises: [], raw_text: line };
    }
    currentDay.raw_text += "\n" + line;

    if (isExerciseLine(line)) {
      const exerciseSets = parseSetsFromLine(line);
      const name = extractExerciseName(line);

      if (!name || exerciseSets.length === 0) {
        warnings.push(`Could not fully parse: "${line}"`);
        continue;
      }

      if (currentExercise && currentExercise.exercise_name === name) {
        // Same exercise — append sets
        currentExercise.sets.push(...exerciseSets);
      } else {
        if (currentExercise) currentDay.exercises.push(currentExercise);
        currentExercise = { exercise_name: name, sets: exerciseSets };
      }
    } else {
      // It's a note/annotation
      if (currentExercise && currentDay) {
        currentDay.exercises.push(currentExercise);
        currentExercise = null;
      }
    }
  }

  if (currentExercise && currentDay) currentDay.exercises.push(currentExercise);
  if (currentDay) days.push(currentDay);

  return { days, warnings };
}

// Convert parsed days → partial WorkoutSession + WorkoutSet records
export function parsedDaysToRecords(
  days: ParsedDay[],
  userId: string,
  exerciseMap: Map<string, string> // canonical_name → id
): Array<{ session: Partial<WorkoutSession>; sets: Partial<WorkoutSet>[] }> {
  return days.map((day) => {
    const sessionId = crypto.randomUUID();
    const sets: Partial<WorkoutSet>[] = [];

    day.exercises.forEach((ex) => {
      const exerciseId = exerciseMap.get(ex.exercise_name.toLowerCase()) ?? null;
      ex.sets.forEach((s, i) => {
        sets.push({
          id: crypto.randomUUID(),
          session_id: sessionId,
          exercise_id: exerciseId ?? undefined,
          set_number: i + 1,
          reps: s.reps,
          weight_lbs: s.weight_lbs,
          is_warmup: false,
          notes: exerciseId ? undefined : `[unmatched exercise: ${ex.exercise_name}]`,
        });
      });
    });

    return {
      session: {
        id: sessionId,
        user_id: userId,
        date: day.date ?? new Date().toISOString().split("T")[0],
        source: "import_text",
        raw_text: day.raw_text,
      },
      sets,
    };
  });
}
