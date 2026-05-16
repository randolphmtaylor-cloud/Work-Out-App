import { ExerciseReview } from "@/components/admin/exercise-review";

export default function ExerciseAdminPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Exercise Normalization Admin</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Review unreviewed exercise names and map them to canonical exercises.
        </p>
      </div>
      <ExerciseReview />
    </div>
  );
}

