"use client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { ExerciseProgress } from "@/types";

interface Props {
  data: ExerciseProgress;
}

export function ExerciseProgressChart({ data }: Props) {
  const chartData = data.dates.map((date, i) => ({
    date,
    weight: data.best_weights[i] ?? 0,
    reps: data.avg_reps[i] ?? 0,
  }));

  const hasWeight = data.best_weights.some((w) => w > 0);

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={chartData} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" />
        <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 10, fill: "#a1a1aa" }} axisLine={false} tickLine={false} />
        <Tooltip
          contentStyle={{ border: "1px solid #e4e4e7", borderRadius: 8, fontSize: 11 }}
          formatter={(val, name) => [
            name === "weight" ? `${val} lbs` : `${val} reps avg`,
            name === "weight" ? "Weight" : "Avg Reps",
          ]}
        />
        {hasWeight ? (
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#6366f1"
            strokeWidth={2}
            dot={{ r: 3, fill: "#6366f1" }}
            activeDot={{ r: 5 }}
          />
        ) : (
          <Line
            type="monotone"
            dataKey="reps"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ r: 3, fill: "#22c55e" }}
            activeDot={{ r: 5 }}
          />
        )}
      </LineChart>
    </ResponsiveContainer>
  );
}
