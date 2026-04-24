"use client";
import type { EquipmentFrequency } from "@/lib/analytics";

interface Props {
  data: EquipmentFrequency[];
  totalSessions: number;
}

export function EquipmentUsageChart({ data, totalSessions }: Props) {
  return (
    <div className="space-y-2.5">
      {data.map((item) => (
        <div key={item.equipment_id ?? item.equipment_name} className="flex items-center gap-3">
          <span className="text-xs text-zinc-600 w-44 truncate shrink-0">{item.equipment_name}</span>
          <div className="flex-1 bg-zinc-100 rounded-full h-2 overflow-hidden">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: `${item.pct_of_sessions}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400 w-20 text-right shrink-0">
            {item.sessions}× · {item.pct_of_sessions}%
          </span>
        </div>
      ))}
    </div>
  );
}
