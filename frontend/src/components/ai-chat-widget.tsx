"use client";

import { useState } from "react";
import { Bot, Send, Sparkles, X } from "lucide-react";
import { sendChat } from "@/lib/api";

/**
 * UI wrapper for the AI Chat Assistant.
 * Deliberately has no LLM wiring yet — responses are canned placeholders.
 */
export default function AiChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "ai"; text: string }[]>([
    {
      role: "ai",
      text: "Hi Arjun! I'm your ATOOL assistant. Ask me about attendance, your timetable, or campus life.",
    },
  ]);

  const [loading, setLoading] = useState(false);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", text }]);
    setDraft("");
    setLoading(true);
    try {
      const res = await sendChat(text);
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
        <div className="mb-4 flex h-[26rem] w-80 flex-col overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl shadow-black/50 backdrop-blur">
          {/* Header */}
          <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600">
              <Bot className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-white">ATOOL Assistant</p>
              <p className="flex items-center gap-1 text-[10px] text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> AI-powered
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-500 transition hover:text-slate-300">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-800 text-slate-300 ring-1 ring-white/5"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-white/10 p-3">
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask anything…"
              className="flex-1 rounded-lg border border-white/10 bg-slate-800/70 px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-indigo-500"
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
