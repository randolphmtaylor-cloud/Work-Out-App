// ============================================================
// AI Client — Anthropic Claude (streaming + non-streaming)
//
// Uses computed analytics for grounding — never hallucinates
// metrics not present in the data.
//
// SYSTEMS PROGRESS APP integration point:
//   expose generateWeeklySummary + streamCoachAnswer via
//   POST /api/v1/ai/summary and POST /api/v1/ai/chat
// ============================================================
import Anthropic from "@anthropic-ai/sdk";
import {
  WorkoutSession,
  WorkoutSet,
  TrainingPhase,
  WeeklySummaryStats,
} from "@/types";
import { computeAnalytics, buildAnalyticsBrief, buildSessionsText } from "@/lib/analytics";

const getClient = () => new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const isAIConfigured = () =>
  Boolean(process.env.ANTHROPIC_API_KEY?.startsWith("sk-ant"));

// ---------------------------------------------------------------
// System prompt — shared by summary + chat
// ---------------------------------------------------------------
function buildSystemPrompt(
  sessions: WorkoutSession[],
  sets: WorkoutSet[],
  phase: TrainingPhase | null
): string {
  const analytics = computeAnalytics(sessions, sets);
  const brief = buildAnalyticsBrief(analytics, phase);
  const recentText = buildSessionsText(sessions, sets, 12);

  return `You are a concise, practical AI strength coach.

You have access to the user's real training data below. Only reference metrics that appear in this data — do not invent numbers, weights, or trends.

=== ANALYTICS SUMMARY ===
${brief}

=== RECENT SESSIONS (most recent first) ===
${recentText}

=== COACHING RULES ===
- Be direct and specific. Reference actual lifts and dates.
- If you don't have enough data to answer, say so honestly.
- Keep responses under 200 words unless a detailed breakdown is requested.
- Use **bold** for key numbers and recommendations.
- Never say "Great job!" or similar generic praise — be a real coach.`;
}

// ---------------------------------------------------------------
// Weekly Summary (non-streaming)
// ---------------------------------------------------------------
export async function generateWeeklySummary(
  sessions: WorkoutSession[],
  sets: WorkoutSet[],
  phase: TrainingPhase | null,
  stats: WeeklySummaryStats
): Promise<string> {
  if (!isAIConfigured()) return buildFallbackSummary(stats, sessions, sets, phase);

  const client = getClient();
  const systemPrompt = buildSystemPrompt(sessions, sets, phase);

  const userPrompt = `Write a weekly training summary for the week of ${stats.days_trained[0] ?? "this week"}.

Stats:
- Sessions completed: ${stats.sessions_completed}
- Total sets: ${stats.total_sets}
- Total volume: ${stats.total_volume_lbs.toLocaleString()} lbs
- Days trained: ${stats.days_trained.join(", ")}
- Exercises: ${stats.exercises_performed.join(", ")}

Cover in 3–4 short paragraphs:
1. Consistency verdict (did they show up?)
2. Standout lift or performance vs. recent trend
3. Any stalled lifts or recovery concerns
4. One concrete action for next week

Tone: direct coach, no fluff. Bold key points.`;

  try {
    const msg = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });
    return msg.content[0].type === "text"
      ? msg.content[0].text
      : buildFallbackSummary(stats, sessions, sets, phase);
  } catch {
    return buildFallbackSummary(stats, sessions, sets, phase);
  }
}

// ---------------------------------------------------------------
// Coach Q&A — streaming (returns ReadableStream)
// ---------------------------------------------------------------
export async function streamCoachAnswer(
  question: string,
  sessions: WorkoutSession[],
  sets: WorkoutSet[],
  phase: TrainingPhase | null,
  history: Array<{ role: "user" | "assistant"; content: string }>
): Promise<ReadableStream<Uint8Array>> {
  if (!isAIConfigured()) {
    const answer = buildFallbackAnswer(question, sessions, sets, phase);
    return new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode(answer));
        controller.close();
      },
    });
  }

  const client = getClient();
  const systemPrompt = buildSystemPrompt(sessions, sets, phase);

  const messages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: question },
  ];

  const stream = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    system: systemPrompt,
    messages,
    stream: true,
  });

  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (
            chunk.type === "content_block_delta" &&
            chunk.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(chunk.delta.text));
          }
        }
      } finally {
        controller.close();
      }
    },
  });
}

