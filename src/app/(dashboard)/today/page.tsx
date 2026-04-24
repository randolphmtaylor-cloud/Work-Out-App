import { Clock, Thermometer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getTodayRoutine, getActivePhase, getRecentSessions, getAllSets } from "@/lib/data";
import { generateRoutine } from "@/lib/routine-engine";
import { formatDisplay } from "@/lib/utils/dates";
import { GenerateRoutineButton } from "@/components/workout/generate-routine-button";
import { SessionLogger } from "@/components/workout/session-logger";
import { DEMO_USER_ID } from "@/lib/constants/demo";

const DEMO_USER = DEMO_USER_ID;

const TYPE_BADGE: Record<string, "push" | "pull" | "legs" | "core" | "secondary"> = {
  push: "push", pull: "pull", legs: "legs", core: "core",
};

export default async function TodayPage() {
  const today = new Date().toISOString().split("T")[0];

  let routine = await getTodayRoutine(DEMO_USER);

  if (!routine) {
    const [phase, recentSessions, allSets] = await Promise.all([
      getActivePhase(DEMO_USER),
      getRecentSessions(DEMO_USER, 14),
      getAllSets(DEMO_USER),
    ]);
    if (phase) {
      routine = generateRoutine({ phase, recentSessions, allSets, userId: DEMO_USER });
    }
  }

  if (!routine) {
    return (
      <div className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-zinc-900 mb-4">Today&apos;s Workout</h1>
        <Card>
          <CardContent className="p-8 text-center text-zinc-500">
            No active training phase. Set up a phase to get daily routines.
          </CardContent>
        </Card>
      </div>
    );
  }

  const badgeVariant = TYPE_BADGE[routine.workout_type] ?? "secondary";

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Today&apos;s Workout</h1>
          <p className="text-sm text-zinc-500 mt-0.5">{formatDisplay(today)}</p>
        </div>
        <GenerateRoutineButton />
      </div>

      {/* Summary card */}
      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <Badge variant={badgeVariant} className="capitalize text-sm px-3 py-1">
              {routine.workout_type.replace("_", " ")} Day
            </Badge>
            <div className="flex items-center gap-1 text-sm text-zinc-500">
              <Clock className="w-3.5 h-3.5" />
              ~{routine.estimated_duration_minutes} min
            </div>
          </div>
          <p className="text-xs text-zinc-500">
            {routine.exercises.length} exercises ·{" "}
            {routine.exercises.reduce((s, e) => s + e.sets, 0)} working sets
          </p>
        </CardContent>
      </Card>

      {/* Warmup */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center gap-2">
            <Thermometer className="w-4 h-4 text-amber-500" />
            <CardTitle className="text-sm font-semibold text-zinc-600">
              Warmup · {routine.warmup.duration_minutes} min
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-zinc-600">{routine.warmup.description}</p>
        </CardContent>
      </Card>

      {/* Interactive session logger */}
      <SessionLogger routine={routine} />
    </div>
  );
}