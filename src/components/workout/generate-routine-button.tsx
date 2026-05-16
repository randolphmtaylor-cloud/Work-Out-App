"use client";
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function GenerateRoutineButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch("/api/routines/generate", {
        method: "POST",
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        const message = payload?.error ?? `Routine generation failed with status ${response.status}.`;
        console.error("[GenerateRoutineButton] routine generation failed", {
          status: response.status,
          statusText: response.statusText,
          payload,
        });
        setError(message);
        return;
      }
      router.refresh();
    } catch (err) {
      console.error("[GenerateRoutineButton] routine generation request failed", err);
      setError(
        err instanceof DOMException && err.name === "AbortError"
          ? "Routine generation timed out. Please try again."
          : err instanceof Error ? err.message : "Routine generation failed. Please try again."
      );
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button variant="outline" size="sm" onClick={handleGenerate} disabled={loading} className="gap-1.5">
        <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
        {loading ? "Generating..." : "New Routine"}
      </Button>
      {error && (
        <p className="max-w-64 text-right text-xs text-red-600 dark:text-red-400" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
