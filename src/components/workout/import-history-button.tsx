"use client";

import { useState } from "react";
import { AlertCircle, CheckCircle, Database, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportHistoryResult {
  imported_sessions: number;
  skipped_duplicates: number;
  imported_sets: number;
  unreviewed_created: string[];
  errors: string[];
}

export function ImportHistoryButton() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportHistoryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleImport = async () => {
    setLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/import/workout-history", { method: "POST" });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error ?? "Workout history import failed");
        return;
      }

      setResult(data);
    } catch {
      setError("Network error - please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <Button onClick={handleImport} disabled={loading} className="w-full gap-1.5">
        {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Database className="w-3.5 h-3.5" />}
        {loading ? "Importing..." : "Import Workout History"}
      </Button>

      {result && (
        <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">
              Imported {result.imported_sessions} session{result.imported_sessions === 1 ? "" : "s"} ·{" "}
              {result.imported_sets} sets
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              Skipped {result.skipped_duplicates} duplicate session
              {result.skipped_duplicates === 1 ? "" : "s"}.
            </p>
            {result.unreviewed_created.length > 0 && (
              <p className="text-xs text-amber-700 mt-1">
                Created {result.unreviewed_created.length} unreviewed exercise
                {result.unreviewed_created.length === 1 ? "" : "s"}.
              </p>
            )}
            {result.errors.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-xs text-red-600">
                {result.errors.slice(0, 5).map((message, index) => (
                  <li key={`${message}-${index}`}>- {message}</li>
                ))}
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
    </div>
  );
}