// ---------------------------------------------------------------
// Fallbacks — data-driven, not generic
// ---------------------------------------------------------------
function buildFallbackSummary(
  stats: WeeklySummaryStats,
  sessions: WorkoutSession[],
  sets: WorkoutSet[],
  phase: TrainingPhase | null
): string {
  const analytics = computeAnalytics(sessions, sets);
  const plural = (n: number, w: string) => `${n} ${w}${n !== 1 ? "s" : ""}`;

  const phaseLine = phase
    ? `Currently in the **${phase.name}** phase (${phase.rep_range_low}–${phase.rep_range_high} rep range).`
    : "";

  const topLift = analytics.topSets[0];
  const topLine = topLift
    ? `**Top lift on record:** ${topLift.exercise_name} — ${topLift.weight_lbs > 0 ? `${topLift.weight_lbs}lbs × ${topLift.reps}` : `${topLift.reps}r BW`} (est. ${topLift.estimated_1rm}lb 1RM).`
    : "";

  const stalledLine =
    analytics.plateaus.length > 0
      ? `**Stalled:** ${analytics.plateaus[0].exercise_name} hasn't moved in ${analytics.plateaus[0].weeks_stalled} weeks. ${analytics.plateaus[0].recommendation}`
      : "";

  const consistencyLine = `**Consistency:** ${analytics.consistency.overall_pct}% of weeks active, ${analytics.consistency.current_streak}-week current streak.`;

  return [
    `**Week summary — ${plural(stats.sessions_completed, "session")}, ${plural(stats.total_sets, "set")}, ${Math.round(stats.total_volume_lbs / 1000)}k lbs volume.**`,
    "",
    phaseLine,
    topLine,
    stalledLine,
    consistencyLine,
    "",
    `*Add \`ANTHROPIC_API_KEY\` to .env.local for AI-generated coaching insights.*`,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildFallbackAnswer(
  question: string,
  sessions: WorkoutSession[],
  sets: WorkoutSet[],
  phase: TrainingPhase | null
): string {
  const q = question.toLowerCase();
  const analytics = computeAnalytics(sessions, sets);

  if (q.match(/how am i doing|overall|progress/)) {
    const top = analytics.topSets.slice(0, 3).map((t) =>
      `${t.exercise_name}: ~${t.estimated_1rm}lb 1RM`
    ).join(", ");
    return `**${analytics.totalSessions} sessions logged.** Consistency: ${analytics.consistency.overall_pct}% of weeks. Current streak: ${analytics.consistency.current_streak} weeks.\n\nStrong lifts: ${top || "not enough data yet"}.\n\n*Connect Anthropic API for deeper coaching insights.*`;
  }

  if (q.match(/incline|bench|chest/)) {
    const trend = analytics.trends.find((t) => t.exercise_name.toLowerCase().includes("incline") || t.exercise_name.toLowerCase().includes("bench"));
    if (trend && trend.points.length > 1) {
      const first = trend.points[0];
      const last = trend.points[trend.points.length - 1];
      return `**${trend.exercise_name}:** ${first.top_weight}lbs → ${last.top_weight}lbs over ${trend.points.length} sessions (+${trend.weight_delta}lbs). Trend: **${trend.trend}**.${trend.trend === "stalled" ? ` Last PR: ${trend.weeks_since_pr} weeks ago.` : ""}`;
    }
    return "Not enough incline press data yet to show a trend.";
  }

  if (q.match(/plateau|stall|stuck/)) {
    if (analytics.plateaus.length === 0) return "No plateaus detected — all tracked lifts are trending upward or have too little data.";
    return analytics.plateaus
      .slice(0, 3)
      .map((p) => `**${p.exercise_name}:** ${p.weeks_stalled} weeks stalled. ${p.recommendation}`)
      .join("\n\n");
  }

  if (q.match(/machine|equipment|use most/)) {
    return analytics.equipmentFrequency
      .slice(0, 5)
      .map((e, i) => `${i + 1}. **${e.equipment_name}** — ${e.sessions} sessions (${e.pct_of_sessions}%)`)
      .join("\n");
  }

  if (q.match(/today|what should i do/)) {
    return phase
      ? `Today is a **${phase.name}** phase day (${phase.rep_range_low}–${phase.rep_range_high} reps). Head to **Today's Workout** for your generated routine.`
      : "Head to **Today's Workout** for your generated routine.";
  }

  if (q.match(/strongest|best lift|pr/)) {
    const top = analytics.topSets[0];
    if (!top) return "Not enough data to determine your strongest lift yet.";
    return `**Strongest lift (by estimated 1RM):** ${top.exercise_name} — ${top.weight_lbs > 0 ? `${top.weight_lbs}lbs × ${top.reps}r` : `${top.reps}r BW`} → ~**${top.estimated_1rm}lb** estimated 1RM (${top.date}).`;
  }

  return `I have your training data but need an Anthropic API key to give a precise answer to: *"${question}"*.\n\nAdd \`ANTHROPIC_API_KEY=sk-ant-...\` to \`.env.local\` and restart.`;
}
