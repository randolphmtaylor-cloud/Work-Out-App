"use client";
import type { TopSet } from "@/lib/analytics";

export function TopSetsTable({ topSets }: { topSets: TopSet[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-xs text-zinc-400 border-b border-zinc-100">
            <th className="text-left py-2 pr-4 font-medium">Exercise</th>
            <th className="text-right py-2 pr-4 font-medium">Best Set</th>
            <th className="text-right py-2 pr-4 font-medium">Est. 1RM</th>
            <th className="text-right py-2 font-medium hidden sm:table-cell">Date</th>
          </tr>
        </thead>
        <tbody>
          {topSets.slice(0, 8).map((ts, i) => (
            <tr key={ts.exercise_id} className="border-b border-zinc-50 last:border-0">
              <td className="py-2.5 pr-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-300 w-4 text-right shrink-0">{i + 1}</span>
                  <span className="font-medium text-zinc-800">{ts.exercise_name}</span>
                </div>
              </td>
              <td className="text-right py-2.5 pr-4 text-zinc-600">
                {ts.weight_lbs > 0
                  ? `${ts.weight_lbs} lbs × ${ts.reps}`
                  : `${ts.reps} reps BW`}
              </td>
              <td className="text-right py-2.5 pr-4 font-semibold text-indigo-600">
                {ts.weight_lbs > 0 ? `~${ts.estimated_1rm} lbs` : `${ts.estimated_1rm} reps`}
              </td>
              <td className="text-right py-2.5 text-zinc-400 text-xs hidden sm:table-cell">
                {ts.date}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
