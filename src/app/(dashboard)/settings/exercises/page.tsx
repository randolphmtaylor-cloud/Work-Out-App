import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ExerciseLibraryManager } from "@/components/settings/exercise-library-manager";
import { Button } from "@/components/ui/button";
import { getExercises } from "@/lib/data";

export default async function ExerciseSettingsPage() {
  const exercises = await getExercises();

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-2">
          <Link href="/settings">
            <ArrowLeft className="h-3.5 w-3.5" />
            Settings
          </Link>
        </Button>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Manage Exercises</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Add, edit, archive, categorize, and reorder exercises used by new routines and Today&apos;s Workout.
        </p>
      </div>
      <ExerciseLibraryManager initialExercises={exercises} />
    </div>
  );
}
