import { NextRequest } from "next/server";
import { z } from "zod";
import { streamCoachAnswer } from "@/lib/ai/client";
import { AI_NOT_CONFIGURED_MESSAGE, isAIConfigured } from "@/lib/ai/config";
import { getActivePhase, getAllSets, getSessions } from "@/lib/data";

const DEMO_USER = "demo-user";

const RequestSchema = z.object({
  question: z.string().min(1).max(500),
  history: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
    .default([]),
});

export async function POST(req: NextRequest) {
  let question: string;
  let history: Array<{ role: "user" | "assistant"; content: string }>;

  try {
    const body = await req.json();
    const parsed = RequestSchema.parse(body);
    question = parsed.question;
    history = parsed.history;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!isAIConfigured()) {
    return new Response(AI_NOT_CONFIGURED_MESSAGE, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      },
    });
  }

  try {
    const [phase, sessions, allSets] = await Promise.all([
      getActivePhase(DEMO_USER),
      getSessions(DEMO_USER),
      getAllSets(DEMO_USER),
    ]);
    const stream = await streamCoachAnswer(question, sessions, allSets, phase, history);
    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Coach error:", err);
    return new Response(AI_NOT_CONFIGURED_MESSAGE, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
