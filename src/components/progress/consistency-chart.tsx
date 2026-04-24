"use client";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell,
} from "recharts";

interface Week { week: string; label: string; sessions: number; target: number }

export function ConsistencyChart({ data }: { data: Week[] }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} domain={[0, 4]} ticks={[0,1,2,3,4]} />
        <Tooltip
          contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 8, fontSize: 11 }}
          formatter={(v) => [`${(v as number)} session${(v as number) !== 1 ? "s" : ""}`, "Completed"]}
          labelFormatter={(l) => `Week of ${l}`}
        />
        <ReferenceLine
          y={3}
          stroke="#6366f1"
          strokeDasharray="4 4"
          strokeWidth={1.5}
          label={{ value: "Goal", position: "insideTopRight", fontSize: 10, fill: "#6366f1" }}
        />
        <Bar dataKey="sessions" radius={[4, 4, 0, 0]} maxBarSize={32}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.sessions >= entry.target ? "#6366f1" : entry.sessions > 0 ? "#a5b4fc" : "#e4e4e7"}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
