"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

interface ReportOut {
  id: number;
  original_filename: string;
  report_type: string;
  report_date: string | null;
  hospital_name: string | null;
  status: "pending" | "processing" | "done" | "failed";
  created_at: string;
}

const STAT_ICONS: Record<string, string> = {
  lab: "🧪", mri: "🧲", xray: "☢️", prescription: "💊", discharge: "🏥", other: "📄",
};

const STATUS_COLORS: Record<string, string> = {
  done:       "bg-emerald-900 text-emerald-300",
  failed:     "bg-rose-900 text-rose-300",
  processing: "bg-amber-900 text-amber-300",
  pending:    "bg-amber-900 text-amber-300",
};

function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user_name");
  window.location.href = "/";
}

export default function DashboardPage() {
  const [reports,    setReports]    = useState<ReportOut[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [userName,   setUserName]   = useState("Patient");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmId,  setConfirmId]  = useState<number | null>(null);

  useEffect(() => {
    const token    = localStorage.getItem("token");
    const role     = localStorage.getItem("role");
    const name     = localStorage.getItem("user_name");
    if (!token) { window.location.href = "/auth/login"; return; }
    if (role === "doctor") { window.location.href = "/doctor"; return; }
    if (name) setUserName(name);

    fetch("http://localhost:8000/api/reports/", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setReports).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    const token = localStorage.getItem("token");
    const res = await fetch(`http://localhost:8000/api/reports/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    if (res.ok || res.status === 204) setReports((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null); setConfirmId(null);
  };

  const done       = reports.filter((r) => r.status === "done").length;
  const processing = reports.filter((r) => r.status === "processing" || r.status === "pending").length;
  const typeCounts = reports.reduce((acc, r) => { acc[r.report_type] = (acc[r.report_type] || 0) + 1; return acc; }, {} as Record<string, number>);

  return (
    <div className="min-h-screen bg-slate-950 text-white p-8">
      <div className="max-w-6xl mx-auto">

        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold">Health Dashboard</h1>
            <p className="text-slate-400 text-sm mt-0.5">Welcome back, {userName} 👋</p>
          </div>
          <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-rose-900 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 rounded-xl text-sm font-medium transition-all">
            🚪 Logout
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 mb-8">
          {[
            { label: "Total Records",  value: reports.length,                      icon: "📁", color: "text-cyan-400" },
            { label: "Processed",      value: done,                                icon: "✅", color: "text-emerald-400" },
            { label: "Processing",     value: processing,                          icon: "⏳", color: "text-amber-400" },
            { label: "Report Types",   value: Object.keys(typeCounts).length,      icon: "📊", color: "text-violet-400" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800 rounded-xl p-5 border border-slate-700">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Quick actions — Primary */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Medical Records</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { href: "/upload",    label: "Upload Report",   icon: "⬆️", color: "from-cyan-600 to-cyan-800" },
            { href: "/timeline",  label: "View Timeline",   icon: "📅", color: "from-violet-600 to-violet-800" },
            { href: "/ask-ai",    label: "Ask AI",          icon: "🤖", color: "from-emerald-600 to-emerald-800" },
            { href: "/emergency", label: "Emergency QR",    icon: "🆘", color: "from-rose-600 to-rose-800" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className={`bg-gradient-to-br ${a.color} rounded-xl p-5 hover:scale-105 transition-transform border border-white/10`}>
              <div className="text-2xl mb-2">{a.icon}</div>
              <div className="font-semibold text-sm">{a.label}</div>
            </Link>
          ))}
        </div>

        {/* Quick actions — Health Tracking */}
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Health Tracking</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { href: "/vitals",       label: "Vital Signs",    icon: "❤️", color: "from-rose-700 to-rose-900" },
            { href: "/medications",  label: "Medications",    icon: "💊", color: "from-emerald-700 to-emerald-900" },
            { href: "/appointments", label: "Appointments",   icon: "🗓️", color: "from-violet-700 to-violet-900" },
            { href: "/admin",        label: "Database",       icon: "🛡️", color: "from-slate-600 to-slate-800" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className={`bg-gradient-to-br ${a.color} rounded-xl p-5 hover:scale-105 transition-transform border border-white/10`}>
              <div className="text-2xl mb-2">{a.icon}</div>
              <div className="font-semibold text-sm">{a.label}</div>
            </Link>
          ))}
        </div>

        {/* Recent Reports */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Recent Reports</h2>
          <span className="text-slate-400 text-sm">{reports.length} total</span>
        </div>

        {loading ? (
          <div className="text-slate-400">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-8 text-center text-slate-400">
            No reports yet.{" "}
            <Link href="/upload" className="text-cyan-400 hover:underline">Upload your first report →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-2xl flex-shrink-0">{STAT_ICONS[r.report_type] || "📄"}</span>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{r.original_filename}</div>
                    <div className="text-slate-400 text-sm">{r.report_date || "Date unknown"} · {r.report_type}{r.hospital_name ? ` · ${r.hospital_name}` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  {confirmId === r.id ? (
                    <div className="flex items-center gap-2 bg-slate-900 border border-rose-800 rounded-xl px-3 py-1.5">
                      <span className="text-slate-300 text-xs">Delete?</span>
                      <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-white text-xs rounded-lg font-medium transition-colors disabled:opacity-50">
                        {deletingId === r.id ? "⏳" : "Yes, delete"}
                      </button>
                      <button onClick={() => setConfirmId(null)} className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs rounded-lg font-medium transition-colors">Cancel</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(r.id)} title="Delete report" className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-900/30 rounded-lg transition-all">🗑️</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
