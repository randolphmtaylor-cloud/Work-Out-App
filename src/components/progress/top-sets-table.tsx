"use client";
import type { TopSet } from "@/lib/analytics";

export function TopSetsTable({ topSets }: { topSets: TopSet[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-zinc-400 dark:text-zinc-500 border-b border-zinc-100 dark:border-zinc-800">
            <th className="text-left py-2 pr-4 font-medium">Exercise</th>
            <th className="text-right py-2 pr-4 font-medium">Best Set</th>
            <th className="text-right py-2 pr-4 font-medium">Est. 1RM</th>
            <th className="text-right py-2 font-medium hidden sm:table-cell">Date</th>
          </tr>
        </thead>
        <tbody>
          {topSets.slice(0, 8).map((ts, i) => (
            <tr key={ts.exercise_id} className="border-b border-zinc-50 dark:border-zinc-800 last:border-0">
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-300 dark:text-zinc-600 w-4 text-right shrink-0">{i + 1}</span>
                  <span className="font-medium text-zinc-800 dark:text-zinc-200">{ts.exercise_name}</span>
                </div>
              </td>
              <td className="text-right py-2.5 pr-4 text-zinc-600 dark:text-zinc-400">
                {ts.weight_lbs > 0
                  ? `${ts.weight_lbs} lbs × ${ts.reps}`
                  : `${ts.reps} reps BW`}
              </td>
              <td className="text-right py-2.5 pr-4 font-semibold text-indigo-600 dark:text-indigo-400">
                {ts.weight_lbs > 0 ? `~${ts.estimated_1rm} lbs` : `${ts.estimated_1rm} reps`}
              </td>
              <td className="text-right py-2.5 text-zinc-400 dark:text-zinc-500 text-xs hidden sm:table-cell">
                {ts.date}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
