"use client";
import { useState, useRef } from "react";
import { Upload, CheckCircle, AlertCircle, Loader2, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

export function ImportFileForm() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ sessions_parsed: number; sets_parsed: number; warnings: string[] } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (!["docx", "xlsx", "csv", "txt"].includes(ext ?? "")) {
      setError("Unsupported file type. Use .docx, .xlsx, .csv, or .txt");
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);
    setResult(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import", { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) setError(data.error ?? "Import failed");
      else { setResult(data); setFile(null); }
    } catch {
      setError("Upload failed — please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors",
          dragging ? "border-indigo-400 bg-indigo-50" : "border-zinc-200 hover:border-zinc-300"
        )}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
        onClick={() => inputRef.current?.click()}
      >
        {file ? (
          <div className="flex items-center justify-center gap-2 text-sm text-zinc-700">
            <File className="w-4 h-4 text-indigo-600" />
            <span className="font-medium">{file.name}</span>
            <span className="text-zinc-400">({(file.size / 1024).toFixed(1)} KB)</span>
          </div>
        ) : (
          <>
            <Upload className="w-6 h-6 text-zinc-400 mx-auto mb-2" />
            <p className="text-sm text-zinc-600 font-medium">Drop file here or click to browse</p>
            <p className="text-xs text-zinc-400 mt-0.5">.docx · .xlsx · .csv · .txt</p>
          </>
        )}
      </div>

      <input ref={inputRef} type="file" accept=".docx,.xlsx,.csv,.txt" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {result && (
        <div className="flex items-start gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
          <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium">Imported {result.sessions_parsed} session{result.sessions_parsed !== 1 ? "s" : ""} · {result.sets_parsed} sets</p>
            {result.warnings.map((w, i) => <p key={i} className="text-xs text-green-600 mt-0.5">⚠ {w}</p>)}
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Button onClick={handleSubmit} disabled={!file || loading} className="w-full gap-1.5">
        {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        {loading ? "Uploading..." : "Upload & Parse"}
      </Button>
    </div>
  );
}
