"use client";

import { useMemo, useState } from "react";
import { Archive, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GoalProgress, WorkoutGoal } from "@/types";

type Draft = {
  id?: string;
  name: string;
  description: string;
  focus_area: string;
  status: "active" | "archived";
};

const EMPTY_DRAFT: Draft = { name: "", description: "", focus_area: "", status: "active" };

export function GoalsManager({ goals, progress }: { goals: WorkoutGoal[]; progress: GoalProgress[] }) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [showArchived, setShowArchived] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const progressByGoal = useMemo(() => new Map(progress.map((item) => [item.goal_id, item])), [progress]);
  const visibleGoals = goals.filter((goal) => showArchived || goal.status === "active");

  async function saveGoal(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const response = await fetch(draft.id ? `/api/goals/${draft.id}` : "/api/goals", {
      method: draft.id ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(draft),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      setMessage(data.error ?? "Could not save goal.");
      return;
    }
    setDraft(EMPTY_DRAFT);
    setMessage("Goal saved. New routines will use it when it fits the workout day.");
    router.refresh();
  }

  async function updateStatus(goal: WorkoutGoal, status: "active" | "archived") {
    setBusy(true);
    const response = await fetch(`/api/goals/${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...goal, status }),
    });
    setBusy(false);
    setMessage(response.ok ? `Goal ${status === "active" ? "activated" : "archived"}.` : "Could not update goal.");
    if (response.ok) router.refresh();
  }

  async function removeGoal(goal: WorkoutGoal) {
    if (!window.confirm(`Delete "${goal.name}"? Logged workouts will remain in your history.`)) return;
    setBusy(true);
    const response = await fetch(`/api/goals/${goal.id}`, { method: "DELETE" });
    setBusy(false);
    setMessage(response.ok ? "Goal deleted. Workout history was preserved." : "Could not delete goal.");
    if (response.ok) router.refresh();
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(270px,330px)_1fr]">
      <Card className="h-fit">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{draft.id ? "Edit Goal" : "Add Goal"}</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-3" onSubmit={saveGoal}>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Name
              <input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} placeholder="e.g. Chest" className="mt-1 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
            </label>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Focus area
              <input required list="goal-focus-options" value={draft.focus_area} onChange={(event) => setDraft({ ...draft, focus_area: event.target.value })} placeholder="core, glutes, chest..." className="mt-1 h-10 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
              <datalist id="goal-focus-options">
                {["core", "glutes", "arms", "chest", "back", "shoulders", "cardio", "strength", "mobility"].map((item) => <option key={item} value={item} />)}
              </datalist>
            </label>
            <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400">
              Description / notes
              <textarea value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} rows={3} placeholder="What do you want to prioritize?" className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100" />
            </label>
            <div className="flex gap-2">
              <Button type="submit" variant="accent" size="sm" disabled={busy} className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                {draft.id ? "Update Goal" : "Add Goal"}
              </Button>
              {draft.id && (
                <Button type="button" variant="outline" size="sm" onClick={() => setDraft(EMPTY_DRAFT)}>Cancel</Button>
              )}
            </div>
            {message && <p className="text-xs text-indigo-600 dark:text-indigo-400">{message}</p>}
          </form>
        </CardContent>
      </Card>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-zinc-700 dark:text-zinc-300">Active Goals</h2>
          <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
            <input type="checkbox" checked={showArchived} onChange={(event) => setShowArchived(event.target.checked)} />
            Show archived
          </label>
        </div>
        {visibleGoals.length === 0 && (
          <Card><CardContent className="py-8 text-center text-sm text-zinc-500">No active goals. Add one to guide future routines.</CardContent></Card>
        )}
        {visibleGoals.map((goal) => {
          const goalProgress = progressByGoal.get(goal.id);
          return (
            <Card key={goal.id} className={goal.status === "archived" ? "opacity-70" : undefined}>
              <CardHeader className="pb-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{goal.name}</CardTitle>
                      <Badge variant={goal.status === "active" ? "success" : "secondary"} className="capitalize">{goal.status}</Badge>
                    </div>
                    <p className="mt-1 text-xs capitalize text-zinc-500 dark:text-zinc-400">Focus: {goal.focus_area.replace("_", " ")}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => setDraft(goal)} disabled={busy}><Pencil className="h-3.5 w-3.5" /> Edit</Button>
                    {goal.status === "active" ? (
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(goal, "archived")} disabled={busy}><Archive className="h-3.5 w-3.5" /> Archive</Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => updateStatus(goal, "active")} disabled={busy}><RotateCcw className="h-3.5 w-3.5" /> Restore</Button>
                    )}
                    <Button aria-label={`Delete ${goal.name}`} variant="ghost" size="sm" onClick={() => removeGoal(goal)} disabled={busy} className="text-red-600"><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {goal.description && <p className="text-sm text-zinc-600 dark:text-zinc-300">{goal.description}</p>}
                <div className="flex gap-4 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{goalProgress?.total_sets ?? 0} matching sets</span>
                  <span>{goalProgress?.session_count ?? 0} sessions</span>
                  <span>{goal.exercise_ids.length} linked exercises</span>
                </div>
                {(goalProgress?.recent_sessions.length ?? 0) > 0 && (
                  <div className="rounded-lg bg-zinc-50 px-3 py-2 dark:bg-zinc-950">
                    <p className="mb-1.5 text-xs font-medium text-zinc-500 dark:text-zinc-400">Recent progress</p>
                    {goalProgress?.recent_sessions.map((session) => (
                      <p key={session.session_id} className="py-0.5 text-xs text-zinc-600 dark:text-zinc-300">
                        {session.date} · {session.set_count} sets · {session.exercise_names.join(", ")}
                      </p>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
