import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ImportsManager } from "@/components/workout/imports-manager";
import { getAuthStatus } from "@/lib/auth/user";
import { getImportBatches, getLegacyImportPreview } from "@/lib/data";

export default async function ImportsSettingsPage() {
  const auth = await getAuthStatus();
  const imports = auth.userId ? await getImportBatches(auth.userId) : [];
  const legacyPreview = auth.userId ? await getLegacyImportPreview(auth.userId) : { found: 0, skipped: 0, candidates: [] };

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
            <Link href="/import">
              <ArrowLeft className="h-3.5 w-3.5" />
              Import Workouts
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Settings / Import History</h1>
          <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
            Review imported workout batches, rename them, or safely delete imported history.
          </p>
        </div>
      </div>

      {!auth.isAuthenticated && !auth.isLocalMode ? (
        <div className="rounded-lg border border-indigo-200 bg-indigo-50 p-4 text-sm text-indigo-900">
          Sign in to manage imported workout batches.
        </div>
      ) : (
        <ImportsManager initialImports={imports} legacyPreview={legacyPreview} />
      )}
    </div>
  );
}
