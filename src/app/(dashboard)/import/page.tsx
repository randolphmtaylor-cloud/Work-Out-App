import { FileText, Upload, Table } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ImportTextForm } from "@/components/workout/import-text-form";
import { ImportFileForm } from "@/components/workout/import-file-form";

export default function ImportPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Import Workouts</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Ingest your existing workout logs to build your training history.
        </p>
      </div>

      {/* Sample format guide */}
      <Card className="border-indigo-100 bg-indigo-50/30">
        <CardContent className="pt-4 pb-4">
          <p className="text-sm font-medium text-indigo-800 mb-2">Accepted text formats:</p>
          <pre className="text-xs text-indigo-700 font-mono leading-relaxed">
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
            <FileText className="w-4 h-4 text-zinc-600" />
            <CardTitle className="text-base">Paste Workout Text</CardTitle>
          </div>
          <CardDescription>Paste your raw workout notes or log entries.</CardDescription>
        </CardHeader>
        <CardContent>
          <ImportTextForm />
        </CardContent>
      </Card>

      {/* File upload */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="w-4 h-4 text-zinc-600" />
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
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <div className="flex items-center gap-2 mb-1.5 text-zinc-600">{icon}<span className="font-medium text-sm">{title}</span></div>
      <p className="text-xs text-zinc-500">{desc}</p>
    </div>
  );
}
