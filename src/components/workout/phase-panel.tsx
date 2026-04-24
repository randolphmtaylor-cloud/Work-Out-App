"use client";
import { useState } from "react";
import { ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatShort } from "@/lib/utils/dates";
import type { TrainingPhase } from "@/types";
import { differenceInDays, parseISO } from "@/lib/utils/dates";
import { useRouter } from "next/navigation";

interface Props {
  phase: TrainingPhase;
}

export function PhasePanel({ phase }: Props) {
  const [advancing, setAdvancing] = useState(false);
  const router = useRouter();

  const start = parseISO(phase.start_date);
  const end = parseISO(phase.end_date);
  const total = differenceInDays(end, start);
  const elapsed = Math.max(0, differenceInDays(new Date(), start));
  const pct = Math.min(100, Math.round((elapsed / total) * 100));
  const daysLeft = Math.max(0, differenceInDays(end, new Date()));
  const weekNum = Math.ceil(Math.min(elapsed, total) / 7);

  const advancePhase = async () => {
    setAdvancing(true);
    try {
      await fetch("/api/phases/advance", { method: "POST" });
      router.refresh();
    } finally {
      setAdvancing(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge variant="accent">{phase.name}</Badge>
          <span className="text-xs text-zinc-400">
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

      <p className="text-sm text-zinc-600 mb-3">{phase.description}</p>

      <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
        <span>{formatShort(phase.start_date)}</span>
        <span>
          Week {weekNum} of 3 · {daysLeft > 0 ? `${daysLeft}d left` : "complete"}
        </span>
        <span>{formatShort(phase.end_date)}</span>
      </div>
      <Progress value={pct} />

      {daysLeft === 0 && (
        <p className="text-xs text-amber-600 mt-2">
          Phase complete — advance to the next phase when ready.
        </p>
      )}
    </div>
  );
}
