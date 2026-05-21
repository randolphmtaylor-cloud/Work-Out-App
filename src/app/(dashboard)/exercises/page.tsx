import { ExerciseLibraryManager } from "@/components/settings/exercise-library-manager";
import { getEquipment, getExercises } from "@/lib/data";

export default async function ExercisesPage() {
  const [exercises, equipment] = await Promise.all([getExercises(), getEquipment()]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">Exercise Library</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          Add, edit, archive, and categorize exercises used by new routines.
        </p>
      </div>
      <ExerciseLibraryManager initialExercises={exercises} equipment={equipment} />
    </div>
  );
}
