import { Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { CoachChat } from "@/components/coach/coach-chat";
import { SummaryPanel } from "@/components/coach/summary-panel";
import { getLatestSummary, getActivePhase } from "@/lib/data";
import { formatShort } from "@/lib/utils/dates";

const DEMO_USER = "demo-user";

const QUICK_QUESTIONS = [
  "How am I doing?",
  "How is my incline press progressing?",
  "What should I do today?",
  "What machines have I used most?",
  "Where am I plateauing?",
  "What's my strongest lift right now?",
  "How's my consistency been?",
];

export default async function CoachPage() {
  const [summary, phase] = await Promise.all([
    getLatestSummary(DEMO_USER),
    getActivePhase(DEMO_USER),
  ]);

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">AI Coach</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Ask anything about your training. Answers are grounded in your real data.
        </p>
      </div>

      {/* Weekly summary */}
      <SummaryPanel summary={summary} phase={phase} />

      {/* Chat */}
      <CoachChat quickQuestions={QUICK_QUESTIONS} />
    </div>
  );
}
