import { FileText, Upload, Table } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ImportTextForm } from "@/components/workout/import-text-form";
import { ImportFileForm } from "@/components/workout/import-file-form";
import { ImportHistoryButton } from "@/components/workout/import-history-button";
import { Button } from "@/components/ui/button";
import { getAuthStatus } from "@/lib/auth/user";

export default async function ImportPage() {
  const auth = await getAuthStatus();

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Import Workouts</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-0.5">
          Ingest your existing workout logs to build your training history.
        </p>
        <Link href="/admin/exercises" className="text-xs text-indigo-600 hover:underline mt-2 inline-block">
          Review unreviewed exercises →
        </Link>
        <Link href="/settings/import-history" className="ml-3 text-xs text-indigo-600 hover:underline mt-2 inline-block">
          Import history →
        </Link>
      </div>

      {!auth.isAuthenticated && !auth.isLocalMode && (
        <Card className="border-indigo-200 bg-indigo-50/60 dark:border-indigo-900/60 dark:bg-indigo-950/30">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-indigo-950 dark:text-indigo-100">Sign in to sync/import logs</p>
              <p className="text-sm text-indigo-700 dark:text-indigo-300">
                Imported workouts are saved to Supabase under your authenticated user_id.
              </p>
            </div>
            <Button asChild variant="accent" size="sm" className="shrink-0">
              <Link href="/login?next=/import">Sign In</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {auth.isLocalMode && (
        <Card className="border-amber-200 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/30">
          <CardContent className="py-4">
            <p className="text-sm font-medium text-amber-950 dark:text-amber-100">Local-only mode</p>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Supabase env vars are not configured, so imports stay in the local demo store for this running app.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Sample format guide */}
      <Card className="border-indigo-100 dark:border-indigo-900/50 bg-indigo-50/30 dark:bg-indigo-950/30">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-2">Accepted text formats:</p>
          <pre className="text-xs text-indigo-700 dark:text-indigo-400 font-mono leading-relaxed">
{`April 5 — Pull Day
Pull-ups: 3x8, 3x7, 3x6
Hammer Row: 180x3x6
DB Curl: 35lbs 3 sets 10 reps

April 7
Cybex Incline: 165x3x9
Dips: 3x8
Tricep Pushdown: 60x3x12`}
          </pre>
        </CardContent>
      </Card>

      {/* Paste text */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <CardTitle className="text-base">Paste Workout Text</CardTitle>
          </div>
          <CardDescription>Paste your raw workout notes or log entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImportTextForm />
        </CardContent>
      </Card>

      {/* Bundled workout history */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <CardTitle className="text-base">Workout History</CardTitle>
          </div>
          <CardDescription>Import the bundled reformatted workout history document.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImportHistoryButton />
        </CardContent>
      </Card>

      {/* File upload */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-zinc-600 dark:text-zinc-400" />
            <CardTitle className="text-base">Upload File</CardTitle>
          </div>
          <CardDescription>Upload a .docx, .xlsx, or .csv workout log.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImportFileForm />
        </CardContent>
      </Card>

      {/* Format hints */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <FormatHint
          icon={<FileText className="w-4 h-4" />}
          title=".txt / paste"
          desc="Any structured text. Dates, exercise names, set×rep patterns."
        />
        <FormatHint
          icon={<Table className="w-4 h-4" />}
          title=".docx"
          desc="Word documents with workout notes. Text is extracted and parsed."
        />
        <FormatHint
          icon={<Table className="w-4 h-4" />}
          title=".xlsx / .csv"
          desc="Spreadsheet logs. Columns are detected automatically."
        />
      </div>
    </div>
  );
}

function FormatHint({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
      <div className="flex items-center gap-2 mb-1.5 text-zinc-600 dark:text-zinc-400">{icon}<span className="font-medium text-sm">{title}</span></div>
      <p className="text-xs text-zinc-500 dark:text-zinc-400">{desc}</p>
    </div>
  );
}
