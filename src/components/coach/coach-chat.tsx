"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Bot, User, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils/cn";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Props {
  quickQuestions: string[];
}

export function CoachChat({ quickQuestions }: Props) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi — I'm your AI strength coach. I have your full training history and computed analytics. Ask me anything specific: a lift's trend, your plateaus, what to focus on today.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    // Placeholder assistant message for streaming
    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);

    try {
      const history = [...messages, userMsg]
        .filter((m) => m.id !== "welcome")
        .slice(0, -1) // exclude the user msg we just added (it's the question)
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, history }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Request failed");
      }

      // Stream the response
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        accumulated += decoder.decode(value, { stream: true });
        // Update in place
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, content: accumulated, streaming: true } : m
          )
        );
      }

      // Mark done
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: accumulated, streaming: false } : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, content: "Network error — please try again.", streaming: false }
            : m
        )
      );
    } finally {
      setLoading(false);
      textareaRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: "welcome",
      role: "assistant",
      content: "Chat cleared. Ask me anything about your training.",
    }]);
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-sm overflow-hidden">
      {/* Quick questions */}
      <div className="px-4 pt-4 pb-3 border-b border-zinc-100">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-zinc-400 font-medium">Quick questions</p>
          <button
            onClick={clearChat}
            className="text-xs text-zinc-400 hover:text-zinc-600 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Clear
          </button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {quickQuestions.map((q) => (
            <button
              key={q}
              onClick={() => sendMessage(q)}
              disabled={loading}
              className="text-xs bg-zinc-50 hover:bg-indigo-50 hover:text-indigo-700 border border-zinc-200 hover:border-indigo-200 text-zinc-600 px-2.5 py-1 rounded-full transition-colors disabled:opacity-40"
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="h-[420px]">
        <div className="p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn("flex gap-3", msg.role === "user" ? "flex-row-reverse" : "flex-row")}
            >
              <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                msg.role === "user" ? "bg-indigo-600" : "bg-zinc-100"
              )}>
                {msg.role === "user"
                  ? <User className="w-3.5 h-3.5 text-white" />
                  : <Bot className="w-3.5 h-3.5 text-zinc-600" />}
              </div>

              <div className={cn(
                "max-w-[82%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-zinc-50 text-zinc-800 border border-zinc-100"
              )}>
                {msg.content ? (
                  <span
                    dangerouslySetInnerHTML={{
                      __html: msg.content
                        .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                        .replace(/\n/g, "<br/>"),
                    }}
                  />
                ) : (
                  <span className="flex gap-1 items-center text-zinc-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-300 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </span>
                )}
                {msg.streaming && msg.content && (
                  <span className="inline-block w-0.5 h-3.5 bg-zinc-400 ml-0.5 animate-pulse align-middle" />
                )}
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t border-zinc-100 flex gap-2">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask your coach anything..."
          className="min-h-[40px] max-h-24 resize-none text-sm border-zinc-200 flex-1"
          rows={1}
        />
        <Button
          onClick={() => sendMessage(input)}
          disabled={!input.trim() || loading}
          variant="accent"
          size="icon"
          className="shrink-0"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
