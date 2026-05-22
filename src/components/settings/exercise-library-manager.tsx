"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Archive, Loader2, Pencil, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Equipment, Exercise, ExerciseLibraryCategory, ExerciseStatus, MuscleGroup, WorkoutTag } from "@/types";

const CATEGORIES: ExerciseLibraryCategory[] = ["Strength", "Calisthenics", "Home Workout", "Running/Cardio", "Warmup", "Recovery"];
const CATEGORY_FILTERS: Array<ExerciseLibraryCategory | "All"> = ["All", ...CATEGORIES];
const TAGS: WorkoutTag[] = ["push", "pull", "legs", "upper", "lower", "full_body", "core", "home", "compound", "isolation"];
const MUSCLE_GROUPS: MuscleGroup[] = ["chest", "back", "shoulders", "biceps", "triceps", "legs", "glutes", "hamstrings", "quads", "calves", "core", "full_body"];

type Draft = {
  id?: string;
  name: string;
  aliases: string;
  equipment_id: string;
  status: ExerciseStatus;
  muscle_groups: MuscleGroup[];
  library_category: ExerciseLibraryCategory;
  phase_order: number;
  tags: WorkoutTag[];
  notes: string;
};

const emptyDraft: Draft = {
  name: "",
  aliases: "",
  equipment_id: "",
  status: "active",
  muscle_groups: [],
  library_category: "Strength",
  phase_order: 0,
  tags: ["compound"],
  notes: "",
};

function draftFromExercise(exercise: Exercise): Draft {
  return {
    id: exercise.id,
    name: exercise.name,
    aliases: exercise.aliases.join(", "),
    equipment_id: exercise.equipment_id ?? "",
    status: exercise.status ?? "active",
    muscle_groups: exercise.muscle_groups,
    library_category: exercise.library_category ?? "Strength",
    phase_order: exercise.phase_order ?? 0,
    tags: exercise.tags.length ? exercise.tags : ["compound"],
    notes: exercise.notes ?? "",
  };
}

