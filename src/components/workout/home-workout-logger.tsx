"use client";

import { useMemo, useState } from "react";
import { CheckCircle, Circle, Loader2, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";

type HomeExerciseKind = "bodyweight" | "run" | "weighted";

interface HomeExerciseTemplate {
  name: string;
  kind: HomeExerciseKind;
  sets?: number;
  reps?: number;
  notes?: string;
}

interface HomeExerciseLog extends HomeExerciseTemplate {
  id: string;
  completed: boolean;
  setsInput: string;
  repsInput: string;
  weightInput: string;
  distanceInput: string;
  timeInput: string;
  notesInput: string;
}

const SUGGESTED_HOME_EXERCISES: HomeExerciseTemplate[] = [
  { name: "Run", kind: "run", notes: "Easy pace or intervals" },
  { name: "Push Ups", kind: "bodyweight", sets: 3, reps: 12 },
  { name: "Squats", kind: "bodyweight", sets: 3, reps: 15 },
  { name: "Romanian Dead Lifts", kind: "weighted", sets: 3, reps: 10 },
  { name: "Sit Ups", kind: "bodyweight", sets: 3, reps: 15 },
  { name: "Planks", kind: "bodyweight", sets: 3, reps: 1, notes: "Log hold time in notes" },
  { name: "Lunges", kind: "bodyweight", sets: 3, reps: 10 },
  { name: "Burpees", kind: "bodyweight", sets: 3, reps: 10 },
  { name: "Pull Ups / Rows", kind: "bodyweight", sets: 3, reps: 6 },
  { name: "Jumping Jacks", kind: "bodyweight", sets: 3, reps: 30 },
];

function toLog(template: HomeExerciseTemplate): HomeExerciseLog {
  return {
    ...template,
    id: crypto.randomUUID(),
    completed: false,
    setsInput: template.sets?.toString() ?? "",
    repsInput: template.reps?.toString() ?? "",
    weightInput: "",
    distanceInput: "",
    timeInput: "",
    notesInput: template.notes ?? "",
  };
}

function numberOrUndefined(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function buildSetNotes(exercise: HomeExerciseLog) {
  const parts = [
    exercise.kind === "run" && exercise.distanceInput ? `Distance: ${exercise.distanceInput}` : undefined,
    exercise.kind === "run" && exercise.timeInput ? `Time: ${exercise.timeInput}` : undefined,
    exercise.notesInput.trim() ? `Notes: ${exercise.notesInput.trim()}` : undefined,
  ].filter(Boolean);

  return parts.join(" | ") || undefined;
}

export function HomeWorkoutLogger() {
  const router = useRouter();
  const [exercises, setExercises] = useState<HomeExerciseLog[]>(() =>
    SUGGESTED_HOME_EXERCISES.map(toLog)
  );
  const [selectedTemplate, setSelectedTemplate] = useState(SUGGESTED_HOME_EXERCISES[0].name);
  const [customName, setCustomName] = useState("");
  const [customKind, setCustomKind] = useState<HomeExerciseKind>("bodyweight");
  const [sessionNotes, setSessionNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [startTime] = useState(() => Date.now());

  const completedCount = exercises.filter((exercise) => exercise.completed).length;
  const percentDone = exercises.length ? Math.round((completedCount / exercises.length) * 100) : 0;

  const selectedTemplateDetails = useMemo(
    () => SUGGESTED_HOME_EXERCISES.find((exercise) => exercise.name === selectedTemplate) ?? SUGGESTED_HOME_EXERCISES[0],
    [selectedTemplate]
  );

  function updateExercise(id: string, patch: Partial<HomeExerciseLog>) {
    setExercises((current) =>
      current.map((exercise) => exercise.id === id ? { ...exercise, ...patch } : exercise)
    );
  }

  function addSuggestedExercise() {
    setExercises((current) => [...current, toLog(selectedTemplateDetails)]);
  }

  function addCustomExercise() {
    const name = customName.trim();
    if (!name) return;
    setExercises((current) => [...current, toLog({ name, kind: customKind })]);
    setCustomName("");
  }

  function removeExercise(id: string) {
    setExercises((current) => current.filter((exercise) => exercise.id !== id));
  }

  async function handleSave() {
    const completed = exercises.filter((exercise) => exercise.completed);
    if (completed.length === 0) return;

    setSaving(true);
    const elapsedMin = Math.round((Date.now() - startTime) / 60000);

    const sets = completed.flatMap((exercise) => {
      const setCount = exercise.kind === "run"
        ? 1
        : Math.max(1, Math.min(numberOrUndefined(exercise.setsInput) ?? 1, 20));

      return Array.from({ length: setCount }, (_, index) => ({
        exercise_name: exercise.name.trim(),
        set_number: index + 1,
        reps: numberOrUndefined(exercise.repsInput),
        weight_lbs: numberOrUndefined(exercise.weightInput),
        is_warmup: false,
        notes: buildSetNotes(exercise),
      }));
    });

    try {
      const response = await fetch("/api/workouts/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: new Date().toISOString().split("T")[0],
          duration_minutes: Math.max(elapsedMin, 1),
          workout_type: "home",
          sets,
          notes: sessionNotes.trim() || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to save home workout");

      setSaved(true);
      setTimeout(() => router.refresh(), 800);
    } catch {
      alert("Failed to save home workout. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (saved) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900/50 dark:bg-green-950/30">
        <CardContent className="py-8 text-center">
          <CheckCircle className="mx-auto mb-3 h-10 w-10 text-green-500" />
          <p className="text-lg font-semibold text-green-800 dark:text-green-300">Home workout logged!</p>
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            {completedCount} exercises saved to your history.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-emerald-100 bg-emerald-50/30 dark:border-emerald-900/50 dark:bg-emerald-950/20">
        <CardContent className="pt-4 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <Badge variant="home" className="mb-2">Home Workout</Badge>
              <p className="text-sm text-zinc-600 dark:text-zinc-300">
                Suggested calisthenics session. Edit it, check off what you finish, or build your own.
              </p>
            </div>
            <div className="text-right text-xs text-zinc-500 dark:text-zinc-400">
              <p>{completedCount}/{exercises.length} exercises done</p>
              <p>{percentDone}% complete</p>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full rounded-full bg-emerald-100 dark:bg-emerald-950">
            <div
              className="h-1.5 rounded-full bg-emerald-500 transition-all duration-300"
              style={{ width: `${percentDone}%` }}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Build Workout</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <select
              value={selectedTemplate}
              onChange={(event) => setSelectedTemplate(event.target.value)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              aria-label="Suggested home exercise"
            >
              {SUGGESTED_HOME_EXERCISES.map((exercise) => (
                <option key={exercise.name} value={exercise.name}>{exercise.name}</option>
              ))}
            </select>
            <Button type="button" variant="outline" size="sm" onClick={addSuggestedExercise} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Suggested
            </Button>
          </div>

          <div className="grid gap-2 sm:grid-cols-[1fr_140px_auto]">
            <input
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder="Custom exercise name"
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
              aria-label="Custom exercise name"
            />
            <select
              value={customKind}
              onChange={(event) => setCustomKind(event.target.value as HomeExerciseKind)}
              className="h-9 rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              aria-label="Custom exercise type"
            >
              <option value="bodyweight">Bodyweight</option>
              <option value="weighted">Weighted</option>
              <option value="run">Run</option>
            </select>
            <Button type="button" variant="outline" size="sm" onClick={addCustomExercise} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" />
              Add Custom
            </Button>
          </div>
        </CardContent>
      </Card>

      {exercises.map((exercise, index) => (
        <HomeExerciseCard
          key={exercise.id}
          exercise={exercise}
          index={index}
          onUpdate={(patch) => updateExercise(exercise.id, patch)}
          onRemove={() => removeExercise(exercise.id)}
        />
      ))}

      <Card className={cn(
        "border-2 transition-colors",
        completedCount > 0
          ? "border-emerald-200 bg-emerald-50/30 dark:border-emerald-800 dark:bg-emerald-950/20"
          : "border-zinc-100 dark:border-zinc-800"
      )}>
        <CardContent className="space-y-3 py-4">
          <textarea
            value={sessionNotes}
            onChange={(event) => setSessionNotes(event.target.value)}
            placeholder="Home workout notes"
            className="min-h-20 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            aria-label="Home workout notes"
          />
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                {completedCount > 0 ? `${completedCount} exercises ready to save` : "Check off at least one exercise"}
              </p>
              <p className="text-xs text-zinc-400 dark:text-zinc-500">
                Saved sessions appear in history as Home Workout.
              </p>
            </div>
            <Button
              type="button"
              variant="accent"
              size="sm"
              onClick={handleSave}
              disabled={completedCount === 0 || saving}
              className="shrink-0 gap-1.5"
            >
              {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {saving ? "Saving..." : "Save Home Workout"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function HomeExerciseCard({
  exercise,
  index,
  onUpdate,
  onRemove,
}: {
  exercise: HomeExerciseLog;
  index: number;
  onUpdate: (patch: Partial<HomeExerciseLog>) => void;
  onRemove: () => void;
}) {
  return (
    <Card className={cn(
      "transition-colors",
      exercise.completed
        ? "border-green-200 bg-green-50/20 dark:border-green-900/50 dark:bg-green-950/20"
        : "border-zinc-200 dark:border-zinc-800"
    )}>
      <CardContent className="space-y-3 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2.5">
            <button
              type="button"
              onClick={() => onUpdate({ completed: !exercise.completed })}
              className="mt-1 shrink-0"
              aria-label={exercise.completed ? `Mark ${exercise.name} incomplete` : `Mark ${exercise.name} complete`}
            >
              {exercise.completed
                ? <CheckCircle className="h-5 w-5 text-green-500" />
                : <Circle className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />}
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
                  {index + 1}
                </span>
                <input
                  value={exercise.name}
                  onChange={(event) => onUpdate({ name: event.target.value })}
                  className="h-8 min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-1 text-sm font-semibold text-zinc-900 focus:border-zinc-200 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:text-zinc-100 dark:focus:border-zinc-700 dark:focus:bg-zinc-900"
                  aria-label="Exercise name"
                />
              </div>
            </div>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={onRemove} aria-label={`Remove ${exercise.name}`}>
            <Trash2 className="h-4 w-4 text-zinc-400" />
          </Button>
        </div>

        {exercise.kind === "run" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <Field label="Distance" value={exercise.distanceInput} onChange={(value) => onUpdate({ distanceInput: value })} placeholder="2 miles" />
            <Field label="Time" value={exercise.timeInput} onChange={(value) => onUpdate({ timeInput: value })} placeholder="22 min" />
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-3">
            <Field label="Sets" value={exercise.setsInput} onChange={(value) => onUpdate({ setsInput: value })} placeholder="3" type="number" />
            <Field label="Reps" value={exercise.repsInput} onChange={(value) => onUpdate({ repsInput: value })} placeholder="10" type="number" />
            {exercise.kind === "weighted" ? (
              <Field label="Weight" value={exercise.weightInput} onChange={(value) => onUpdate({ weightInput: value })} placeholder="lbs" type="number" />
            ) : (
              <Field label="Weight" value={exercise.weightInput} onChange={(value) => onUpdate({ weightInput: value })} placeholder="optional" type="number" />
            )}
          </div>
        )}

        <textarea
          value={exercise.notesInput}
          onChange={(event) => onUpdate({ notesInput: event.target.value })}
          placeholder="Notes"
          className="min-h-16 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          aria-label={`${exercise.name} notes`}
        />
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: "text" | "number";
}) {
  return (
    <label className="space-y-1">
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
      />
    </label>
  );
}
