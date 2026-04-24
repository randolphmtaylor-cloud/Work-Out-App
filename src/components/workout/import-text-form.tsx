"use client";
import { useState } from "react";
import { CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

interface ImportResult {
  sessions_parsed: number;
  sets_parsed: number;
  warnings: string[];
}

export function ImportTextForm() {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Import failed");
      } else {
        setResult(data);
        setText("");
      }
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`April 5 — Pull Day\nPull-ups: 3x8, 3x7, 3x6\nHammer Row: 180x3x6\nDB Curl: 35lbs 3 sets 10 reps`}
        className="min-h-[160px] font-mono text-xs"
      />

      {result && (
        <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Imported {result.sessions_parsed} session{result.sessions_parsed !== 1 ? "s" : ""} · {result.sets_parsed} sets</p>
            {result.warnings.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-green-600">
                {result.warnings.map((w, i) => <li key={i}>⚠ {w}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Button type="submit" disabled={loading || !text.trim()} className="w-full gap-1.5">
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {loading ? "Parsing..." : "Import Workouts"}
      </Button>
    </form>
  );
}