export function ExerciseLibraryManager({
  initialExercises,
  equipment,
  initialEditId,
}: {
  initialExercises: Exercise[];
  equipment: Equipment[];
  initialEditId?: string;
}) {
  const router = useRouter();
  const [exercises, setExercises] = useState(initialExercises);
  const [selectedCategory, setSelectedCategory] = useState<ExerciseLibraryCategory | "All">("All");
  const [showArchived, setShowArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft>(() => {
    const initialEdit = initialEditId ? initialExercises.find((exercise) => exercise.id === initialEditId) : undefined;
    return initialEdit ? draftFromExercise(initialEdit) : emptyDraft;
  });
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const editorRef = useRef<HTMLElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const initialEdit = initialEditId ? exercises.find((exercise) => exercise.id === initialEditId) : undefined;
    if (!initialEdit) return;
    setDraft(draftFromExercise(initialEdit));
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameRef.current?.focus({ preventScroll: true });
    });
  }, [exercises, initialEditId]);

  const visible = useMemo(
    () =>
      exercises
        .filter((exercise) => selectedCategory === "All" || (exercise.library_category ?? "Strength") === selectedCategory)
        .filter((exercise) => showArchived || exercise.status !== "archived")
        .filter((exercise) => {
          const query = search.trim().toLowerCase();
          if (!query) return true;
          const equipmentName = exercise.equipment?.name ?? equipment.find((item) => item.id === exercise.equipment_id)?.name ?? "";
          return [
            exercise.name,
            exercise.library_category,
            exercise.status,
            equipmentName,
            exercise.aliases.join(" "),
            exercise.muscle_groups.join(" "),
            exercise.tags.join(" "),
          ].some((value) => value?.toLowerCase().includes(query));
        })
        .sort((a, b) => (a.phase_order ?? 0) - (b.phase_order ?? 0) || a.name.localeCompare(b.name)),
    [equipment, exercises, search, selectedCategory, showArchived]
  );

  const startEdit = (exercise: Exercise) => {
    setError(null);
    setMessage(null);
    setDraft(draftFromExercise(exercise));
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      nameRef.current?.focus({ preventScroll: true });
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/exercises", {
        method: draft.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Exercise save failed");
      setExercises((current) => {
        const next = current.filter((exercise) => exercise.id !== data.exercise.id);
        return [...next, data.exercise];
      });
      setSelectedCategory(data.exercise.library_category ?? "Strength");
      setDraft(emptyDraft);
      if (draft.id) router.replace("/settings/exercises");
      setMessage(draft.id ? "Exercise updated." : "Exercise added.");
    } catch (err) {
      console.error("[exercise-library] save failed", err);
      setError(err instanceof Error ? err.message : "Exercise save failed");
    } finally {
      setSaving(false);
    }
  };

  const archive = async (exercise: Exercise) => {
    setBusyId(exercise.id);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/exercises", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: exercise.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Archive failed");
      setExercises((current) => current.map((item) => (item.id === exercise.id ? data.exercise : item)));
      setMessage("Exercise archived. Historical logs keep their exercise reference.");
    } catch (err) {
      console.error("[exercise-library] archive failed", err);
      setError(err instanceof Error ? err.message : "Archive failed");
    } finally {
      setBusyId(null);
    }
  };

  const move = async (exercise: Exercise, direction: -1 | 1) => {
    const ordered = visible.filter((item) => item.status !== "archived");
    const idx = ordered.findIndex((item) => item.id === exercise.id);
    const swap = ordered[idx + direction];
    if (!swap) return;
    const currentOrder = exercise.phase_order ?? idx;
    const swapOrder = swap.phase_order ?? idx + direction;
    setExercises((current) =>
      current.map((item) =>
        item.id === exercise.id
          ? { ...item, phase_order: swapOrder }
          : item.id === swap.id
            ? { ...item, phase_order: currentOrder }
            : item
      )
    );
    await Promise.all([
      fetch("/api/exercises", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...exercise, phase_order: swapOrder }),
      }),
      fetch("/api/exercises", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...swap, phase_order: currentOrder }),
      }),
    ]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {CATEGORY_FILTERS.map((category) => (
          <Button
            key={category}
            type="button"
            size="sm"
            variant={selectedCategory === category ? "accent" : "outline"}
            onClick={() => {
              setSelectedCategory(category);
              if (category !== "All") {
                setDraft((current) => ({ ...current, library_category: category }));
              }
            }}
          >
            {category}
          </Button>
        ))}
      </div>

      <section id="exercise-editor" ref={editorRef} className="rounded-lg border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">{draft.id ? "Edit Exercise" : "Add Exercise"}</h2>
          {draft.id && (
            <Button asChild size="sm" variant="ghost" onClick={() => setDraft(emptyDraft)}>
              <Link href="/settings/exercises">
                <X className="h-3.5 w-3.5" />
                Cancel
              </Link>
            </Button>
          )}
          {!draft.id && initialEditId && (
            <Button asChild size="sm" variant="ghost">
              <Link href="/settings/exercises">
              <X className="h-3.5 w-3.5" />
              Cancel
              </Link>
            </Button>
          )}
        </div>
        <div className="grid gap-3 md:grid-cols-[1.5fr_1fr_1fr_120px]">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-zinc-500">Name</span>
            <input ref={nameRef} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-zinc-500">Aliases</span>
            <input value={draft.aliases} onChange={(event) => setDraft((current) => ({ ...current, aliases: event.target.value }))} className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-zinc-500">Equipment</span>
            <select value={draft.equipment_id} onChange={(event) => setDraft((current) => ({ ...current, equipment_id: event.target.value }))} className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="">None</option>
              {equipment.map((item) => (
                <option key={item.id} value={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-zinc-500">Order</span>
            <input type="number" min={0} value={draft.phase_order} onChange={(event) => setDraft((current) => ({ ...current, phase_order: Number(event.target.value) || 0 }))} className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950" />
          </label>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px]">
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-zinc-500">Category / body part</span>
            <select value={draft.library_category} onChange={(event) => setDraft((current) => ({ ...current, library_category: event.target.value as ExerciseLibraryCategory }))} className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span className="text-xs font-medium text-zinc-500">Status</span>
            <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ExerciseStatus }))} className="h-10 w-full rounded-md border border-zinc-300 bg-white px-3 dark:border-zinc-700 dark:bg-zinc-950">
              <option value="active">Active</option>
              <option value="unreviewed">Unreviewed</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {MUSCLE_GROUPS.map((muscle) => (
            <button
              key={muscle}
              type="button"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  muscle_groups: current.muscle_groups.includes(muscle)
                    ? current.muscle_groups.filter((item) => item !== muscle)
                    : [...current.muscle_groups, muscle],
                }))
              }
              className={`rounded-md border px-2.5 py-1 text-xs ${
                draft.muscle_groups.includes(muscle)
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
                  : "border-zinc-200 text-zinc-500 dark:border-zinc-800"
              }`}
            >
              {muscle}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  tags: current.tags.includes(tag) ? current.tags.filter((item) => item !== tag) : [...current.tags, tag],
                }))
              }
              className={`rounded-md border px-2.5 py-1 text-xs ${
                draft.tags.includes(tag)
                  ? "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-300"
                  : "border-zinc-200 text-zinc-500 dark:border-zinc-800"
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
        <label className="mt-3 block space-y-1 text-sm">
          <span className="text-xs font-medium text-zinc-500">Notes</span>
          <textarea
            value={draft.notes}
            onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
            rows={2}
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          />
        </label>
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="text-sm">
            {message && <span className="text-green-700 dark:text-green-300">{message}</span>}
            {error && <span className="text-red-700 dark:text-red-300">{error}</span>}
          </div>
          <Button onClick={save} disabled={saving || !draft.name.trim()}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : draft.id ? <Save className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {draft.id ? "Save Exercise" : "Add Exercise"}
          </Button>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">{selectedCategory} Exercises</h2>
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search exercises"
              className="h-9 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
            <label className="flex items-center gap-2 text-sm text-zinc-500">
              <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
              Show archived
            </label>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {visible.length === 0 ? (
            <p className="p-5 text-sm text-zinc-500">No exercises in this phase yet.</p>
          ) : (
            visible.map((exercise, index) => (
              <div key={exercise.id} className="grid gap-3 border-b border-zinc-100 p-4 last:border-0 dark:border-zinc-800 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/exercises/${exercise.id}`} className="font-medium text-zinc-950 underline-offset-4 hover:underline dark:text-zinc-50">
                      {exercise.name}
                    </Link>
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-800">{exercise.status ?? "active"}</span>
                  </div>
                  <p className="mt-1 text-xs text-zinc-500">
                    #{exercise.phase_order ?? index} · {exercise.library_category ?? "Strength"} · {exercise.muscle_groups.join(", ") || "no body part"} · {exercise.equipment?.name ?? equipment.find((item) => item.id === exercise.equipment_id)?.name ?? "no equipment"} · {exercise.tags.join(", ") || "no tags"} · aliases: {exercise.aliases.join(", ") || "none"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2 md:justify-end">
                  <Button size="sm" variant="outline" onClick={() => move(exercise, -1)} disabled={index === 0 || exercise.status === "archived"}>
                    Up
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => move(exercise, 1)} disabled={index === visible.length - 1 || exercise.status === "archived"}>
                    Down
                  </Button>
                  <Button asChild size="sm" variant="outline" onClick={() => startEdit(exercise)} aria-disabled={saving || busyId === exercise.id}>
                    <Link href={`/settings/exercises?edit=${exercise.id}#exercise-editor`}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => archive(exercise)} disabled={busyId === exercise.id || exercise.status === "archived"}>
                    {busyId === exercise.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Archive className="h-3.5 w-3.5" />}
                    Archive
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
