"use client";
import { useState } from "react";
import { ChevronRight, Loader2, CalendarPlus, Eye, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatShort } from "@/lib/utils/dates";
import type { TrainingPhase } from "@/types";
import { differenceInDays, parseISO } from "@/lib/utils/dates";
import { useRouter } from "next/navigation";

interface Props {
  phase: TrainingPhase;
  phases: TrainingPhase[];
}

export function PhasePanel({ phase, phases }: Props) {
  const [advancing, setAdvancing] = useState(false);
  const [preview, setPreview] = useState<TrainingPhase | null>(null);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const start = parseISO(phase.start_date);
  const end = parseISO(phase.end_date);
  const total = differenceInDays(end, start);
  const elapsed = Math.max(0, differenceInDays(new Date(), start));
  const pct = Math.min(100, Math.round((elapsed / total) * 100));
  const daysLeft = Math.max(0, differenceInDays(end, new Date()));
  const weekNum = Math.ceil(Math.min(elapsed, total) / 7);

  const phaseAction = async (body: Record<string, unknown>) => {
    setAdvancing(true);
    setError(null);
    try {
      const response = await fetch("/api/phases/advance", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Phase update failed.");
      if (data.preview) setPreview(data.preview);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Phase update failed.");
    } finally {
      setAdvancing(false);
    }
  };

  const advancePhase = () => {
    if (window.confirm("Activate the next phase now? Completed workouts and prior phases will remain unchanged.")) phaseAction({ action: "advance" });
  };

  const editPhase = () => {
    const name = window.prompt("Phase name", phase.name);
    if (name === null) return;
    const description = window.prompt("Phase description", phase.description);
    if (description === null) return;
    if (window.confirm("Save these phase details? Completed workout history will not change.")) phaseAction({ action: "edit", name, description, rep_range_low: phase.rep_range_low, rep_range_high: phase.rep_range_high });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="accent">{phase.name}</Badge>
          <span className="text-xs text-zinc-400 dark:text-zinc-500">
            {phase.rep_range_low}–{phase.rep_range_high} reps
          </span>
        </div>
        {daysLeft <= 3 && (
          <Button
            variant="outline"
            size="sm"
            onClick={advancePhase}
            disabled={advancing}
            className="gap-1 text-xs"
          >
            {advancing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronRight className="w-3 h-3" />}
            Next Phase
          </Button>
        )}
      </div>

      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">{phase.description}</p>

      <div className="flex justify-between text-xs text-zinc-400 dark:text-zinc-500 mb-1.5">
        <span>{formatShort(phase.start_date)}</span>
        <span>
          Week {weekNum} of 3 · {daysLeft > 0 ? `${daysLeft}d left` : "complete"}
        </span>
        <span>{formatShort(phase.end_date)}</span>
      </div>
      <Progress value={pct} />

      <div className="mt-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <Button variant="outline" size="sm" onClick={() => phaseAction({ action: "preview" })} disabled={advancing}><Eye className="h-3.5 w-3.5" />Preview next</Button>
        <Button variant="outline" size="sm" onClick={() => { if (window.confirm("Extend this phase by seven days? Completed workouts will remain unchanged.")) phaseAction({ action: "extend", days: 7 }); }} disabled={advancing}><CalendarPlus className="h-3.5 w-3.5" />Extend 7 days</Button>
        <Button variant="outline" size="sm" onClick={editPhase} disabled={advancing}><Pencil className="h-3.5 w-3.5" />Edit phase</Button>
        {daysLeft > 3 && <Button variant="outline" size="sm" onClick={advancePhase} disabled={advancing}><ChevronRight className="h-3.5 w-3.5" />Advance early</Button>}
      </div>

      {phases.length > 1 && (
        <label className="mt-3 block text-xs text-zinc-500 dark:text-zinc-400">
          Select a phase
          <select
            value={phase.id}
            onChange={(event) => {
              const selected = phases.find((item) => item.id === event.target.value);
              if (selected && window.confirm(`Activate ${selected.name}? Completed workout history will remain linked to its original phase.`)) phaseAction({ action: "activate", phase_id: selected.id });
            }}
            className="mt-1 h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          >
            {phases.map((item) => <option key={item.id} value={item.id}>{item.is_active ? "Active · " : item.start_date > phase.start_date ? "Upcoming · " : "Past · "}{item.name}</option>)}
          </select>
        </label>
      )}

      {preview && (
        <div className="mt-3 rounded-lg border border-indigo-200 bg-indigo-50/60 p-3 text-sm dark:border-indigo-900 dark:bg-indigo-950/30">
          <div className="flex items-center justify-between gap-3"><strong>{preview.name}</strong><span>{preview.rep_range_low}–{preview.rep_range_high} reps</span></div>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">{preview.description}</p>
          <p className="mt-2 text-xs text-indigo-700 dark:text-indigo-300">Keeps foundational patterns while rotating accessories, ordering, and superset pairings.</p>
          <div className="mt-3 flex flex-wrap gap-2"><Button size="sm" onClick={advancePhase} disabled={advancing}>Activate preview</Button><Button size="sm" variant="outline" onClick={() => phaseAction({ action: "regenerate" })} disabled={advancing}>Regenerate preview</Button></div>
        </div>
      )}
      {error && <p className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>}

      {daysLeft === 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
          Phase complete — advance to the next phase when ready.
        </p>
      )}
    </div>
  );
}
