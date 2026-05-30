"use client";
import { useRef, useState, useCallback, useEffect, useMemo } from "react";
import { CheckCircle, Circle, Loader2, ChevronDown, ChevronUp, Replace, Plus, Undo2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import type { Exercise, ExerciseSubstitution, GeneratedRoutine, ExercisePrescription } from "@/types";
import { useRouter } from "next/navigation";
import { formatWeightInput, parseWeightInput } from "@/lib/weights";

interface LoggedSet {
  exercise_id: string;
  set_number: number;
  reps?: number;
  weight_lbs?: number;
  bodyweight_lbs?: number;
  completed: boolean;
}

interface Props {
  routine: GeneratedRoutine;
}

export function SessionLogger({ routine }: Props) {
  const router = useRouter();
  const [plannedExercises, setPlannedExercises] = useState(() => routine.exercises);
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
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().split("T")[0]);
  const sessionDateRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedEx, setExpandedEx] = useState<string | null>(routine.exercises[0]?.exercise_id ?? null);
  const [skippedExerciseIds, setSkippedExerciseIds] = useState<Set<string>>(() => new Set());
  const [showAddExercise, setShowAddExercise] = useState(false);
  const [exerciseLibrary, setExerciseLibrary] = useState<Exercise[]>([]);
  const [exerciseSearch, setExerciseSearch] = useState("");
  const [manualExerciseName, setManualExerciseName] = useState("");
  const [addingExercise, setAddingExercise] = useState(false);
  const [startTime] = useState(() => Date.now());

  const activeLoggedSets = loggedSets.filter((set) => !skippedExerciseIds.has(set.exercise_id));
  const completedCount = activeLoggedSets.filter((s) => s.completed).length;
  const totalCount = activeLoggedSets.length;
  const percentDone = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;

  useEffect(() => {
    let cancelled = false;
    fetch("/api/exercises")
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setExerciseLibrary(data.exercises ?? []);
      })
      .catch((err) => console.error("[session-logger] exercise library load failed", err));
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredExerciseLibrary = useMemo(() => {
    const query = exerciseSearch.trim().toLowerCase();
    const activeIds = new Set(plannedExercises.map((exercise) => exercise.exercise_id));
    return exerciseLibrary
      .filter((exercise) => !query || exercise.name.toLowerCase().includes(query) || (exercise.aliases ?? []).some((alias) => alias.toLowerCase().includes(query)))
      .filter((exercise) => !activeIds.has(exercise.id))
      .slice(0, 8);
  }, [exerciseLibrary, exerciseSearch, plannedExercises]);

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
    (exerciseId: string, setNumber: number, field: "reps" | "weight", value: string) => {
      const num = parseFloat(value);
      setLoggedSets((prev) =>
        prev.map((s) =>
          s.exercise_id === exerciseId && s.set_number === setNumber
            ? field === "weight"
              ? { ...s, weight_lbs: undefined, bodyweight_lbs: undefined, ...parseWeightInput(value), completed: true }
              : { ...s, reps: isNaN(num) ? undefined : num, completed: true }
            : s
        )
      );
    },
    []
  );

  const addExerciseToWorkout = useCallback((exercise: Pick<Exercise, "id" | "name">) => {
    const existing = plannedExercises.find((item) => item.exercise_id === exercise.id);
    if (existing) {
      setSkippedExerciseIds((prev) => {
        const next = new Set(prev);
        next.delete(exercise.id);
        return next;
      });
      setExpandedEx(exercise.id);
      setShowAddExercise(false);
      return;
    }

    const prescription: ExercisePrescription = {
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      sets: 3,
      reps_low: 8,
      reps_high: 12,
      rest_seconds: 60,
      notes: "Manually added",
    };

    setPlannedExercises((prev) => [...prev, prescription]);
    setLoggedSets((prev) => [
      ...prev,
      ...Array.from({ length: prescription.sets }, (_, i) => ({
        exercise_id: exercise.id,
        set_number: i + 1,
        reps: undefined,
        weight_lbs: undefined,
        completed: false,
      })),
    ]);
    setExpandedEx(exercise.id);
    setShowAddExercise(false);
    setExerciseSearch("");
    setManualExerciseName("");
  }, [plannedExercises]);

  const addExistingExercise = useCallback((exercise: Exercise) => {
    addExerciseToWorkout(exercise);
  }, [addExerciseToWorkout]);

  const addManualExercise = useCallback(async () => {
    const name = manualExerciseName.trim() || exerciseSearch.trim();
    if (!name || addingExercise) return;
    setAddingExercise(true);
    setError(null);
    try {
      const response = await fetch("/api/exercises", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          status: "unreviewed",
          library_category: "Strength",
          tags: ["compound"],
          muscle_groups: [],
        }),
      });
      const data = await response.json().catch(() => ({}));
      const exercise = data.exercise ?? data.duplicate;
      if (!response.ok && !exercise) {
        throw new Error(data.error ?? "Could not add exercise.");
      }
      if (exercise) {
        setExerciseLibrary((current) => current.some((item) => item.id === exercise.id) ? current : [...current, exercise]);
        addExerciseToWorkout(exercise);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not add exercise.";
      console.error("[session-logger] add exercise failed", err);
      setError(message);
    } finally {
      setAddingExercise(false);
    }
  }, [addExerciseToWorkout, addingExercise, exerciseSearch, manualExerciseName]);

  const skipExercise = useCallback((exerciseId: string) => {
    setSkippedExerciseIds((prev) => {
      const next = new Set(prev);
      next.add(exerciseId);
      return next;
    });
    setLoggedSets((prev) =>
      prev.map((set) =>
        set.exercise_id === exerciseId
          ? { ...set, completed: false, reps: undefined, weight_lbs: undefined, bodyweight_lbs: undefined }
          : set
      )
    );
  }, []);

  const undoSkipExercise = useCallback((exerciseId: string) => {
    setSkippedExerciseIds((prev) => {
      const next = new Set(prev);
      next.delete(exerciseId);
      return next;
    });
    setExpandedEx(exerciseId);
  }, []);

  const replaceExercise = useCallback(
    (current: ExercisePrescription, substitution: ExerciseSubstitution) => {
      const replacement: ExercisePrescription = {
        ...current,
        exercise_id: substitution.exercise_id,
        exercise_name: substitution.exercise_name,
        equipment_name: substitution.equipment_name,
        notes: `Replacement for ${current.exercise_name}: ${substitution.reason}`,
        goal_ids: undefined,
        goal_names: undefined,
        substitutions: [
          {
            exercise_id: current.exercise_id,
            exercise_name: current.exercise_name,
            equipment_name: current.equipment_name,
            reason: "original planned movement",
          },
          ...(current.substitutions ?? []).filter((sub) => sub.exercise_id !== substitution.exercise_id),
        ],
      };

      setPlannedExercises((prev) =>
        prev.map((exercise) => exercise.exercise_id === current.exercise_id ? replacement : exercise)
      );
      setLoggedSets((prev) =>
        prev.map((set) =>
          set.exercise_id === current.exercise_id
            ? { ...set, exercise_id: substitution.exercise_id, completed: false, reps: undefined, weight_lbs: undefined, bodyweight_lbs: undefined }
            : set
        )
      );
      setExpandedEx(substitution.exercise_id);
    },
    []
  );

  const handleFinish = async () => {
    if (saving) return;
    setError(null);
    setSaving(true);
    const elapsedMin = Math.round((Date.now() - startTime) / 60000);
    const selectedDate = sessionDateRef.current?.value || sessionDate;

    const completedSets = loggedSets
      .filter((s) => s.completed && !skippedExerciseIds.has(s.exercise_id))
      .map((s) => ({
        exercise_id: s.exercise_id,
        exercise_name: plannedExercises.find((exercise) => exercise.exercise_id === s.exercise_id)?.exercise_name,
        set_number: s.set_number,
        reps: s.reps,
        weight_lbs: s.weight_lbs,
        bodyweight_lbs: s.bodyweight_lbs,
        is_warmup: false,
      }));

    if (completedSets.length === 0) {
      setError("Complete at least one set before logging this workout.");
      setSaving(false);
      return;
    }

    try {
      console.log("[session-logger] saving generated workout", {
        routineId: routine.id,
        date: selectedDate,
        workoutType: routine.workout_type,
        sets: completedSets.length,
        skipped: skippedExerciseIds.size,
      });
      const response = await fetch("/api/workouts/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          routine_id: routine.id,
          date: selectedDate,
          duration_minutes: Math.max(elapsedMin, 1),
          workout_type: routine.workout_type,
          sets: completedSets,
          notes: `${routine.workout_type} day`,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save session.");
      }
      setSaved(true);
      setTimeout(() => router.push("/history"), 900);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save session. Please try again.";
      console.error("[session-logger] save failed", err);
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (saved) {
    return (
      <Card className="border-green-200 dark:border-green-900/50 bg-green-50 dark:bg-green-950/30">
        <CardContent className="py-8 text-center">
          <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3" />
          <p className="font-semibold text-green-800 dark:text-green-300 text-lg">Session logged!</p>
          <p className="text-sm text-green-600 dark:text-green-400 mt-1">{completedCount} sets saved to your history.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <label className="block space-y-1 rounded-lg border border-zinc-200 bg-white p-3 text-sm dark:border-zinc-800 dark:bg-zinc-900">
        <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">Workout date</span>
        <input
          type="date"
          value={sessionDate}
          ref={sessionDateRef}
          onChange={(event) => setSessionDate(event.target.value)}
          onInput={(event) => setSessionDate(event.currentTarget.value)}
          className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
        />
      </label>
      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 mb-1">
        <span>{completedCount}/{totalCount} sets done</span>
        <span>{percentDone}%</span>
      </div>
      <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-1.5 mb-4">
        <div
          className="bg-indigo-500 h-1.5 rounded-full transition-all duration-300"
          style={{ width: `${percentDone}%` }}
        />
      </div>

      <Card>
        <CardContent className="space-y-3 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-zinc-800 dark:text-zinc-200">Exercises</p>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => setShowAddExercise((current) => !current)}>
              <Plus className="h-3.5 w-3.5" />
              Add Exercise
            </Button>
          </div>
          {showAddExercise && (
            <div className="space-y-2 rounded-md border border-zinc-100 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/60">
              <input
                type="search"
                value={exerciseSearch}
                onChange={(event) => {
                  setExerciseSearch(event.target.value);
                  setManualExerciseName(event.target.value);
                }}
                placeholder="Search exercise library"
                className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
              />
              <div className="grid gap-2">
                {filteredExerciseLibrary.map((exercise) => (
                  <Button
                    key={exercise.id}
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-auto justify-start px-2.5 py-2 text-left"
                    onClick={() => addExistingExercise(exercise)}
                  >
                    <span>
                      <span className="block text-sm">{exercise.name}</span>
                      {exercise.equipment?.name && (
                        <span className="block text-[10px] font-normal text-zinc-400 dark:text-zinc-500">{exercise.equipment.name}</span>
                      )}
                    </span>
                  </Button>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
                <input
                  value={manualExerciseName}
                  onChange={(event) => setManualExerciseName(event.target.value)}
                  placeholder="Create new exercise"
                  className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <Button type="button" size="sm" onClick={addManualExercise} disabled={addingExercise || !manualExerciseName.trim()} className="gap-1.5">
                  {addingExercise && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Create & Add
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exercise cards */}
      {plannedExercises.map((ex, idx) => {
        const exSets = loggedSets.filter((s) => s.exercise_id === ex.exercise_id);
        const exDone = exSets.filter((s) => s.completed).length;
        const isExpanded = expandedEx === ex.exercise_id;
        const isSkipped = skippedExerciseIds.has(ex.exercise_id);

        return (
          <Card
            key={ex.exercise_id}
            className={cn(
              "transition-colors",
              isSkipped
                ? "border-zinc-200 bg-zinc-50 opacity-80 dark:border-zinc-800 dark:bg-zinc-900/60"
                : exDone === exSets.length && exDone > 0
                ? "border-green-200 dark:border-green-900/50 bg-green-50/20 dark:bg-green-950/20"
                : "border-zinc-200 dark:border-zinc-800"
            )}
          >
            <CardContent className="pt-4 pb-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs flex items-center justify-center font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{ex.exercise_name}</p>
                    {ex.equipment_name && (
                      <p className="text-xs text-zinc-400 dark:text-zinc-500">{ex.equipment_name}</p>
                    )}
                    {(ex.goal_names ?? []).length > 0 && (
                      <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                        Included for goal: {ex.goal_names?.join(", ")}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-zinc-600 dark:text-zinc-300">
                    {isSkipped ? "Skipped" : `${ex.sets} × ${ex.reps_low}–${ex.reps_high}`}
                  </span>
                  {!isSkipped && (
                    <span className="text-xs text-zinc-400 dark:text-zinc-500">
                      {exDone}/{exSets.length}
                    </span>
                  )}
                  {isSkipped ? (
                    <Button type="button" variant="outline" size="sm" className="h-7 gap-1 px-2" onClick={() => undoSkipExercise(ex.exercise_id)}>
                      <Undo2 className="h-3 w-3" />
                      Undo
                    </Button>
                  ) : (
                    <>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-zinc-500" onClick={() => skipExercise(ex.exercise_id)}>
                        Skip
                      </Button>
                      <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => setExpandedEx(isExpanded ? null : ex.exercise_id)} aria-label={isExpanded ? "Collapse exercise" : "Expand exercise"}>
                        {isExpanded
                          ? <ChevronUp className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />
                          : <ChevronDown className="w-4 h-4 text-zinc-400 dark:text-zinc-500" />}
                      </Button>
                    </>
                  )}
                </div>
              </div>

              {ex.notes && !isExpanded && !isSkipped && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1.5 ml-8">{ex.notes}</p>
              )}
            </CardContent>

            {isExpanded && !isSkipped && (
              <CardContent className="pt-0 pb-4 space-y-2">
                {ex.notes && (
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 rounded-md px-2.5 py-1.5 mb-3">
                    {ex.notes}
                  </p>
                )}
                {ex.substitutions && ex.substitutions.length > 0 && (
                  <div className="mb-3 rounded-md border border-zinc-100 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/60 p-2.5">
                    <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300 mb-2">
                      Replace if unavailable
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ex.substitutions.map((substitution) => (
                        <Button
                          key={substitution.exercise_id}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-auto min-h-8 flex-col items-start gap-0 px-2.5 py-1.5 text-left"
                          title={substitution.reason}
                          onClick={() => replaceExercise(ex, substitution)}
                        >
                          <span className="flex items-center gap-1.5">
                            <Replace className="w-3 h-3" />
                            {substitution.exercise_name}
                          </span>
                          {substitution.equipment_name && (
                            <span className="text-[10px] font-normal text-zinc-400 dark:text-zinc-500">
                              {substitution.equipment_name}
                            </span>
                          )}
                        </Button>
                      ))}
                    </div>
                  </div>
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

                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1">
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
        completedCount > 0
          ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50/30 dark:bg-indigo-950/20"
          : "border-zinc-100 dark:border-zinc-800"
      )}>
        <CardContent className="py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
              {completedCount === totalCount ? "All sets done — great work!" : `${totalCount - completedCount} sets remaining`}
            </p>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">Tap a set to mark it complete, or enter reps/weight first</p>
            {error && <p className="mt-1 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}
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
  onUpdate: (field: "reps" | "weight", val: string) => void;
}) {
  const suggestedWeight = (() => {
    const m = prescription.notes?.match(/(\d+(?:\.\d+)?)\s*lbs/);
    return m ? m[1] : "";
  })();

  return (
    <div className={cn(
      "flex items-center gap-2 rounded-lg p-2 transition-colors",
      set.completed
        ? "bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800"
        : "bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-100 dark:border-zinc-700"
    )}>
      {/* Toggle */}
      <button onClick={onToggle} className="shrink-0">
        {set.completed
          ? <CheckCircle className="w-5 h-5 text-green-500" />
          : <Circle className="w-5 h-5 text-zinc-300 dark:text-zinc-600" />}
      </button>

      <span className="text-xs text-zinc-400 dark:text-zinc-500 w-8 shrink-0">Set {set.set_number}</span>

      {/* Weight input */}
      <input
        type="text"
        inputMode="decimal"
        placeholder={suggestedWeight || "lbs"}
        defaultValue={formatWeightInput(set)}
        onChange={(e) => onUpdate("weight", e.target.value)}
        className="w-20 text-sm text-center bg-white dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
        aria-label="Weight in lbs or bodyweight"
      />
      <span className="text-xs text-zinc-400 dark:text-zinc-500">×</span>

      {/* Reps input */}
      <input
        type="number"
        placeholder={`${prescription.reps_low}–${prescription.reps_high}`}
        defaultValue={set.reps ?? ""}
        onChange={(e) => onUpdate("reps", e.target.value)}
        className="w-14 text-sm text-center bg-white dark:bg-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-600 rounded-md px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
        aria-label="Reps"
      />
      <span className="text-xs text-zinc-400 dark:text-zinc-500">reps</span>
    </div>
  );
}
