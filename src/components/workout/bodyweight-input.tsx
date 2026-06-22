"use client";

import { useEffect, useState } from "react";
import { Scale, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Props {
  date: string; // YYYY-MM-DD
  getCopyExportPayload?: () => object | null;
}

function storageKey(date: string) {
  return `gym_bw_${date}`;
}

export function BodyweightInput({ date, getCopyExportPayload }: Props) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");

  // Read from localStorage after mount (client only)
  useEffect(() => {
    const stored = localStorage.getItem(storageKey(date));
    if (stored) {
      const n = parseFloat(stored);
      if (n > 0) {
        setSaved(n);
        setValue(String(n));
      }
    }
  }, [date]);

  function handleSave() {
    setError(null);
    const num = parseFloat(value);
    if (!value.trim() || isNaN(num) || num <= 0) {
      setError("Please enter a valid positive number.");
      return;
    }
    localStorage.setItem(storageKey(date), String(num));
    setSaved(num);
  }

  async function handleCopyExport() {
    if (!getCopyExportPayload) return;
    const payload = getCopyExportPayload();
    if (!payload) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopyState("copied");
      setTimeout(() => setCopyState("idle"), 2500);
    } catch {
      setCopyState("error");
      setTimeout(() => setCopyState("idle"), 2500);
    }
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Scale className="w-4 h-4 text-zinc-500" />
          <CardTitle className="text-sm font-semibold text-zinc-600 dark:text-zinc-400">
            Today&apos;s Bodyweight
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {saved !== null && (
          <p className="text-sm text-zinc-700 dark:text-zinc-300 font-medium">
            Today&apos;s Bodyweight: {saved} lbs
          </p>
        )}
        <div className="flex gap-2 flex-wrap">
          <input
            type="number"
            min="1"
            step="0.1"
            placeholder="Enter weight (lbs)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            className="w-40 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:placeholder:text-zinc-500"
          />
          <Button size="sm" onClick={handleSave}>
            {saved !== null ? "Update" : "Save"}
          </Button>
          {getCopyExportPayload && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleCopyExport}
              className="gap-1.5"
            >
              {copyState === "copied" ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-500" />
                  <span className="text-green-600 dark:text-green-400">Workout export copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Export
                </>
              )}
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        {copyState === "error" && (
          <p className="text-xs text-red-500">Could not copy to clipboard. Please try again.</p>
        )}
      </CardContent>
    </Card>
  );
}
