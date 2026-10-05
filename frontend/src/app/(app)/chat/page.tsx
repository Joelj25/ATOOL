"use client";

import { useEffect, useRef, useState } from "react";
import { BrainCircuit, Send, Sparkles } from "lucide-react";
import { sendChat, type ChatMessage } from "@/lib/api";

const SUGGESTIONS = ["What's my attendance?", "What's my next class?", "Show pending assignments"];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "ai",
      text: "Hi! I'm your ATOOL assistant. Ask me about your attendance, timetable, or assignments.",
    },
  ]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages((m) => [...m, { role: "user", text: trimmed }]);
    setDraft("");
    setLoading(true);
    try {
      const res = await sendChat(trimmed);
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
    <div className="mx-auto flex max-w-3xl flex-col" style={{ height: "calc(100vh - 4rem)" }}>
      <header className="mb-6">
        <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight text-white">
          <BrainCircuit className="h-7 w-7 text-indigo-400" /> Chat
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Your campus assistant — answers from live campus data (LLM integration coming soon).
        </p>
      </header>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto rounded-2xl border border-white/5 bg-slate-900/40 p-5">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] whitespace-pre-line rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-800 text-slate-300 ring-1 ring-white/5"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="flex items-center gap-1.5 rounded-2xl bg-slate-800 px-4 py-3 ring-1 ring-white/5">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:0ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:150ms]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-slate-500 [animation-delay:300ms]" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      <div className="mt-4 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-full border border-white/10 bg-slate-900/60 px-3 py-1.5 text-xs text-slate-400 transition hover:border-indigo-500/40 hover:text-indigo-300 disabled:opacity-50"
          >
            <Sparkles className="h-3 w-3" /> {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(draft);
        }}
        className="mt-4 flex items-center gap-3"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Ask about attendance, timetable, assignments…"
          className="flex-1 rounded-xl border border-white/10 bg-slate-800/70 px-4 py-3 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
        />
        <button
          type="submit"
          disabled={loading || !draft.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/25 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
