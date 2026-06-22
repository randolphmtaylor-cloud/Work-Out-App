"use client";

import { useEffect, useRef, useState } from "react";
import { Clock, Home, Pause, Play, RotateCcw, Thermometer, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateRoutineButton } from "@/components/workout/generate-routine-button";
import { HomeWorkoutLogger } from "@/components/workout/home-workout-logger";
import { SessionLogger } from "@/components/workout/session-logger";
import type { SessionSnapshot } from "@/components/workout/session-logger";
import { BodyweightInput } from "@/components/workout/bodyweight-input";
import { cn } from "@/lib/utils/cn";
import type { GeneratedRoutine } from "@/types";

const TYPE_BADGE: Record<string, "push" | "pull" | "legs" | "core" | "home" | "secondary"> = {
  push: "push",
  pull: "pull",
  legs: "legs",
  core: "core",
  home: "home",
};

interface Props {
  routine: GeneratedRoutine | null;
  displayDate: string;
  hasActivePhase: boolean;
  todayDate: string;
}

function buildExportPayload(snapshot: SessionSnapshot, routine: GeneratedRoutine, bodyweight: number | null) {
  const completedSets = snapshot.loggedSets.filter(
    (s) => s.completed && !snapshot.skippedExerciseIds.has(s.exercise_id)
  );

  // Group sets by exercise
  const exerciseMap = new Map<string, { name: string; sets: typeof completedSets }>();
  for (const set of completedSets) {
    const prescription = snapshot.plannedExercises.find((ex) => ex.exercise_id === set.exercise_id);
    const name = prescription?.exercise_name ?? set.exercise_id;
    if (!exerciseMap.has(set.exercise_id)) {
      exerciseMap.set(set.exercise_id, { name, sets: [] });
    }
    exerciseMap.get(set.exercise_id)!.sets.push(set);
  }

  const exercises = Array.from(exerciseMap.values());
  const totalSets = completedSets.length;
  const totalReps = completedSets.reduce((sum, s) => sum + (s.reps ?? 0), 0);
  const totalVolume = completedSets.reduce((sum, s) => {
    const weight = s.weight_lbs ?? s.bodyweight_lbs ?? 0;
    return sum + weight * (s.reps ?? 0);
  }, 0);
  const durationMinutes = Math.max(Math.round((Date.now() - snapshot.startTime) / 60000), 1);
  const workoutCompleted = completedSets.length > 0;
  const routineLabel = `${snapshot.workoutType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())} Day`;

  // Build markdown content block
  let content = `## Fitness\n`;
  content += workoutCompleted ? "Workout Completed\n" : "Workout In Progress\n";
  content += `Routine: ${routineLabel}\n`;
  if (bodyweight && bodyweight > 0) content += `Bodyweight: ${bodyweight} lbs\n`;
  content += `Duration: ${durationMinutes} min\n`;

  for (const ex of exercises) {
    content += `\n${ex.name}\n`;
    for (const s of ex.sets) {
      const weight = s.weight_lbs != null ? `${s.weight_lbs}` : s.bodyweight_lbs != null ? `BW+${s.bodyweight_lbs}` : "BW";
      content += `${weight} x ${s.reps ?? "?"}\n`;
    }
  }

  if (totalVolume > 0) content += `\nTotal Volume: ${Math.round(totalVolume)} lbs`;

  return {
    type: "daily_activity_export",
    source: "gym_sessions",
    sourceRecordId: snapshot.savedSessionId ?? `workout-${snapshot.sessionDate}-${snapshot.workoutType}`,
    date: snapshot.sessionDate,
    title: workoutCompleted ? `Workout Completed - ${routineLabel}` : `Workout In Progress - ${routineLabel}`,
    content,
    metrics: {
      workoutCompleted,
      workoutDurationMinutes: durationMinutes,
      workoutVolume: Math.round(totalVolume),
      bodyweight: bodyweight && bodyweight > 0 ? bodyweight : undefined,
      exercisesCompleted: exercises.length,
      setsCompleted: totalSets,
      repsCompleted: totalReps,
    },
  };
}

