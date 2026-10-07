"use client";

import { useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { sendChat, type ChatHistoryItem } from "@/lib/api";
import { getUser } from "@/lib/auth";

/**
 * UI wrapper for the AI Chat Assistant.
 * Deliberately has no LLM wiring yet — responses are canned placeholders.
 */
export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const firstName = (typeof window === "undefined" ? null : getUser())?.name?.split(" ")[0];
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    {
      role: "ai",
      text: `Hi ${firstName ?? "there"}! I'm your ATOOL Campus AI. Ask me about your attendance or timetable — I check real campus records before answering.`,
    },
  ]);

  const [loading, setLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || loading) return;
    const history: ChatHistoryItem[] = messages
      .slice(-8)
      .map((m) => ({ role: m.role === "ai" ? ("assistant" as const) : ("user" as const), content: m.text }));
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");
    setLoading(true);
    try {
      const res = await sendChat(text, history);
      setMessages((m) => [...m, { role: "ai", text: res.reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        { role: "ai", text: "I couldn't reach the backend. Is it running on port 8000?" },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed right-6 bottom-6 z-50">
      {open && (
        <div className="mb-4 flex h-[26rem] w-80 flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl shadow-accent/10 backdrop-blur">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">ATOOL Assistant</p>
              <p className="flex items-center gap-1 text-[10px] text-success">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> AI-powered
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-faint transition hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={                  `max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-surface-2 text-foreground ring-1 ring-border"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1.5 rounded-xl bg-surface-2 px-3 py-2 ring-1 ring-border">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-accent [animation-delay:300ms]" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 rounded-lg border border-border bg-input px-3 py-2 text-xs text-foreground placeholder-faint outline-none focus:border-accent"
            />
            <button
              type="submit"
              className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white transition hover:opacity-90"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* Launcher */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 py-3 pl-4 pr-5 text-sm font-semibold text-white shadow-xl shadow-indigo-500/30 transition hover:scale-105"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : (
          <span className="relative">
            <Sparkles className="h-5 w-5" />
          </span>
        )}
        {open ? "Close" : "Ask AI"}
      </button>
    </div>
  );
}
