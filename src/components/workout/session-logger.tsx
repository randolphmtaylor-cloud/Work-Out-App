"use client";
import { useState, useCallback } from "react";
import { CheckCircle, Circle, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { GeneratedRoutine, ExercisePrescription } from "@/types";
import { useRouter } from "next/navigation";

interface LoggedSet {
  exercise_id: string;
  set_number: number;
  reps?: number;
  weight_lbs?: number;
  completed: boolean;
}

interface Props {
  routine: GeneratedRoutine;
}

export function SessionLogger({ routine }: Props) {
  const router = useRouter();
  const [loggedSets, setLoggedSets] = useState<LoggedSet[]>(() =>
    routine.exercises.flatMap((ex) =>
      Array.from({ length: ex.sets }, (_, i) => ({
        exercise_id: ex.exercise_id,
        set_number: i + 1,
        reps: undefined,
        weight_lbs: undefined,
        completed: false,
      }))
    )
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [expandedEx, setExpandedEx] = useState<string | null>(routine.exercises[0]?.exercise_id ?? null);
  const [startTime] = useState(() => Date.now());

  const completedCount = loggedSets.filter((s) => s.completed).length;
  const totalCount = loggedSets.length;

  const toggleSet = useCallback(
    (exerciseId: string, setNumber: number) => {
      setLoggedSets((prev) =>
        prev.map((s) =>
          s.exercise_id === exerciseId && s.set_number === setNumber
            ? { ...s, completed: !s.completed }
            : s
        )
      );
    },
    []
  );

  const updateSet = useCallback(
    (exerciseId: string, setNumber: number, field: "reps" | "weight_lbs", value: string) => {
      const num = parseFloat(value);
      setLoggedSets((prev) =>
        prev.map((s) =>
          s.exercise_id === exerciseId && s.set_number === setNumber
            ? { ...s, [field]: isNaN(num) ? undefined : num, completed: true }
            : s
        )
      );
    },
    []
  );

  const handleFinish = async () => {
    setSaving(true);
    const elapsedMin = Math.round((Date.now() - startTime) / 60000);

    const completedSets = loggedSets
      .filter((s) => s.completed)
      .map((s) => ({
        exercise_id: s.exercise_id,
        set_number: s.set_number,
        reps: s.reps,
        weight_lbs: s.weight_lbs,
        is_warmup: false,
      }));

    if (completedSets.length === 0) {
      setSaving(false);
      return;
    }

    try {
      await fetch("/api/workouts/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routine_id: routine.id,
          date: new Date().toISOString().split("T")[0],
          duration_minutes: Math.max(elapsedMin, 1),
          sets: completedSets,
          notes: `${routine.workout_type} day`,
        }),
      });
      setSaved(true);
      setTimeout(() => router.refresh(), 800);
    } catch {
      alert("Failed to save session. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-8 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-green-800 text-lg">Session logged!</p>
          <p className="text-sm text-green-600 mt-1">{completedCount} sets saved to your history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="flex items-center justify-between text-xs text-zinc-500 mb-1">
        <span>{completedCount}/{totalCount} sets done</span>
        <span>{Math.round((completedCount / totalCount) * 100)}%</span>
      </div>
      <div className="w-full bg-zinc-100 rounded-full h-1.5 mb-4">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${(completedCount / totalCount) * 100}%` }}
        />
      </div>

      {/* Exercise cards */}
      {routine.exercises.map((ex, idx) => {
        const exSets = loggedSets.filter((s) => s.exercise_id === ex.exercise_id);
        const exDone = exSets.filter((s) => s.completed).length;
        const isExpanded = expandedEx === ex.exercise_id;

        return (
          <Card
            key={ex.exercise_id}
            className={cn(
              "transition-colors",
              exDone === exSets.length && exDone > 0
                ? "border-green-200 bg-green-50/20"
                : "border-zinc-200"
            )}
          >
            <button
              className="w-full text-left"
              onClick={() => setExpandedEx(isExpanded ? null : ex.exercise_id)}
            >
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-full bg-zinc-900 text-white text-xs flex items-center justify-center font-bold shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-zinc-900 text-sm">{ex.exercise_name}</p>
                      {ex.equipment_name && (
                        <p className="text-xs text-zinc-400">{ex.equipment_name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-zinc-600">
                      {ex.sets} × {ex.reps_low}–{ex.reps_high}
                    </span>
                    <span className="text-xs text-zinc-400">
                      {exDone}/{exSets.length}
                    </span>
                    {isExpanded
                      ? <ChevronUp className="w-4 h-4 text-zinc-400" />
                      : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                  </div>
                </div>

                {ex.notes && !isExpanded && (
                  <p className="text-xs text-indigo-600 mt-1.5 ml-8">{ex.notes}</p>
                )}
              </CardContent>
            </button>

            {isExpanded && (
              <CardContent className="pt-0 pb-4 space-y-2">
                {ex.notes && (
                  <p className="text-xs text-indigo-600 bg-indigo-50 rounded-md px-2.5 py-1.5 mb-3">
                    {ex.notes}
                  </p>
                )}
                {ex.substitutions && ex.substitutions.length > 0 && (
                  <p className="text-xs text-zinc-400 mb-2">
                    Alt: {ex.substitutions.join(", ")}
                  </p>
                )}

                {/* Set rows */}
                <div className="space-y-2">
                  {exSets.map((s) => (
                    <SetRow
                      key={s.set_number}
                      set={s}
                      prescription={ex}
                      onToggle={() => toggleSet(ex.exercise_id, s.set_number)}
                      onUpdate={(field, val) => updateSet(ex.exercise_id, s.set_number, field, val)}
                    />
                  ))}
                </div>

                <p className="text-xs text-zinc-400 mt-1">
                  Rest {ex.rest_seconds}s between sets
                </p>
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Finish button */}
      <Card className={cn(
        "border-2 transition-colors",
        completedCount > 0 ? "border-indigo-200 bg-indigo-50/30" : "border-zinc-100"
      )}>
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-800">
              {completedCount === totalCount ? "All sets done — great work!" : `${totalCount - completedCount} sets remaining`}
            </p>
            <p className="text-xs text-zinc-400">Tap a set to mark it complete, or enter reps/weight first</p>
          </div>
          <Button
            variant="accent"
            size="sm"
            onClick={handleFinish}
            disabled={completedCount === 0 || saving}
            className="gap-1.5 shrink-0"
          >
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {saving ? "Saving..." : "Finish & Log"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function SetRow({
  set,
  prescription,
  onToggle,
  onUpdate,
}: {
  set: LoggedSet;
  prescription: ExercisePrescription;
  onToggle: () => void;
  onUpdate: (field: "reps" | "weight_lbs", val: string) => void;
}) {
  // Parse suggested weight from notes
  const suggestedWeight = (() => {
    const m = prescription.notes?.match(/(\d+(?:\.\d+)?)\s*lbs/);
    return m ? m[1] : "";
  })();

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg p-2 transition-colors",
      set.completed ? "bg-green-50 border border-green-200" : "bg-zinc-50 border border-zinc-100"
    )}>
      {/* Toggle */}
      <button onClick={onToggle} className="shrink-0">
        {set.completed
          ? <CheckCircle className="w-5 h-5 text-green-500" />
          : <Circle className="w-5 h-5 text-zinc-300" />}
      </button>

      <span className="text-xs text-zinc-400 w-8 shrink-0">Set {set.set_number}</span>

      {/* Weight input */}
      <input
        type="number"
        placeholder={suggestedWeight || "lbs"}
        defaultValue={set.weight_lbs ?? ""}
        onChange={(e) => onUpdate("weight_lbs", e.target.value)}
        className="w-16 text-sm text-center bg-white border border-zinc-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        aria-label="Weight in lbs"
      />
      <span className="text-xs text-zinc-400">lbs ×</span>

      {/* Reps input */}
      <input
        type="number"
        placeholder={`${prescription.reps_low}–${prescription.reps_high}`}
        defaultValue={set.reps ?? ""}
        onChange={(e) => onUpdate("reps", e.target.value)}
        className="w-14 text-sm text-center bg-white border border-zinc-200 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400"
        aria-label="Reps"
      />
      <span className="text-xs text-zinc-400">reps</span>
    </div>
  );
}
