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

interface Vital {
  recorded_at: string;
  blood_pressure_sys: number | null;
  blood_pressure_dia: number | null;
  heart_rate: number | null;
  blood_sugar: number | null;
  weight: number | null;
  temperature: number | null;
  oxygen_saturation: number | null;
}

interface Medication { name: string; dosage: string; is_active: boolean; }
interface Appointment { doctor_name: string; date: string; time: string | null; status: string; }

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

function isAbnormal(key: string, value: number): boolean {
  const ranges: Record<string, [number, number]> = {
    blood_pressure_sys: [90, 120],
    blood_pressure_dia: [60, 80],
    heart_rate:         [60, 100],
    blood_sugar:        [70, 140],
    oxygen_saturation:  [95, 100],
  };
  const r = ranges[key];
  if (!r) return false;
  return value < r[0] || value > r[1];
}

export default function DashboardPage() {
  const [reports,      setReports]      = useState<ReportOut[]>([]);
  const [vitals,       setVitals]       = useState<Vital[]>([]);
  const [medications,  setMedications]  = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [userName,     setUserName]     = useState("Patient");
  const [deletingId,   setDeletingId]   = useState<number | null>(null);
  const [confirmId,    setConfirmId]    = useState<number | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = localStorage.getItem("role");
    const name  = localStorage.getItem("user_name");
    if (!token) { window.location.href = "/auth/login"; return; }
    if (role === "doctor") { window.location.href = "/doctor"; return; }
    if (name) setUserName(name);

    // Redirect new users to onboarding
    const onboarded = localStorage.getItem("onboarding_done");
    if (!onboarded) { window.location.href = "/onboarding"; return; }

    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("http://10.157.36.194:8000/api/reports/",      { headers: h }).then((r) => r.json()),
      fetch("http://10.157.36.194:8000/api/vitals/",       { headers: h }).then((r) => r.json()),
      fetch("http://10.157.36.194:8000/api/medications/",  { headers: h }).then((r) => r.json()),
      fetch("http://10.157.36.194:8000/api/appointments/", { headers: h }).then((r) => r.json()),
    ]).then(([rp, v, m, a]) => {
      setReports(Array.isArray(rp) ? rp : []);
      setVitals(Array.isArray(v) ? v : []);
      setMedications(Array.isArray(m) ? m : []);
      setAppointments(Array.isArray(a) ? a : []);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id: number) => {
    setDeletingId(id);
    const token = localStorage.getItem("token");
    const res = await fetch(`http://10.157.36.194:8000/api/reports/${id}`, {
      method: "DELETE", headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok || res.status === 204) setReports((prev) => prev.filter((r) => r.id !== id));
    setDeletingId(null); setConfirmId(null);
  };

  const done        = reports.filter((r) => r.status === "done").length;
  const processing  = reports.filter((r) => r.status === "processing" || r.status === "pending").length;
  const activeMeds  = medications.filter((m) => m.is_active);
  const nextAppt    = appointments.find((a) => a.status === "upcoming");
  const latestVital = vitals[0];
  const typeCounts  = reports.reduce((acc, r) => { acc[r.report_type] = (acc[r.report_type] || 0) + 1; return acc; }, {} as Record<string, number>);

  // Same calculation as health-score page
function scoreVital(key: string, value: number): number {
  const ranges: Record<string, [number, number, number, number]> = {
    blood_pressure_sys:  [90,  120, 130, 140],
    blood_pressure_dia:  [60,  80,  85,  90],
    heart_rate:          [60,  100, 110, 120],
    blood_sugar:         [70,  140, 180, 200],
    temperature:         [36,  37.5, 38,  39],
    oxygen_saturation:   [95,  100, 100, 100],
  };
  const r = ranges[key];
  if (!r) return 100;
  if (value >= r[0] && value <= r[1]) return 100;
  if (value >= r[1] && value <= r[2]) return 70;
  if (value >= r[2] && value <= r[3]) return 40;
  return 20;
}

const vitalScores: number[] = [];
if (latestVital) {
  if (latestVital.blood_pressure_sys) vitalScores.push(scoreVital("blood_pressure_sys", latestVital.blood_pressure_sys));
  if (latestVital.heart_rate)         vitalScores.push(scoreVital("heart_rate",         latestVital.heart_rate));
  if (latestVital.blood_sugar)        vitalScores.push(scoreVital("blood_sugar",         latestVital.blood_sugar));
  if (latestVital.oxygen_saturation)  vitalScores.push(scoreVital("oxygen_saturation",  latestVital.oxygen_saturation));
  if (latestVital.temperature)        vitalScores.push(scoreVital("temperature",        latestVital.temperature));
}

const vitalAvg    = vitalScores.length > 0 ? vitalScores.reduce((s, v) => s + v, 0) / vitalScores.length : 0;
const recordScore = Math.min(done * 20, 100);
const medScore    = activeMeds.length > 0 ? 80 : 100;
const apptScore   = nextAppt ? 100 : 60;

const healthScore = vitalScores.length > 0
  ? Math.round(vitalAvg * 0.5 + recordScore * 0.2 + medScore * 0.15 + apptScore * 0.15)
  : Math.round(recordScore * 0.4 + medScore * 0.3 + apptScore * 0.3);

  const scoreColor = healthScore >= 70 ? "text-emerald-400" : healthScore >= 50 ? "text-yellow-400" : "text-rose-400";
  const scoreBg    = healthScore >= 70 ? "from-emerald-900/40 to-emerald-900/10 border-emerald-700/40" : healthScore >= 50 ? "from-yellow-900/40 to-yellow-900/10 border-yellow-700/40" : "from-rose-900/40 to-rose-900/10 border-rose-700/40";

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-6xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Good day, {userName} 👋</h1>
            <p className="text-slate-400 text-sm mt-0.5">Here's your health overview</p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-sm transition-all">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-600 to-violet-600 flex items-center justify-center text-xs font-bold">
                {userName[0]?.toUpperCase()}
              </div>
              Profile
            </Link>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-rose-900 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 rounded-xl text-sm transition-all">
              🚪 Logout
            </button>
          </div>
        </div>

        {/* ── Health summary row ── */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">

          {/* Health Score */}
          <Link href="/health-score" className={`bg-gradient-to-br ${scoreBg} border rounded-2xl p-5 hover:scale-105 transition-transform`}>
            <div className="text-slate-400 text-xs mb-1 uppercase tracking-wide">Health Score</div>
            <div className={`text-4xl font-bold ${scoreColor}`}>{healthScore}</div>
            <div className="text-slate-400 text-xs mt-1">out of 100 · tap for details</div>
          </Link>

          {/* Latest vitals */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
            <div className="text-slate-400 text-xs mb-2 uppercase tracking-wide">Latest Vitals</div>
            {latestVital ? (
              <div className="space-y-1">
                {latestVital.blood_pressure_sys && (
                  <div className={`flex justify-between text-sm ${isAbnormal("blood_pressure_sys", latestVital.blood_pressure_sys) ? "text-rose-400" : "text-white"}`}>
                    <span>❤️ BP</span>
                    <span className="font-medium">{latestVital.blood_pressure_sys}/{latestVital.blood_pressure_dia}</span>
                  </div>
                )}
                {latestVital.heart_rate && (
                  <div className={`flex justify-between text-sm ${isAbnormal("heart_rate", latestVital.heart_rate) ? "text-rose-400" : "text-white"}`}>
                    <span>💓 HR</span>
                    <span className="font-medium">{latestVital.heart_rate} bpm</span>
                  </div>
                )}
                {latestVital.blood_sugar && (
                  <div className={`flex justify-between text-sm ${isAbnormal("blood_sugar", latestVital.blood_sugar) ? "text-rose-400" : "text-white"}`}>
                    <span>🩸 Sugar</span>
                    <span className="font-medium">{latestVital.blood_sugar}</span>
                  </div>
                )}
                <Link href="/vitals" className="text-xs text-cyan-400 hover:underline block mt-1">View all →</Link>
              </div>
            ) : (
              <Link href="/vitals" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                + Log your vitals
              </Link>
            )}
          </div>

          {/* Active medications */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
            <div className="text-slate-400 text-xs mb-2 uppercase tracking-wide">Active Medications</div>
            {activeMeds.length > 0 ? (
              <div className="space-y-1">
                {activeMeds.slice(0, 2).map((m) => (
                  <div key={m.name} className="text-sm flex items-center gap-1">
                    <span>💊</span>
                    <span className="text-white truncate">{m.name}</span>
                    <span className="text-slate-500 text-xs">{m.dosage}</span>
                  </div>
                ))}
                {activeMeds.length > 2 && <div className="text-xs text-slate-500">+{activeMeds.length - 2} more</div>}
                <Link href="/medications" className="text-xs text-cyan-400 hover:underline block mt-1">Manage →</Link>
              </div>
            ) : (
              <Link href="/medications" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                + Add medication
              </Link>
            )}
          </div>

          {/* Next appointment */}
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4">
            <div className="text-slate-400 text-xs mb-2 uppercase tracking-wide">Next Appointment</div>
            {nextAppt ? (
              <div>
                <div className="text-sm font-medium text-white">👨‍⚕️ {nextAppt.doctor_name}</div>
                <div className="text-cyan-400 text-sm mt-1">📅 {nextAppt.date}{nextAppt.time ? ` · ${nextAppt.time}` : ""}</div>
                <Link href="/appointments" className="text-xs text-cyan-400 hover:underline block mt-1">View all →</Link>
              </div>
            ) : (
              <Link href="/appointments" className="text-sm text-slate-400 hover:text-cyan-400 transition-colors">
                + Book appointment
              </Link>
            )}
          </div>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: "Total Records",  value: reports.length,                 icon: "📁", color: "text-cyan-400" },
            { label: "Processed",      value: done,                           icon: "✅", color: "text-emerald-400" },
            { label: "Processing",     value: processing,                     icon: "⏳", color: "text-amber-400" },
            { label: "Report Types",   value: Object.keys(typeCounts).length, icon: "📊", color: "text-violet-400" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800 rounded-xl p-4 border border-slate-700">
              <div className="text-xl mb-1">{s.icon}</div>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Quick actions ── */}
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Medical Records</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {[
            { href: "/upload",       label: "Upload Report",  icon: "⬆️", color: "from-cyan-600 to-cyan-800" },
            { href: "/timeline",     label: "View Timeline",  icon: "📅", color: "from-violet-600 to-violet-800" },
            { href: "/ask-ai",       label: "Ask AI",         icon: "🤖", color: "from-emerald-600 to-emerald-800" },
            { href: "/emergency",    label: "Emergency QR",   icon: "🆘", color: "from-rose-600 to-rose-800" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className={`bg-gradient-to-br ${a.color} rounded-xl p-4 hover:scale-105 transition-transform border border-white/10`}>
              <div className="text-xl mb-1.5">{a.icon}</div>
              <div className="font-semibold text-sm">{a.label}</div>
            </Link>
          ))}
        </div>

        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Health Tracking</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {[
            { href: "/vitals",        label: "Vital Signs",   icon: "❤️", color: "from-rose-700 to-rose-900" },
            { href: "/medications",   label: "Medications",   icon: "💊", color: "from-emerald-700 to-emerald-900" },
            { href: "/appointments",  label: "Appointments",  icon: "🗓️", color: "from-violet-700 to-violet-900" },
            { href: "/health-score",  label: "Health Score",  icon: "📈", color: "from-amber-700 to-amber-900" },
          ].map((a) => (
            <Link key={a.href} href={a.href} className={`bg-gradient-to-br ${a.color} rounded-xl p-4 hover:scale-105 transition-transform border border-white/10`}>
              <div className="text-xl mb-1.5">{a.icon}</div>
              <div className="font-semibold text-sm">{a.label}</div>
            </Link>
          ))}
        </div>

        {/* ── Recent Reports ── */}
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">Recent Reports</h2>
          <span className="text-slate-500 text-sm">{reports.length} total</span>
        </div>

        {loading ? (
          <div className="text-slate-400 text-sm">Loading...</div>
        ) : reports.length === 0 ? (
          <div className="bg-slate-800 rounded-2xl p-8 text-center">
            <div className="text-4xl mb-3">📄</div>
            <div className="text-slate-300 font-medium mb-1">No reports yet</div>
            <p className="text-slate-500 text-sm mb-4">Upload your first medical report to get started</p>
            <Link href="/upload" className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-semibold transition-colors">
              ⬆️ Upload First Report
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {reports.slice(0, 6).map((r) => (
              <div key={r.id} className="bg-slate-800 rounded-xl p-4 border border-slate-700/50 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-xl flex-shrink-0">{STAT_ICONS[r.report_type] || "📄"}</span>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{r.original_filename}</div>
                    <div className="text-slate-400 text-xs">{r.report_date || "Date unknown"} · {r.report_type}{r.hospital_name ? ` · ${r.hospital_name}` : ""}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[r.status]}`}>{r.status}</span>
                  {confirmId === r.id ? (
                    <div className="flex items-center gap-1.5">
                      <button onClick={() => handleDelete(r.id)} disabled={deletingId === r.id} className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white text-xs rounded-lg transition-colors">
                        {deletingId === r.id ? "..." : "Delete"}
                      </button>
                      <button onClick={() => setConfirmId(null)} className="px-2.5 py-1 bg-slate-700 text-slate-300 text-xs rounded-lg transition-colors">No</button>
                    </div>
                  ) : (
                    <button onClick={() => setConfirmId(r.id)} className="p-1.5 text-slate-600 hover:text-rose-400 transition-colors">🗑️</button>
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
