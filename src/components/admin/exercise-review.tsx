"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { CanonicalExercise, Exercise } from "@/types";

interface ReviewPayload {
  canonical: CanonicalExercise[];
  unreviewed: Exercise[];
}

export function ExerciseReview() {
  const [data, setData] = useState<ReviewPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [mappingState, setMappingState] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/exercises/review");
      const payload = await res.json();
      setData(payload);
      setMappingState((prev) => {
        const next = { ...prev };
        for (const ex of payload.unreviewed as Exercise[]) {
          if (!next[ex.id] && payload.canonical.length > 0) {
            next[ex.id] = payload.canonical[0].id;
          }
        }
        return next;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const mapExercise = async (exerciseId: string) => {
    const canonicalId = mappingState[exerciseId];
    if (!canonicalId) return;
    setSubmitting(exerciseId);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/exercises/map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          exercise_id: exerciseId,
          canonical_exercise_id: canonicalId,
        }),
      });
      const payload = await res.json();
      if (!res.ok) {
        setMessage(payload.error ?? "Failed to map exercise");
      } else {
        setMessage(`Mapped successfully. Historical sets updated: ${payload.remappedSets}`);
        await load();
      }
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-zinc-600">
        <Loader2 className="w-4 h-4 animate-spin" />
        Loading exercise review queue...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && <p className="text-sm text-indigo-700">{message}</p>}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Unreviewed Exercises ({data?.unreviewed.length ?? 0})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(data?.unreviewed.length ?? 0) === 0 && (
            <p className="text-sm text-zinc-500">No unreviewed exercises right now.</p>
          )}
          {data?.unreviewed.map((exercise) => (
            <div key={exercise.id} className="border rounded-lg p-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
              <div>
                <p className="font-medium text-sm text-zinc-900">{exercise.name}</p>
                <p className="text-xs text-zinc-500">aliases: {exercise.aliases.join(", ") || "none"}</p>
              </div>
              <div className="flex gap-2 items-center">
                <select
                  className="border rounded px-2 py-1 text-sm"
                  value={mappingState[exercise.id] ?? ""}
                  onChange={(e) =>
                    setMappingState((prev) => ({ ...prev, [exercise.id]: e.target.value }))
                  }
                >
                  {(data?.canonical ?? []).map((canonical) => (
                    <option key={canonical.id} value={canonical.id}>
                      {canonical.name} ({canonical.category})
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  disabled={!mappingState[exercise.id] || submitting === exercise.id}
                  onClick={() => mapExercise(exercise.id)}
                >
                  {submitting === exercise.id ? "Mapping..." : "Map"}
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

