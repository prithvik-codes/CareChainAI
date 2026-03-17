"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface ReportOut {
  id: number;
  original_filename: string;
  report_type: string;
  report_date: string | null;
  hospital_name: string | null;
  doctor_name: string | null;
  summary: string | null;
  status: "pending" | "processing" | "done" | "failed";
  created_at: string;
}

const TYPE_ICONS: Record<string, string> = {
  lab: "🧪", mri: "🧲", xray: "☢️", prescription: "💊", discharge: "🏥", other: "📄",
};

const STATUS_COLORS: Record<string, string> = {
  done:       "bg-emerald-900/60 text-emerald-300",
  failed:     "bg-rose-900/60 text-rose-300",
  processing: "bg-amber-900/60 text-amber-300",
  pending:    "bg-amber-900/60 text-amber-300",
};

function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user_name");
  window.location.href = "/";
}

export default function DoctorDashboard() {
  const [reports, setReports]   = useState<ReportOut[]>([]);
  const [loading, setLoading]   = useState(true);
  const [userName, setUserName] = useState("Doctor");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    const name  = localStorage.getItem("user_name");

    if (!token) { window.location.href = "/auth/login"; return; }
    if (role === "patient") { window.location.href = "/dashboard"; return; }
    if (name) setUserName(name);

    fetch("http://localhost:8000/api/reports/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const done       = reports.filter((r) => r.status === "done").length;
  const pending    = reports.filter((r) => r.status === "pending" || r.status === "processing").length;
  const failed     = reports.filter((r) => r.status === "failed").length;
  const typeCounts = reports.reduce((acc, r) => {
    acc[r.report_type] = (acc[r.report_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-slate-950 text-white">

      {/* ── Top navbar ── */}
      <div className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-violet-600 rounded-xl flex items-center justify-center font-bold text-lg">
            👨‍⚕️
          </div>
          <div>
            <div className="font-bold">Dr. {userName}</div>
            <div className="text-xs text-violet-400">Doctor Portal</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center text-slate-950 font-bold text-sm">C</div>
          <span className="font-bold">CareChainAI</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-slate-800 hover:bg-rose-900 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 rounded-xl text-sm transition-all"
        >
          🚪 Logout
        </button>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">

        {/* Welcome banner */}
        <div className="bg-gradient-to-r from-violet-900/40 to-cyan-900/40 border border-violet-700/40 rounded-2xl p-6 mb-8">
          <h1 className="text-2xl font-bold mb-1">Welcome, Dr. {userName} 👋</h1>
          <p className="text-slate-400 text-sm">
            Review uploaded patient reports, analyse medical records and use AI assistance.
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Reports",  value: reports.length, icon: "📁", color: "text-cyan-400" },
            { label: "Analysed",       value: done,           icon: "✅", color: "text-emerald-400" },
            { label: "Pending",        value: pending,        icon: "⏳", color: "text-amber-400" },
            { label: "Failed",         value: failed,         icon: "❌", color: "text-rose-400" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-400 text-sm mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Report type breakdown ── */}
        {Object.keys(typeCounts).length > 0 && (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 mb-8">
            <h2 className="text-sm font-semibold text-slate-300 mb-3">Report Type Breakdown</h2>
            <div className="flex flex-wrap gap-3">
              {Object.entries(typeCounts).map(([type, count]) => (
                <div key={type} className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2">
                  <span>{TYPE_ICONS[type] || "📄"}</span>
                  <span className="text-sm font-medium capitalize">{type}</span>
                  <span className="text-cyan-400 font-bold text-sm">{count}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick actions — Doctor specific ── */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { href: "/upload",    label: "Upload Report",    icon: "⬆️", color: "from-cyan-700 to-cyan-900",    desc: "Add new patient document" },
            { href: "/ask-ai",    label: "AI Analysis",      icon: "🤖", color: "from-violet-700 to-violet-900", desc: "Query patient records with AI" },
            { href: "/timeline",  label: "Patient Timeline", icon: "📅", color: "from-emerald-700 to-emerald-900", desc: "View chronological history" },
          ].map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className={`bg-gradient-to-br ${a.color} border border-white/10 rounded-2xl p-5 hover:scale-105 transition-transform`}
            >
              <div className="text-3xl mb-2">{a.icon}</div>
              <div className="font-semibold">{a.label}</div>
              <div className="text-white/60 text-xs mt-1">{a.desc}</div>
            </Link>
          ))}
        </div>

        {/* ── Reports table ── */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">All Reports</h2>
          <span className="text-slate-400 text-sm">{reports.length} total</span>
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-slate-400 py-8">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-violet-400 rounded-full animate-spin" />
            Loading reports...
          </div>
        ) : reports.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 text-center text-slate-400">
            <div className="text-4xl mb-3">📂</div>
            <div className="font-semibold mb-1">No reports found</div>
            <p className="text-sm mb-4">Upload patient reports to get started.</p>
            <Link href="/upload" className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold transition-colors">
              Upload Report →
            </Link>
          </div>
        ) : (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-5 gap-4 px-5 py-3 border-b border-slate-700 text-xs text-slate-400 font-medium uppercase tracking-wide">
              <div className="col-span-2">Report</div>
              <div>Type</div>
              <div>Date</div>
              <div>Status</div>
            </div>
            {/* Table rows */}
            {reports.map((r) => (
              <div
                key={r.id}
                className="grid grid-cols-5 gap-4 px-5 py-4 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/30 transition-colors items-center"
              >
                <div className="col-span-2 flex items-center gap-3 min-w-0">
                  <span className="text-xl flex-shrink-0">{TYPE_ICONS[r.report_type] || "📄"}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{r.original_filename}</div>
                    {r.hospital_name && (
                      <div className="text-xs text-slate-400 truncate">🏥 {r.hospital_name}</div>
                    )}
                  </div>
                </div>
                <div className="text-sm text-slate-300 capitalize">{r.report_type}</div>
                <div className="text-sm text-slate-400">{r.report_date || "—"}</div>
                <div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── AI summary banner ── */}
        {done > 0 && (
          <div className="mt-8 bg-gradient-to-r from-emerald-900/30 to-cyan-900/30 border border-emerald-700/40 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <div className="font-semibold mb-1">🤖 AI Analysis Ready</div>
              <div className="text-slate-400 text-sm">{done} report{done !== 1 ? "s" : ""} processed and ready for AI queries.</div>
            </div>
            <Link href="/ask-ai" className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition-colors flex-shrink-0">
              Ask AI →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
