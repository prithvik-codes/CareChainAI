"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface TimelineEntry {
  id: number;
  report_date: string | null;
  report_type: string;
  hospital_name: string | null;
  summary: string | null;
  original_filename: string;
}

const TYPE_ICONS: Record<string, string> = {
  lab: "🧪",
  mri: "🧲",
  xray: "☢️",
  prescription: "💊",
  discharge: "🏥",
  other: "📄",
};

const TYPE_COLORS: Record<string, string> = {
  lab:          "border-cyan-500 bg-cyan-500/10 text-cyan-300",
  mri:          "border-violet-500 bg-violet-500/10 text-violet-300",
  xray:         "border-yellow-500 bg-yellow-500/10 text-yellow-300",
  prescription: "border-emerald-500 bg-emerald-500/10 text-emerald-300",
  discharge:    "border-rose-500 bg-rose-500/10 text-rose-300",
  other:        "border-slate-500 bg-slate-500/10 text-slate-300",
};

const DOT_COLORS: Record<string, string> = {
  lab:          "bg-cyan-500",
  mri:          "bg-violet-500",
  xray:         "bg-yellow-500",
  prescription: "bg-emerald-500",
  discharge:    "bg-rose-500",
  other:        "bg-slate-500",
};

function handleLogout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

function groupByYear(entries: TimelineEntry[]) {
  return entries.reduce((acc, entry) => {
    const year = entry.report_date
      ? new Date(entry.report_date).getFullYear().toString()
      : "Unknown Date";
    if (!acc[year]) acc[year] = [];
    acc[year].push(entry);
    return acc;
  }, {} as Record<string, TimelineEntry[]>);
}

