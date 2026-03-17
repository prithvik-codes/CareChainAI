"use client";
import { useEffect, useRef, useState } from "react";

interface Message {
  id: number;
  role: "user" | "ai";
  text: string;
  sources?: number[];
  chunks?: number;
  safe?: boolean;
  timestamp: Date;
}

const SUGGESTIONS = [
  "What does my latest blood test show?",
  "Explain my MRI results in simple terms",
  "What medications am I currently on?",
  "Are there any abnormal values in my reports?",
  "Summarise my health history",
  "What did my doctor prescribe last visit?",
];

function handleLogout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

function formatTime(date: Date) {
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
}

export default function AskAIPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const idCounter = useRef(0);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/auth/login"; return; }

    // Welcome message
    setMessages([{
      id: idCounter.current++,
      role: "ai",
      text: "👋 Hello! I'm your AI health assistant.\n\nI can answer questions about your uploaded medical reports — lab results, prescriptions, MRI reports, and more.\n\nWhat would you like to know?",
      timestamp: new Date(),
    }]);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: idCounter.current++,
      role: "user",
      text: text.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const res = await fetch("http://localhost:8000/api/ai/ask", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ question: text.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to get response");

      const aiMsg: Message = {
        id: idCounter.current++,
        role: "ai",
        text: data.answer,
        sources: data.sources,
        chunks: data.retrieved_chunks,
        safe: data.safe,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (e: any) {
      setError(e.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const clearChat = () => {
    setMessages([{
      id: idCounter.current++,
      role: "ai",
      text: "Chat cleared. How can I help you with your medical records?",
      timestamp: new Date(),
    }]);
    setError("");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* ── Header ── */}
      <div className="border-b border-slate-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
        <a href="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Dashboard
        </a>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center text-slate-950 font-bold text-sm">🤖</div>
          <div>
            <span className="font-bold text-sm">Ask AI</span>
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-xs text-emerald-400">Gemini 2.5 Pro · RAG</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white rounded-lg text-xs transition-all"
          >
            🗑️ Clear
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 rounded-lg text-sm transition-all"
          >
            🚪 Logout
          </button>
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
        <div className="max-w-3xl mx-auto space-y-4">

          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              {/* Avatar */}
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                msg.role === "user"
                  ? "bg-cyan-600 text-white"
                  : "bg-emerald-700 text-white"
              }`}>
                {msg.role === "user" ? "U" : "🤖"}
              </div>

              {/* Bubble */}
              <div className={`max-w-[80%] space-y-1 ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-cyan-600 text-white rounded-tr-sm"
                    : "bg-slate-800 border border-slate-700 text-slate-200 rounded-tl-sm"
                }`}>
                  {msg.text}
                </div>

                {/* AI metadata */}
                {msg.role === "ai" && msg.chunks !== undefined && msg.chunks > 0 && (
                  <div className="flex items-center gap-2 px-1 flex-wrap">
                    <span className="text-xs text-slate-500">
                      📚 {msg.chunks} chunk{msg.chunks !== 1 ? "s" : ""} retrieved
                    </span>
                    {msg.sources && msg.sources.length > 0 && (
                      <span className="text-xs text-slate-500">
                        · from {msg.sources.length} report{msg.sources.length !== 1 ? "s" : ""}
                      </span>
                    )}
                    {msg.safe === false && (
                      <span className="text-xs text-amber-400">⚠️ reviewed by safety filter</span>
                    )}
                  </div>
                )}

                <span className="text-xs text-slate-600 px-1">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-700 flex items-center justify-center text-sm flex-shrink-0">
                🤖
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex items-center gap-2 text-slate-400 text-xs mb-1">
                  Searching your records · querying Gemini · validating...
                </div>
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-rose-900/40 border border-rose-700 text-rose-300 rounded-xl px-4 py-3 text-sm">
              ⚠️ {error}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Suggestions (shown when only welcome message) ── */}
      {messages.length === 1 && !loading && (
        <div className="px-4 pb-2">
          <div className="max-w-3xl mx-auto">
            <p className="text-slate-500 text-xs mb-2 pl-1">Suggested questions:</p>
            <div className="flex gap-2 flex-wrap">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => sendMessage(s)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-emerald-600 text-slate-300 hover:text-white rounded-full text-xs transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Input bar ── */}
      <div className="border-t border-slate-800 px-4 py-4 flex-shrink-0">
        <div className="max-w-3xl mx-auto">
          <div className="flex gap-3 items-end bg-slate-800 border border-slate-700 focus-within:border-emerald-600 rounded-2xl px-4 py-3 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your medical records... (Enter to send, Shift+Enter for new line)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 resize-none focus:outline-none max-h-32"
              style={{ height: "auto" }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = `${t.scrollHeight}px`;
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="flex-shrink-0 w-9 h-9 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl flex items-center justify-center transition-colors"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <svg className="w-4 h-4 text-white rotate-90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              )}
            </button>
          </div>
          <p className="text-slate-600 text-xs text-center mt-2">
            ⚠️ For informational purposes only · Always consult your doctor for medical advice
          </p>
        </div>
      </div>
    </div>
  );
}
