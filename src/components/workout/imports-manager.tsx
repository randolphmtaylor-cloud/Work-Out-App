"use client";

import { useMemo, useState } from "react";
import { CheckCircle, Loader2, Pencil, RotateCcw, ShieldAlert, Trash2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ImportBatch, LegacyImportPreview } from "@/types";

type Toast = { type: "success" | "error"; message: string } | null;

export function ImportsManager({
  initialImports,
  legacyPreview,
}: {
  initialImports: ImportBatch[];
  legacyPreview: LegacyImportPreview;
}) {
  const [imports, setImports] = useState(initialImports);
  const [legacy, setLegacy] = useState(legacyPreview);
  const [confirming, setConfirming] = useState<ImportBatch | null>(null);
  const [confirmingAll, setConfirmingAll] = useState(false);
  const [confirmingLegacyDelete, setConfirmingLegacyDelete] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteAllBusy, setDeleteAllBusy] = useState(false);
  const [legacyDeleteBusy, setLegacyDeleteBusy] = useState(false);
  const [legacyBusy, setLegacyBusy] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const visibleImports = useMemo(() => imports, [imports]);

  const notify = (next: Toast) => {
    setToast(next);
    window.setTimeout(() => setToast(null), 3600);
  };

  const undoImport = async (item: ImportBatch) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/imports/${item.id}/undo`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Undo failed");
      setImports((current) => current.filter((entry) => entry.id !== item.id));
      setConfirming(null);
      notify({
        type: "success",
        message: `Removed ${data.sessions_deleted} workout${data.sessions_deleted === 1 ? "" : "s"} from this import.`,
      });
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Undo failed" });
    } finally {
      setBusyId(null);
    }
  };

  const deleteAllImports = async () => {
    setDeleteAllBusy(true);
    try {
      const res = await fetch("/api/imports/delete-all", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Delete all imported history failed");
      setImports([]);
      setConfirmingAll(false);
      notify({
        type: "success",
        message: `Deleted ${data.sessions_deleted} imported workout${data.sessions_deleted === 1 ? "" : "s"} across ${data.batches_deleted} batch${data.batches_deleted === 1 ? "" : "es"}.`,
      });
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Delete all failed" });
    } finally {
      setDeleteAllBusy(false);
    }
  };

  const saveRename = async (item: ImportBatch) => {
    const source_file_name = renameValue.trim();
    if (!source_file_name) return;
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/imports/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_file_name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Rename failed");
      setImports((current) => current.map((entry) => (entry.id === item.id ? data.import : entry)));
      setRenamingId(null);
      notify({ type: "success", message: "Import renamed." });
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Rename failed" });
    } finally {
      setBusyId(null);
    }
  };

  const assignLegacy = async () => {
    setLegacyBusy(true);
    try {
      const res = await fetch("/api/imports/legacy", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Legacy assignment failed");
      setLegacy((current) => ({ ...current, found: 0, candidates: [] }));
      notify({
        type: "success",
        message:
          data.workout_count > 0
            ? `Assigned ${data.workout_count} legacy imported workout${data.workout_count === 1 ? "" : "s"}. Refreshing list.`
            : "No legacy imported workouts needed assignment.",
      });
      window.location.reload();
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Legacy assignment failed" });
    } finally {
      setLegacyBusy(false);
    }
  };

  const deleteLegacy = async () => {
    setLegacyDeleteBusy(true);
    try {
      const res = await fetch("/api/imports/legacy/delete", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Legacy delete failed");
      setLegacy({ found: 0, skipped: data.skipped ?? legacy.skipped, candidates: [] });
      setConfirmingLegacyDelete(false);
      notify({
        type: "success",
        message: `Deleted ${data.sessions_deleted} legacy imported workout${data.sessions_deleted === 1 ? "" : "s"}.`,
      });
    } catch (error) {
      notify({ type: "error", message: error instanceof Error ? error.message : "Legacy delete failed" });
    } finally {
      setLegacyDeleteBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      {toast && (
        <div
          className={`fixed right-4 top-4 z-50 flex max-w-sm items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-800"
              : "border-red-200 bg-red-50 text-red-800"
          }`}
        >
          {toast.type === "success" ? <CheckCircle className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
          {toast.message}
        </div>
      )}

      {legacy.found > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-amber-950">Legacy imported workouts found</p>
            <p className="text-sm text-amber-800">
              {legacy.found} imported workout{legacy.found === 1 ? "" : "s"} can be assigned to a generated Legacy Import. {legacy.skipped} untagged workout{legacy.skipped === 1 ? "" : "s"} skipped.
            </p>
            {legacy.candidates.length > 0 && (
              <details className="mt-2 text-xs text-amber-900">
                <summary className="cursor-pointer font-medium">Preview candidate rows</summary>
                <ul className="mt-1 max-h-28 space-y-1 overflow-auto">
                  {legacy.candidates.map((candidate) => (
                    <li key={candidate.id}>
                      {candidate.date} · {candidate.source ?? "unknown"} · {candidate.reason}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </div>
          <div className="flex flex-wrap gap-2 sm:justify-end">
            <Button onClick={assignLegacy} disabled={legacyBusy || legacyDeleteBusy} size="sm" variant="outline" className="shrink-0">
              {legacyBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Assign Legacy Import
            </Button>
            <Button onClick={() => setConfirmingLegacyDelete(true)} disabled={legacyBusy || legacyDeleteBusy} size="sm" variant="destructive" className="shrink-0">
              {legacyDeleteBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              Delete Legacy Imported History
            </Button>
          </div>
        </div>
      )}

      {imports.length > 0 && (
        <div className="flex flex-col gap-3 rounded-lg border border-red-200 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-red-950">Delete all imported history</p>
            <p className="text-sm text-red-800">Removes tracked imported workouts only. Manual workouts and routines are left alone.</p>
          </div>
          <Button onClick={() => setConfirmingAll(true)} disabled={deleteAllBusy} size="sm" variant="destructive" className="shrink-0">
            {deleteAllBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete ALL Imported History
          </Button>
        </div>
      )}

      <ImportList
        title="Import Batches"
        empty="No tracked imports yet."
        imports={visibleImports}
        busyId={busyId}
        renamingId={renamingId}
        renameValue={renameValue}
        onRenameStart={(item) => {
          setRenamingId(item.id);
          setRenameValue(item.source_file_name);
        }}
        onRenameValue={setRenameValue}
        onRenameCancel={() => setRenamingId(null)}
        onRenameSave={saveRename}
        onUndo={setConfirming}
      />

      {confirming && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-50 p-2 text-red-600">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Undo import?</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  This will permanently delete all workouts and logs from this import.
                </p>
                <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">{confirming.source_file_name}</p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirming(null)} disabled={busyId === confirming.id}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={() => undoImport(confirming)} disabled={busyId === confirming.id}>
                {busyId === confirming.id && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete Import
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmingAll && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-50 p-2 text-red-600">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Delete all imported history?</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  This will permanently delete all workouts and logs from every tracked import.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmingAll(false)} disabled={deleteAllBusy}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteAllImports} disabled={deleteAllBusy}>
                {deleteAllBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete ALL Imported History
              </Button>
            </div>
          </div>
        </div>
      )}

      {confirmingLegacyDelete && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-5 shadow-xl dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-red-50 p-2 text-red-600">
                <ShieldAlert className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-zinc-950 dark:text-zinc-50">Delete legacy imported history?</h2>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  This will tag clearly imported legacy rows as a Legacy Import, then permanently delete those workouts and logs.
                </p>
                <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                  Found {legacy.found}; skipped {legacy.skipped}.
                </p>
              </div>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmingLegacyDelete(false)} disabled={legacyDeleteBusy}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={deleteLegacy} disabled={legacyDeleteBusy}>
                {legacyDeleteBusy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Delete Legacy Imported History
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ImportList({
  title,
  empty,
  imports,
  busyId,
  renamingId,
  renameValue,
  onRenameStart,
  onRenameValue,
  onRenameCancel,
  onRenameSave,
  onUndo,
}: {
  title: string;
  empty: string;
  imports: ImportBatch[];
  busyId: string | null;
  renamingId: string | null;
  renameValue: string;
  onRenameStart: (item: ImportBatch) => void;
  onRenameValue: (value: string) => void;
  onRenameCancel: () => void;
  onRenameSave: (item: ImportBatch) => void;
  onUndo: (item: ImportBatch) => void;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">{title}</h2>
      {imports.length === 0 && empty ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-sm text-zinc-500 dark:border-zinc-800 dark:bg-zinc-900">
          {empty}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
          {imports.map((item) => (
            <div key={item.id} className="grid gap-4 border-b border-zinc-100 p-4 last:border-0 dark:border-zinc-800 lg:grid-cols-[1fr_auto]">
              <div className="min-w-0">
                {renamingId === item.id ? (
                  <div className="flex max-w-lg gap-2">
                    <input
                      value={renameValue}
                      onChange={(event) => onRenameValue(event.target.value)}
                      className="h-9 flex-1 rounded-md border border-zinc-300 bg-white px-3 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                    />
                    <Button size="sm" onClick={() => onRenameSave(item)} disabled={busyId === item.id}>
                      Save
                    </Button>
                    <Button size="sm" variant="outline" onClick={onRenameCancel}>
                      Cancel
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-zinc-950 dark:text-zinc-50">{item.source_file_name}</p>
                  </div>
                )}
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                  <span>{new Date(item.created_at).toLocaleString()}</span>
                  <span>{item.workout_count} imported workout{item.workout_count === 1 ? "" : "s"}</span>
                  <span>{item.set_count ?? 0} sets tracked</span>
                </div>
                {item.notes && <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">{item.notes}</p>}
              </div>

              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Button size="sm" variant="outline" onClick={() => onRenameStart(item)} disabled={busyId === item.id}>
                  <Pencil className="h-3.5 w-3.5" />
                  Rename
                </Button>
                <Button size="sm" variant="destructive" onClick={() => onUndo(item)} disabled={busyId === item.id}>
                  {busyId === item.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
                  Delete Import
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
