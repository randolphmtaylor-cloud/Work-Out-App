"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Calendar, Check, Clipboard, Clock, Dumbbell, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatDisplay } from "@/lib/utils/dates";
import { buildProgressExportFromHistory } from "@/lib/exports/progress-gym";
import { formatWeightInput, parseWeightInput } from "@/lib/weights";
import type { Exercise, WorkoutSession, WorkoutSet } from "@/types";

type SessionWithSets = WorkoutSession & {
  sets: WorkoutSet[];
  exercises: string[];
};

type DraftSet = {
  id?: string;
  reps: string;
  weight_lbs: string;
  notes: string;
  is_warmup: boolean;
};

type DraftExercise = {
  key: string;
  exercise_id: string;
  exercise_name: string;
  sets: DraftSet[];
};

type DraftSession = {
  id: string;
  date: string;
  workout_type: string;
  duration_minutes: string;
  notes: string;
  exercises: DraftExercise[];
};

const SOURCE_LABELS: Record<string, string> = {
  import_text: "Text Import",
  import_docx: "Docx Import",
  import_xlsx: "Excel Import",
  manual: "Manual",
  generated: "Generated",
};

function sessionLabel(session: { source: string; notes?: string }) {
  return session.notes?.includes("Home Workout") ? "Home Workout" : SOURCE_LABELS[session.source] ?? session.source;
}

function createEmptySet(): DraftSet {
  return { reps: "", weight_lbs: "", notes: "", is_warmup: false };
}

function createEmptyExercise(exercises: Exercise[]): DraftExercise {
  const first = exercises[0];
  return {
    key: crypto.randomUUID(),
    exercise_id: first?.id ?? "",
    exercise_name: first?.name ?? "",
    sets: [createEmptySet()],
  };
}

