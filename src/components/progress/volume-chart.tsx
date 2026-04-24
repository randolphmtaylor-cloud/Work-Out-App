"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { WorkoutSession, WorkoutSet } from "@/types";

interface Props {
  sessions: WorkoutSession[];
  sets: WorkoutSet[];
}

function isoWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const monday = new Date(d);
  monday.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return monday.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function VolumeChart({ sessions, sets }: Props) {
  // Group volume by week
  const weekMap = new Map<string, number>();
  for (const session of sessions) {
    const label = isoWeekLabel(session.date);
    const sessionSets = sets.filter((s) => s.session_id === session.id && !s.is_warmup);
    const vol = sessionSets.reduce((sum, s) => sum + (s.weight_lbs ?? 0) * (s.reps ?? 0), 0);
    weekMap.set(label, (weekMap.get(label) ?? 0) + vol);
  }

  const data = [...weekMap.entries()]
    .slice(-10)
    .map(([week, volume]) => ({ week, volume: Math.round(volume) }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis dataKey="week" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: "#a1a1aa" }}
          axisLine={false}
          tickLine={false}
          tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
        />
        <Tooltip
          contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 8, fontSize: 11 }}
          formatter={(v) => [`${(v as number).toLocaleString()} lbs`, "Volume"]}
        />
        <Bar dataKey="volume" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
