"use client";
import { useState } from "react";
import { Sparkles, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { formatShort } from "@/lib/utils/dates";
import type { WeeklySummary, TrainingPhase } from "@/types";
import { useRouter } from "next/navigation";

interface Props {
  summary: WeeklySummary | null;
  phase: TrainingPhase | null;
}

export function SummaryPanel({ summary: initialSummary, phase }: Props) {
  const [summary, setSummary] = useState(initialSummary);
  const [generating, setGenerating] = useState(false);
  const router = useRouter();

  const regenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/summaries/generate", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card className="border-indigo-100">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <CardTitle className="text-base">Weekly Summary</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {summary && (
              <span className="text-xs text-zinc-400">
                {formatShort(summary.week_start)} – {formatShort(summary.week_end)}
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={regenerate}
              disabled={generating}
              className="gap-1 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
            >
              {generating
                ? <Loader2 className="w-3 h-3 animate-spin" />
                : <RefreshCw className="w-3 h-3" />}
              {generating ? "Generating..." : "Regenerate"}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary ? (
          <>
            <div className="text-sm text-zinc-700 space-y-2 leading-relaxed">
              {summary.summary_text.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  dangerouslySetInnerHTML={{
                    __html: para.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>"),
                  }}
                />
              ))}
            </div>

            <Separator />

            <div className="grid grid-cols-3 gap-3">
              <Stat value={summary.stats.sessions_completed} label="Sessions" />
              <Stat value={summary.stats.total_sets} label="Sets" />
              <Stat
                value={`${(summary.stats.total_volume_lbs / 1000).toFixed(1)}k`}
                label="Volume (lbs)"
              />
            </div>

            {summary.stats.top_lifts.length > 0 && (
              <div>
                <p className="text-xs text-zinc-400 mb-2">Top lifts this week</p>
                <div className="flex flex-wrap gap-1.5">
                  {summary.stats.top_lifts.map((lift, i) => (
                    <div
                      key={i}
                      className="text-xs bg-zinc-50 border border-zinc-200 rounded-lg px-2.5 py-1.5"
                    >
                      <span className="font-medium text-zinc-700">{lift.exercise}</span>
                      <span className="text-zinc-400 ml-1.5">{lift.best_set}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-zinc-500 mb-3">No summary yet for this week.</p>
            <Button
              variant="outline"
              size="sm"
              onClick={regenerate}
              disabled={generating}
              className="gap-1.5"
            >
              {generating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Generate Summary
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div className="text-center">
      <p className="text-xl font-bold text-zinc-900">{value}</p>
      <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
    </div>
  );
}
