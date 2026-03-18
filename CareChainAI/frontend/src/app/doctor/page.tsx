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
  const [reports,   setReports]   = useState<ReportOut[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [userName,  setUserName]  = useState("Doctor");
  const [activeTab, setActiveTab] = useState<"all" | "pending" | "done" | "failed">("all");
  const [search,    setSearch]    = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    const name  = localStorage.getItem("user_name");
    if (!token) { window.location.href = "/auth/login"; return; }
    if (role === "patient") { window.location.href = "/dashboard"; return; }
    if (name) setUserName(name);

    fetch("http://10.157.36.194:8000/api/reports/", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered = reports
    .filter((r) => activeTab === "all" || r.status === activeTab)
    .filter((r) =>
      search === "" ||
      r.original_filename.toLowerCase().includes(search.toLowerCase()) ||
      (r.hospital_name || "").toLowerCase().includes(search.toLowerCase()) ||
      r.report_type.toLowerCase().includes(search.toLowerCase())
    );

  const stats = {
    total:      reports.length,
    done:       reports.filter((r) => r.status === "done").length,
    pending:    reports.filter((r) => r.status === "pending" || r.status === "processing").length,
    failed:     reports.filter((r) => r.status === "failed").length,
    types:      new Set(reports.map((r) => r.report_type)).size,
  };

  return (
    <div className="min-h-screen bg-[#0f0f1a] text-white">

      {/* ── Sidebar ── */}
      <div className="fixed left-0 top-0 bottom-0 w-64 bg-[#13132b] border-r border-violet-900/30 flex flex-col z-10">
        {/* Logo */}
        <div className="p-6 border-b border-violet-900/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center text-xl">👨‍⚕️</div>
            <div>
              <div className="font-bold text-violet-200">Dr. {userName}</div>
              <div className="text-xs text-violet-400">Medical Professional</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-4 space-y-1">
          {[
            { icon: "📊", label: "Dashboard",       href: "/doctor",       active: true },
            { icon: "⬆️", label: "Upload Report",   href: "/upload",       active: false },
            { icon: "🤖", label: "AI Analysis",     href: "/ask-ai",       active: false },
            { icon: "📅", label: "Timeline",        href: "/timeline",     active: false },
            { icon: "💊", label: "Medications",     href: "/medications",  active: false },
            { icon: "🗓️", label: "Appointments",   href: "/appointments", active: false },
            { icon: "🛡️", label: "Database",       href: "/admin",        active: false },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm transition-all ${
                item.active
                  ? "bg-violet-600/20 text-violet-300 border border-violet-600/30"
                  : "text-slate-400 hover:bg-violet-900/20 hover:text-violet-200"
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-violet-900/30">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm text-slate-400 hover:bg-rose-900/20 hover:text-rose-400 transition-all"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>

      {/* ── Main content ── */}
      <div className="ml-64 p-8">

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium uppercase tracking-wide">Doctor Portal</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Medical Records Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Review and analyse patient reports</p>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Reports",  value: stats.total,   icon: "📁", color: "border-violet-700 bg-violet-900/20", val: "text-violet-300" },
            { label: "Analysed",       value: stats.done,    icon: "✅", color: "border-emerald-700 bg-emerald-900/20", val: "text-emerald-300" },
            { label: "Pending",        value: stats.pending, icon: "⏳", color: "border-amber-700 bg-amber-900/20", val: "text-amber-300" },
            { label: "Failed",         value: stats.failed,  icon: "❌", color: "border-rose-700 bg-rose-900/20", val: "text-rose-300" },
            { label: "Report Types",   value: stats.types,   icon: "📊", color: "border-cyan-700 bg-cyan-900/20", val: "text-cyan-300" },
          ].map((s) => (
            <div key={s.label} className={`border rounded-2xl p-4 ${s.color}`}>
              <div className="text-xl mb-2">{s.icon}</div>
              <div className={`text-3xl font-bold ${s.val}`}>{s.value}</div>
              <div className="text-slate-400 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick tools */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Link href="/upload" className="bg-gradient-to-br from-violet-800 to-violet-950 border border-violet-700/50 rounded-2xl p-5 hover:scale-105 transition-transform group">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">📤</div>
            <div className="font-semibold text-violet-200">Upload Patient Report</div>
            <div className="text-violet-400 text-xs mt-1">Add new medical document</div>
          </Link>
          <Link href="/ask-ai" className="bg-gradient-to-br from-emerald-800 to-emerald-950 border border-emerald-700/50 rounded-2xl p-5 hover:scale-105 transition-transform group">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">🤖</div>
            <div className="font-semibold text-emerald-200">AI Clinical Analysis</div>
            <div className="text-emerald-400 text-xs mt-1">Query reports with Gemini AI</div>
          </Link>
          <Link href="/timeline" className="bg-gradient-to-br from-cyan-800 to-cyan-950 border border-cyan-700/50 rounded-2xl p-5 hover:scale-105 transition-transform group">
            <div className="text-3xl mb-3 group-hover:scale-110 transition-transform">📋</div>
            <div className="font-semibold text-cyan-200">Patient History</div>
            <div className="text-cyan-400 text-xs mt-1">Chronological record view</div>
          </Link>
        </div>

        {/* Reports table */}
        <div className="bg-[#13132b] border border-violet-900/30 rounded-2xl overflow-hidden">
          {/* Table header with search + filter */}
          <div className="px-6 py-4 border-b border-violet-900/30 flex items-center justify-between gap-4">
            <h2 className="font-semibold text-violet-200">Patient Reports</h2>
            <div className="flex items-center gap-3">
              {/* Search */}
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search reports..."
                className="bg-[#0f0f1a] border border-violet-900/50 rounded-xl px-4 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 w-48"
              />
              {/* Filter tabs */}
              <div className="flex gap-1 bg-[#0f0f1a] border border-violet-900/50 rounded-xl p-1">
                {(["all", "pending", "done", "failed"] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium capitalize transition-all ${
                      activeTab === tab
                        ? "bg-violet-600 text-white"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Column headers */}
          <div className="grid grid-cols-12 gap-3 px-6 py-3 border-b border-violet-900/20 text-xs text-violet-400 font-medium uppercase tracking-wide">
            <div className="col-span-1">#</div>
            <div className="col-span-3">Report</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2">Date</div>
            <div className="col-span-2">Hospital</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1">Action</div>
          </div>

          {/* Rows */}
          {loading ? (
            <div className="flex items-center justify-center gap-3 py-16 text-slate-400">
              <div className="w-5 h-5 border-2 border-violet-700 border-t-violet-400 rounded-full animate-spin" />
              Loading reports...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <div className="text-4xl mb-3">📂</div>
              <div className="font-semibold mb-1">No reports found</div>
              <Link href="/upload" className="mt-3 inline-block px-5 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold transition-colors">
                Upload First Report
              </Link>
            </div>
          ) : (
            filtered.map((r, i) => (
              <div
                key={r.id}
                className="grid grid-cols-12 gap-3 px-6 py-4 border-b border-violet-900/10 last:border-0 hover:bg-violet-900/10 transition-colors items-center"
              >
                <div className="col-span-1 text-violet-600 text-xs font-mono">#{r.id}</div>
                <div className="col-span-3 flex items-center gap-2 min-w-0">
                  <span className="text-lg flex-shrink-0">{TYPE_ICONS[r.report_type] || "📄"}</span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{r.original_filename}</div>
                    {r.doctor_name && <div className="text-xs text-slate-500 truncate">👨‍⚕️ {r.doctor_name}</div>}
                  </div>
                </div>
                <div className="col-span-2">
                  <span className="px-2 py-1 bg-violet-900/40 text-violet-300 rounded-lg text-xs capitalize">{r.report_type}</span>
                </div>
                <div className="col-span-2 text-slate-400 text-sm">{r.report_date || "—"}</div>
                <div className="col-span-2 text-slate-400 text-xs truncate">{r.hospital_name || "—"}</div>
                <div className="col-span-1">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>
                    {r.status}
                  </span>
                </div>
                <div className="col-span-1">
                  <Link
                    href="/ask-ai"
                    className="px-2 py-1 bg-emerald-900/40 hover:bg-emerald-700/40 text-emerald-400 text-xs rounded-lg transition-colors"
                    title="Analyse with AI"
                  >
                    🤖 Ask AI
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>

        {/* AI analysis CTA */}
        {stats.done > 0 && (
          <div className="mt-6 bg-gradient-to-r from-violet-900/30 to-emerald-900/30 border border-violet-700/30 rounded-2xl p-5 flex items-center justify-between">
            <div>
              <div className="font-semibold text-violet-200 mb-1">🤖 {stats.done} report{stats.done !== 1 ? "s" : ""} ready for AI clinical analysis</div>
              <div className="text-slate-400 text-sm">Use Gemini AI to query patient records and get clinical insights.</div>
            </div>
            <Link href="/ask-ai" className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold transition-colors flex-shrink-0">
              Start Analysis →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
