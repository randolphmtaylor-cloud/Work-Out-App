import Link from "next/link";
import { ArrowLeft, CalendarDays, Dumbbell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAllSets, getExercises, getSessions } from "@/lib/data";
import { getAuthStatus } from "@/lib/auth/user";
import { formatShort } from "@/lib/utils/dates";
import { formatLoggedWeight, getPersonalBestForExercise } from "@/lib/weights";

type Params = {
  params: Promise<{ id: string }>;
};

export default async function ExerciseDetailPage({ params }: Params) {
  const { id } = await params;
  const auth = await getAuthStatus();
  const exercises = await getExercises();
  const exercise = exercises.find((item) => item.id === id);

  if (!exercise) {
    return (
      <div className="mx-auto max-w-3xl space-y-4 p-6">
        <Button asChild variant="ghost" size="sm">
          <Link href="/exercises">
            <ArrowLeft className="h-3.5 w-3.5" />
            Exercises
          </Link>
        </Button>
        <Card>
          <CardContent className="py-8 text-sm text-zinc-500">Exercise not found.</CardContent>
        </Card>
      </div>
    );
  }

  const [sessions, sets] = auth.userId
    ? await Promise.all([getSessions(auth.userId), getAllSets(auth.userId)])
    : [[], []];
  const exerciseSets = sets
    .filter((set) => set.exercise_id === exercise.id && !set.is_warmup)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  const best = getPersonalBestForExercise(exercise.id, sets, sessions);

  return (
    <div className="mx-auto max-w-3xl space-y-5 p-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/exercises">
          <ArrowLeft className="h-3.5 w-3.5" />
          Exercises
        </Link>
      </Button>

      <div>
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{exercise.name}</h1>
        <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">
          {exercise.equipment?.name ?? "No equipment"} · {exercise.library_category ?? "Strength"}
        </p>
      </div>

      <Card className="border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-zinc-500 dark:text-zinc-400">Personal Best</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {best ? (
            <>
              <p className="text-lg font-semibold text-zinc-950 dark:text-zinc-50">
                {formatLoggedWeight(best)}
                {best.reps ? <span className="text-zinc-500 dark:text-zinc-400"> × {best.reps}</span> : null}
              </p>
              {best.date && (
                <p className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                  <CalendarDays className="h-3.5 w-3.5" />
                  Achieved {formatShort(best.date)}
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No personal best yet</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Recent Sets</CardTitle>
        </CardHeader>
        <CardContent>
          {exerciseSets.length > 0 ? (
            <div className="space-y-2">
              {exerciseSets.slice(0, 10).map((set) => {
                const session = sessions.find((item) => item.id === set.session_id);
                return (
                  <div key={set.id} className="flex items-center justify-between gap-3 border-b border-zinc-100 py-2 last:border-0 dark:border-zinc-800">
                    <div className="flex items-center gap-2">
                      <Dumbbell className="h-3.5 w-3.5 text-zinc-400 dark:text-zinc-500" />
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {formatLoggedWeight(set)}{set.reps ? ` × ${set.reps}` : ""}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-500 dark:text-zinc-400">
                      {session?.date ? formatShort(session.date) : "No date"}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">No logged sets for this exercise yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