function WorkoutTimer() {
  const [state, setState] = useState<"idle" | "running" | "paused">("idle");
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const start = () => {
    setState("running");
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };

  const pause = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState("paused");
  };

  const resume = () => {
    setState("running");
    intervalRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);
  };

  const reset = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setState("idle");
    setElapsed(0);
  };

  const mm = Math.floor(elapsed / 60).toString().padStart(2, "0");
  const ss = (elapsed % 60).toString().padStart(2, "0");

  return (
    <div className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 dark:border-zinc-800 dark:bg-zinc-900">
      <Timer className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
      <span className="min-w-[3.5rem] font-mono text-sm tabular-nums text-zinc-700 dark:text-zinc-300">
        {mm}:{ss}
      </span>
      {state === "idle" && (
        <button onClick={start} className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950">
          <Play className="h-3 w-3" /> Start
        </button>
      )}
      {state === "running" && (
        <button onClick={pause} className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950">
          <Pause className="h-3 w-3" /> Pause
        </button>
      )}
      {state === "paused" && (
        <button onClick={resume} className="flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950">
          <Play className="h-3 w-3" /> Resume
        </button>
      )}
      {state !== "idle" && (
        <button onClick={reset} className="flex items-center gap-1 rounded px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          <RotateCcw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

export function TodayWorkoutPanel({ routine, displayDate, hasActivePhase, todayDate }: Props) {
  const [mode, setMode] = useState<"gym" | "home">("gym");
  const sessionRef = useRef<{ getSnapshot: () => SessionSnapshot } | null>(null);
  const badgeVariant = routine ? TYPE_BADGE[routine.workout_type] ?? "secondary" : "secondary";
  const includedGoals = routine
    ? Array.from(new Set(routine.exercises.flatMap((exercise) => exercise.goal_names ?? [])))
    : [];

  function getCopyExportPayload(): object | null {
    const storedBw = localStorage.getItem(`gym_bw_${todayDate}`);
    const bodyweight = storedBw ? parseFloat(storedBw) : null;

    if (!routine || !sessionRef.current) {
      // No routine — export just bodyweight if available
      if (bodyweight && bodyweight > 0) {
        return {
          type: "daily_activity_export",
          source: "gym_sessions",
          sourceRecordId: `bodyweight-${todayDate}`,
          date: todayDate,
          title: "Bodyweight Logged",
          content: `## Fitness\nBodyweight: ${bodyweight} lbs`,
          metrics: { bodyweight },
        };
      }
      return null;
    }

    const snapshot = sessionRef.current.getSnapshot();
    return buildExportPayload(snapshot, routine, bodyweight);
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Today&apos;s Workout</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">{displayDate}</p>
        </div>
        {mode === "gym" && <GenerateRoutineButton />}
      </div>

      <div className="grid grid-cols-2 gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-1 dark:border-zinc-800 dark:bg-zinc-900">
        <Button
          type="button"
          variant={mode === "gym" ? "default" : "ghost"}
          size="sm"
          onClick={() => setMode("gym")}
          className={cn(mode !== "gym" && "text-zinc-600 dark:text-zinc-400")}
        >
          Gym Workout
        </Button>
        <Button
          type="button"
          variant={mode === "home" ? "default" : "ghost"}
          size="sm"
          onClick={() => setMode("home")}
          className={cn("gap-1.5", mode !== "home" && "text-zinc-600 dark:text-zinc-400")}
        >
          <Home className="h-3.5 w-3.5" />
          Home Workout
        </Button>
      </div>

      <WorkoutTimer />

      <BodyweightInput date={todayDate} getCopyExportPayload={getCopyExportPayload} />

      {mode === "home" ? (
        <HomeWorkoutLogger />
      ) : routine ? (
        <>
          <Card className="border-indigo-100 bg-indigo-50/30 dark:border-indigo-900/50 dark:bg-indigo-950/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <Badge variant={badgeVariant} className="capitalize text-sm px-3 py-1">
                  {routine.workout_type.replace("_", " ")} Day
                </Badge>
                <div className="flex items-center gap-1 text-sm text-zinc-500 dark:text-zinc-400">
                  <Clock className="w-3.5 h-3.5" />
                  ~{routine.estimated_duration_minutes} min
                </div>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {routine.exercises.length} exercises ·{" "}
                {routine.exercises.reduce((s, e) => s + e.sets, 0)} working sets
              </p>
              {includedGoals.length > 0 && (
                <p className="mt-2 text-xs font-medium text-indigo-700 dark:text-indigo-300">
                  Included for goal: {includedGoals.join(", ")}
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Thermometer className="w-4 h-4 text-amber-500" />
                <CardTitle className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
                  Warmup · {routine.warmup.duration_minutes} min
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">{routine.warmup.description}</p>
            </CardContent>
          </Card>

          <SessionLogger ref={sessionRef} routine={routine} />
        </>
      ) : (
        <Card>
          <CardContent className="space-y-3 p-8 text-center text-zinc-500">
            <p>
              {hasActivePhase
                ? "No routine is saved for today yet. Use New Routine to generate one."
                : "No active training phase is selected. New Routine will create a starter Accumulation phase and generate today's workout."}
            </p>
            <p className="text-xs">
              Home Workout still works independently if you want to log calisthenics manually today.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