export default function TimelinePage() {
  const [entries, setEntries] = useState<TimelineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { window.location.href = "/auth/login"; return; }

    fetch("http://10.157.36.194:8000/api/timeline/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setEntries)
      .catch(() => setError("Failed to load timeline."))
      .finally(() => setLoading(false));
  }, []);

  const reportTypes = ["all", ...Array.from(new Set(entries.map((e) => e.report_type)))];

  const filtered = filter === "all"
    ? entries
    : entries.filter((e) => e.report_type === filter);

  const grouped = groupByYear(filtered);
  const years = Object.keys(grouped).sort((a, b) => {
    if (a === "Unknown Date") return 1;
    if (b === "Unknown Date") return -1;
    return Number(b) - Number(a); // newest first
  });

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Back to Dashboard
        </a>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center text-slate-950 font-bold text-sm">C</div>
          <span className="font-bold">CareChainAI</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 rounded-lg text-sm transition-all"
        >
          🚪 Logout
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-1">Health Timeline</h1>
        <p className="text-slate-400 text-sm mb-6">
          Your complete medical history in chronological order
        </p>

        {/* Summary stats */}
        {!loading && entries.length > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-cyan-400">{entries.length}</div>
              <div className="text-slate-400 text-xs mt-1">Total Records</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-violet-400">
                {new Set(entries.map((e) => e.report_type)).size}
              </div>
              <div className="text-slate-400 text-xs mt-1">Report Types</div>
            </div>
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-400">
                {new Set(entries.filter((e) => e.report_date).map((e) => new Date(e.report_date!).getFullYear())).size}
              </div>
              <div className="text-slate-400 text-xs mt-1">Years Covered</div>
            </div>
          </div>
        )}

        {/* Filter tabs */}
        {!loading && entries.length > 0 && (
          <div className="flex gap-2 flex-wrap mb-8">
            {reportTypes.map((type) => (
              <button
                key={type}
                onClick={() => setFilter(type)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all capitalize ${
                  filter === type
                    ? "bg-cyan-600 text-white"
                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white border border-slate-700"
                }`}
              >
                {type === "all" ? "All" : `${TYPE_ICONS[type] || "📄"} ${type}`}
              </button>
            ))}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 text-slate-400 py-10">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
            Loading your timeline...
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-rose-900/50 border border-rose-700 text-rose-300 rounded-xl px-5 py-4 mb-6">
            ⚠️ {error}
          </div>
        )}

        {/* Empty state */}
        {!loading && entries.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">📅</div>
            <div className="text-xl font-semibold mb-2">No records yet</div>
            <p className="text-slate-400 mb-6 text-sm">
              Upload and process medical reports to see them here.
            </p>
            <Link
              href="/upload"
              className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-semibold transition-colors text-sm"
            >
              ⬆️ Upload First Report
            </Link>
          </div>
        )}

        {/* No results after filter */}
        {!loading && entries.length > 0 && filtered.length === 0 && (
          <div className="text-center py-10 text-slate-400">
            No {filter} records found.
          </div>
        )}

        {/* ── TIMELINE ── */}
        {!loading && years.map((year) => (
          <div key={year} className="mb-10">
            {/* Year header */}
            <div className="flex items-center gap-4 mb-6">
              <div className="text-2xl font-bold text-slate-200">{year}</div>
              <div className="flex-1 h-px bg-slate-700" />
              <div className="text-slate-500 text-sm">{grouped[year].length} record{grouped[year].length !== 1 ? "s" : ""}</div>
            </div>

            {/* Entries for this year */}
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-5 top-0 bottom-0 w-px bg-slate-700" />

              <div className="space-y-4">
                {grouped[year].map((entry) => (
                  <div key={entry.id} className="flex gap-5 items-start">
                    {/* Dot */}
                    <div className={`relative z-10 w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 border-2 border-slate-800 ${DOT_COLORS[entry.report_type] || "bg-slate-500"}`}>
                      <span className="text-base">{TYPE_ICONS[entry.report_type] || "📄"}</span>
                    </div>

                    {/* Card */}
                    <div
                      className={`flex-1 border rounded-xl overflow-hidden transition-all cursor-pointer ${
                        TYPE_COLORS[entry.report_type] || TYPE_COLORS.other
                      } ${expanded === entry.id ? "shadow-lg" : ""}`}
                      onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
                    >
                      {/* Card header */}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm truncate">
                                {entry.original_filename}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize border ${TYPE_COLORS[entry.report_type]}`}>
                                {entry.report_type}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 text-xs opacity-70">
                              {entry.report_date && (
                                <span>📅 {new Date(entry.report_date).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}</span>
                              )}
                              {entry.hospital_name && (
                                <span>🏥 {entry.hospital_name}</span>
                              )}
                            </div>
                          </div>
                          <span className="text-slate-400 text-sm flex-shrink-0">
                            {expanded === entry.id ? "▲" : "▼"}
                          </span>
                        </div>
                      </div>

                      {/* Expanded summary */}
                      {expanded === entry.id && entry.summary && (
                        <div className="px-4 pb-4 border-t border-white/10 pt-3">
                          <div className="text-xs font-semibold uppercase tracking-wide opacity-60 mb-2">
                            AI Summary
                          </div>
                          <p className="text-sm opacity-80 leading-relaxed">
                            {entry.summary}
                          </p>
                        </div>
                      )}

                      {expanded === entry.id && !entry.summary && (
                        <div className="px-4 pb-4 border-t border-white/10 pt-3">
                          <p className="text-sm opacity-50 italic">No summary available for this report.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* Ask AI CTA */}
        {!loading && entries.length > 0 && (
          <div className="mt-8 bg-gradient-to-br from-emerald-900/40 to-cyan-900/40 border border-emerald-700/50 rounded-2xl p-6 text-center">
            <div className="text-2xl mb-2">🤖</div>
            <div className="font-semibold mb-1">Have questions about your records?</div>
            <p className="text-slate-400 text-sm mb-4">
              Ask AI to explain any report in simple language.
            </p>
            <Link
              href="/ask-ai"
              className="inline-block px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition-colors"
            >
              Ask AI →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
