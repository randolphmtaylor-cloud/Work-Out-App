"use client";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import type { ExerciseTrend } from "@/lib/analytics";

export function TrendChart({ trend }: { trend: ExerciseTrend }) {
  const hasWeight = trend.points.some((p) => p.top_weight > 0);
  const dataKey = hasWeight ? "top_weight" : "top_reps";
  const color = trend.trend === "progressing" ? "#22c55e" : trend.trend === "stalled" ? "#f59e0b" : "#ef4444";

  return (
    <ResponsiveContainer width="100%" height={130}>
      <LineChart data={trend.points} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 10, fill: "#a1a1aa" }}
          tickFormatter={(v: string) => v.slice(5)} // MM-DD
          axisLine={false}
          tickLine={false}
        />
        <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 8, fontSize: 11 }}
          formatter={(val) => [hasWeight ? `${val} lbs` : `${val} reps`, hasWeight ? "Weight" : "Reps"]}
          labelFormatter={(l) => `${l}`}
        />
        <Line
          type="monotone"
          dataKey={dataKey}
          stroke={color}
          strokeWidth={2}
          dot={{ r: 3, fill: color }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
