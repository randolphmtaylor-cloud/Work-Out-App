"use client";

import { useState } from "react";
import { Loader2, ShieldAlert, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function ResetHistoryCard() {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const clearLocalHistoryCaches = async () => {
    try {
      for (const key of Object.keys(window.localStorage)) {
        if (key.toLowerCase().includes("workout") || key.toLowerCase().includes("import") || key.toLowerCase().includes("dashboard")) {
          window.localStorage.removeItem(key);
        }
      }
      for (const key of Object.keys(window.sessionStorage)) {
        if (key.toLowerCase().includes("workout") || key.toLowerCase().includes("import") || key.toLowerCase().includes("dashboard")) {
          window.sessionStorage.removeItem(key);
        }
      }
      if ("caches" in window) {
        const names = await window.caches.keys();
        await Promise.all(names.filter((name) => name.includes("workout") || name.includes("dashboard")).map((name) => window.caches.delete(name)));
      }
    } catch {
      // Browser storage cleanup is best-effort; the server reset is authoritative.
    }
  };

  const reset = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await fetch("/api/history/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Reset failed");
      await clearLocalHistoryCaches();
      setConfirming(false);
      setMessage(`Reset complete. Deleted ${data.sessions_deleted} sessions and ${data.sets_deleted} sets. Exercise library kept.`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900/60 dark:bg-red-950/20">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-red-950 dark:text-red-100">Reset Workout History</h2>
          <p className="mt-1 text-sm text-red-800 dark:text-red-200">
            Clears logged sessions, imported workout rows, generated workout history, and dashboard summary caches.
          </p>
        </div>
        <Button variant="destructive" onClick={() => setConfirming(true)} disabled={busy} className="shrink-0">
          <Trash2 className="h-4 w-4" />
          Reset Workout History
        </Button>
      </div>
      {message && <p className="mt-3 text-sm font-medium text-green-700 dark:text-green-300">{message}</p>}
      {error && <p className="mt-3 text-sm font-medium text-red-700 dark:text-red-300">{error}</p>}

      {confirming && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-50 p-2 text-red-600">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Reset Workout History?</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  This clears logged workout history and dashboard stats, but keeps your exercise library.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(false)} disabled={busy}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={reset} disabled={busy}>
                {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Reset History
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