function numberOrUndefined(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function toDraft(
  session: WorkoutSession,
  sets: WorkoutSet[],
  exercises: Exercise[]
): DraftSession {
  const exerciseMap = new Map(exercises.map((exercise) => [exercise.id, exercise.name]));
  const grouped = new Map<string, WorkoutSet[]>();
  for (const set of sets) {
    const key = set.exercise_id || "unknown";
    grouped.set(key, [...(grouped.get(key) ?? []), set]);
  }

  return {
    id: session.id,
    date: session.date,
    workout_type: session.workout_type ?? (session.notes?.includes("Home Workout") ? "home" : "gym"),
    duration_minutes: session.duration_minutes ? String(session.duration_minutes) : "",
    notes: session.notes ?? "",
    exercises: [...grouped.entries()].map(([exerciseId, exerciseSets]) => ({
      key: crypto.randomUUID(),
      exercise_id: exerciseId,
      exercise_name: exerciseMap.get(exerciseId) ?? "",
      sets: exerciseSets
        .sort((a, b) => a.set_number - b.set_number)
        .map((set) => ({
          id: set.id,
          reps: set.reps ? String(set.reps) : "",
          weight_lbs: formatWeightInput(set),
          notes: set.notes ?? "",
          is_warmup: set.is_warmup,
        })),
    })),
  };
}

export function HistoryManager({
  initialSessions,
  exercises,
}: {
  initialSessions: SessionWithSets[];
  exercises: Exercise[];
}) {
  const router = useRouter();
  const editorRef = useRef<HTMLDivElement>(null);
  const [sessions, setSessions] = useState(initialSessions);
  const [draft, setDraft] = useState<DraftSession | null>(null);
  const [loadingEditId, setLoadingEditId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  const grouped = useMemo(() => {
    const months = new Map<string, SessionWithSets[]>();
    for (const session of sessions) {
      const month = session.date.slice(0, 7);
      if (!months.has(month)) months.set(month, []);
      months.get(month)!.push(session);
    }
    return months;
  }, [sessions]);

  const startEdit = async (session: SessionWithSets) => {
    setLoadingEditId(session.id);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/workouts/${session.id}`);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Could not load workout for editing.");
      setDraft(toDraft(data.session, data.sets, exercises));
      requestAnimationFrame(() => editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }));
    } catch (err) {
      console.error("[history] edit load failed", err);
      setError(err instanceof Error ? err.message : "Could not load workout for editing.");
    } finally {
      setLoadingEditId(null);
    }
  };

  const updateDraftExercise = (key: string, patch: Partial<DraftExercise>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((exercise) => (exercise.key === key ? { ...exercise, ...patch } : exercise)),
          }
        : current
    );
  };

  const updateDraftSet = (exerciseKey: string, setIndex: number, patch: Partial<DraftSet>) => {
    setDraft((current) =>
      current
        ? {
            ...current,
            exercises: current.exercises.map((exercise) =>
              exercise.key === exerciseKey
                ? {
                    ...exercise,
                    sets: exercise.sets.map((set, index) => (index === setIndex ? { ...set, ...patch } : set)),
                  }
                : exercise
            ),
          }
        : current
    );
  };

  const saveDraft = async () => {
    if (!draft || saving) return;
    setSaving(true);
    setMessage(null);
    setError(null);
    const sets = draft.exercises.flatMap((exercise) =>
      exercise.sets.map((set, index) => ({
        id: set.id,
        exercise_id: exercise.exercise_id || undefined,
        exercise_name: exercise.exercise_id ? undefined : exercise.exercise_name,
        set_number: index + 1,
        reps: numberOrUndefined(set.reps),
        ...parseWeightInput(set.weight_lbs),
        is_warmup: set.is_warmup,
        notes: set.notes || undefined,
      }))
    );

    try {
      const response = await fetch(`/api/workouts/${draft.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: draft.date,
          workout_type: draft.workout_type,
          duration_minutes: numberOrUndefined(draft.duration_minutes),
          notes: draft.notes,
          sets,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Workout save failed.");
      setMessage("Workout updated.");
      setDraft(null);
      router.refresh();
    } catch (err) {
      console.error("[history] workout save failed", err);
      setError(err instanceof Error ? err.message : "Workout save failed.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSession = async (session: SessionWithSets) => {
    if (deletingId) return;
    const confirmed = window.confirm(`Delete the workout from ${formatDisplay(session.date)}? This removes only that session and its sets.`);
    if (!confirmed) return;
    setDeletingId(session.id);
    setMessage(null);
    setError(null);
    try {
      const response = await fetch(`/api/workouts/${session.id}`, { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Workout delete failed.");
      setSessions((current) => current.filter((item) => item.id !== session.id));
      if (draft?.id === session.id) setDraft(null);
      setMessage("Workout deleted.");
      router.refresh();
    } catch (err) {
      console.error("[history] workout delete failed", err);
      setError(err instanceof Error ? err.message : "Workout delete failed.");
    } finally {
      setDeletingId(null);
    }
  };

  const copyExport = async (session: SessionWithSets) => {
    const exMap = new Map(exercises.map((e) => [e.id, e.name]));
    const payload = buildProgressExportFromHistory(session, session.sets, exMap);
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopiedId(session.id);
      setTimeout(() => setCopiedId(null), 2500);
    } catch {
      setError("Could not copy to clipboard.");
    }
  };

  return (
    <div className="space-y-6">
      {(message || error) && (
        <div className={`rounded-md border px-3 py-2 text-sm ${error ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300" : "border-green-200 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950/30 dark:text-green-300"}`}>
          {error ?? message}
        </div>
      )}

      {draft && (
        <Card ref={editorRef} className="border-indigo-200 dark:border-indigo-900">
          <CardContent className="space-y-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Edit Workout</h2>
              <Button type="button" size="sm" variant="ghost" onClick={() => setDraft(null)} disabled={saving}>
                <X className="h-3.5 w-3.5" />
                Cancel
              </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_1fr_140px]">
              <label className="space-y-1 text-sm">
                <span className="text-xs font-medium text-zinc-500">Date</span>
                <input type="date" value={draft.date} onChange={(event) => setDraft({ ...draft, date: event.target.value })} className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs font-medium text-zinc-500">Workout type/category</span>
                <input value={draft.workout_type} onChange={(event) => setDraft({ ...draft, workout_type: event.target.value })} className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs font-medium text-zinc-500">Minutes</span>
                <input type="number" min={1} value={draft.duration_minutes} onChange={(event) => setDraft({ ...draft, duration_minutes: event.target.value })} className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" />
              </label>
            </div>

            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-zinc-500">Notes</span>
              <textarea value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} rows={2} className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950" />
            </label>

            <div className="space-y-3">
              {draft.exercises.map((exercise) => (
                <div key={exercise.key} className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-800">
                  <div className="grid gap-2 md:grid-cols-[1fr_auto]">
                    <select
                      value={exercise.exercise_id}
                      onChange={(event) => {
                        const selected = exercises.find((item) => item.id === event.target.value);
                        updateDraftExercise(exercise.key, { exercise_id: event.target.value, exercise_name: selected?.name ?? "" });
                      }}
                      className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      <option value="">New exercise name...</option>
                      {exercises.map((item) => (
                        <option key={item.id} value={item.id}>{item.name}</option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setDraft({ ...draft, exercises: draft.exercises.filter((item) => item.key !== exercise.key) })}
                      disabled={saving || draft.exercises.length === 1}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Exercise
                    </Button>
                  </div>
                  {!exercise.exercise_id && (
                    <input
                      value={exercise.exercise_name}
                      onChange={(event) => updateDraftExercise(exercise.key, { exercise_name: event.target.value })}
                      placeholder="Exercise name"
                      className="mt-2 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                  )}
                  <div className="mt-3 space-y-2">
                    {exercise.sets.map((set, index) => (
                      <div key={`${exercise.key}-${index}`} className="grid gap-2 md:grid-cols-[64px_96px_96px_1fr_auto_auto]">
                        <div className="flex h-10 items-center text-xs font-medium text-zinc-500">Set {index + 1}</div>
                        <input value={set.reps} onChange={(event) => updateDraftSet(exercise.key, index, { reps: event.target.value })} type="number" min={1} placeholder="Reps" className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
                        <input value={set.weight_lbs} onChange={(event) => updateDraftSet(exercise.key, index, { weight_lbs: event.target.value })} type="text" inputMode="decimal" placeholder="Weight or BW" className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
                        <input value={set.notes} onChange={(event) => updateDraftSet(exercise.key, index, { notes: event.target.value })} placeholder="Set notes" className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950" />
                        <label className="flex h-10 items-center gap-2 text-xs text-zinc-500">
                          <input type="checkbox" checked={set.is_warmup} onChange={(event) => updateDraftSet(exercise.key, index, { is_warmup: event.target.checked })} />
                          Warmup
                        </label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => updateDraftExercise(exercise.key, { sets: exercise.sets.filter((_, setIdx) => setIdx !== index) })}
                          disabled={saving || exercise.sets.length === 1}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => updateDraftExercise(exercise.key, { sets: [...exercise.sets, createEmptySet()] })} disabled={saving}>
                    <Plus className="h-3.5 w-3.5" />
                    Add Set
                  </Button>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="outline" onClick={() => setDraft({ ...draft, exercises: [...draft.exercises, createEmptyExercise(exercises)] })} disabled={saving}>
                <Plus className="h-3.5 w-3.5" />
                Add Exercise
              </Button>
              <Button type="button" onClick={saveDraft} disabled={saving || draft.exercises.length === 0}>
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Workout
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {[...grouped.entries()].map(([month, monthSessions]) => {
        const [year, m] = month.split("-");
        const monthName = new Date(parseInt(year), parseInt(m) - 1).toLocaleString("default", { month: "long", year: "numeric" });

        return (
          <div key={month}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{monthName}</h2>
            <div className="space-y-3">
              {monthSessions.map((session) => (
                <Card key={session.id} className="transition-colors hover:border-zinc-300 dark:hover:border-zinc-600">
                  <CardContent className="p-4 sm:p-5">
                    <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)_auto] md:items-start">
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-3 md:block">
                          <span className="whitespace-nowrap text-base font-semibold text-zinc-900 dark:text-zinc-100">{formatDisplay(session.date)}</span>
                          <Badge variant={session.notes?.includes("Home Workout") ? "home" : "outline"} className="shrink-0 text-xs md:mt-2">
                            {sessionLabel(session)}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{session.duration_minutes ? `${session.duration_minutes} min` : "Duration not logged"}</span>
                          <span className="flex items-center gap-1"><Dumbbell className="h-3.5 w-3.5" />{session.sets.length} sets</span>
                        </div>
                      </div>

                      <div className="min-w-0">
                        {session.exercises.length > 0 ? (
                          <>
                            <div className="flex flex-wrap gap-1.5">
                              {session.exercises.slice(0, expandedIds.has(session.id) ? undefined : 4).map((ex) => (
                                <span key={ex} className="max-w-full rounded-full bg-zinc-100 px-2.5 py-1 text-xs leading-4 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                                  {ex}
                                </span>
                              ))}
                            </div>
                            {session.exercises.length > 4 && (
                              <button
                                type="button"
                                className="mt-2 min-h-8 rounded-md px-1 text-xs font-medium text-indigo-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 dark:text-indigo-400"
                                onClick={() => setExpandedIds((current) => {
                                  const next = new Set(current);
                                  if (next.has(session.id)) next.delete(session.id); else next.add(session.id);
                                  return next;
                                })}
                                aria-expanded={expandedIds.has(session.id)}
                              >
                                {expandedIds.has(session.id) ? "Show less" : `+${session.exercises.length - 4} more exercises`}
                              </button>
                            )}
                          </>
                        ) : <p className="text-sm text-zinc-400 dark:text-zinc-500">No exercises recorded</p>}
                      </div>

                      <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-3 md:justify-end md:border-0 md:pt-0">
                          <Button type="button" size="sm" variant="outline" onClick={() => copyExport(session)} disabled={copiedId === session.id}>
                            {copiedId === session.id ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Clipboard className="h-3.5 w-3.5" />}
                            {copiedId === session.id ? "Copied" : "Copy Export"}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => startEdit(session)} disabled={Boolean(loadingEditId) || saving || deletingId === session.id}>
                            {loadingEditId === session.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                            Edit
                          </Button>
                          <Button type="button" size="sm" variant="destructive" onClick={() => deleteSession(session)} disabled={Boolean(deletingId) || saving}>
                            {deletingId === session.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                            Delete
                          </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {sessions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Dumbbell className="mx-auto mb-3 h-8 w-8 text-zinc-300 dark:text-zinc-600" />
            <p className="text-zinc-500 dark:text-zinc-400">No sessions yet. Import your workout logs to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
