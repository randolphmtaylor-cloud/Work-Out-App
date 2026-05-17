import Link from "next/link";
import { BookOpen, DatabaseZap } from "lucide-react";
import { ResetHistoryCard } from "@/components/settings/reset-history-card";
import { Button } from "@/components/ui/button";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Settings</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Manage library data, imports, and safe maintenance actions.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
          <Link href="/settings/exercises">
            <BookOpen className="h-4 w-4" />
            <span className="text-left">
              <span className="block text-sm font-semibold">Manage Exercises</span>
              <span className="block text-xs font-normal text-zinc-500">Add, edit, archive, and organize phases.</span>
            </span>
          </Link>
        </Button>
        <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
          <Link href="/settings/import-history">
            <DatabaseZap className="h-4 w-4" />
            <span className="text-left">
              <span className="block text-sm font-semibold">Import History</span>
              <span className="block text-xs font-normal text-zinc-500">Undo a batch or delete all imports.</span>
            </span>
          </Link>
        </Button>
      </div>

      <ResetHistoryCard />
    </div>
  );
}
