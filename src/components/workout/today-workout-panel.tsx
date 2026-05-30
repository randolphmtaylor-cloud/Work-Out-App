"use client";

import { useState } from "react";
import { Clock, Home, Thermometer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GenerateRoutineButton } from "@/components/workout/generate-routine-button";
import { HomeWorkoutLogger } from "@/components/workout/home-workout-logger";
import { SessionLogger } from "@/components/workout/session-logger";
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

export function TodayWorkoutPanel({ routine, displayDate, hasActivePhase, todayDate }: Props) {
  const [mode, setMode] = useState<"gym" | "home">("gym");
  const badgeVariant = routine ? TYPE_BADGE[routine.workout_type] ?? "secondary" : "secondary";
  const includedGoals = routine
    ? Array.from(new Set(routine.exercises.flatMap((exercise) => exercise.goal_names ?? [])))
    : [];

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

      <BodyweightInput date={todayDate} />

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

          <SessionLogger routine={routine} />
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
