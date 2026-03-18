"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

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

interface Medication { is_active: boolean; }
interface Appointment { status: string; date: string; }
interface Report { status: string; }

function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user_name");
  window.location.href = "/";
}

function scoreVital(key: string, value: number): number {
  const ranges: Record<string, [number, number, number, number]> = {
    blood_pressure_sys:  [90,  120, 130, 140],
    blood_pressure_dia:  [60,  80,  85,  90],
    heart_rate:          [60,  100, 110, 120],
    blood_sugar:         [70,  140, 180, 200],
    temperature:         [36,  37.5, 38, 39],
    oxygen_saturation:   [95,  100, 100, 100],
  };
  const r = ranges[key];
  if (!r) return 100;
  if (value >= r[0] && value <= r[1]) return 100;
  if (value >= r[1] && value <= r[2]) return 70;
  if (value >= r[2] && value <= r[3]) return 40;
  return 20;
}

function getScoreColor(score: number) {
  if (score >= 80) return { text: "text-emerald-400", bg: "bg-emerald-500", label: "Excellent", ring: "stroke-emerald-400" };
  if (score >= 60) return { text: "text-yellow-400",  bg: "bg-yellow-500",  label: "Good",      ring: "stroke-yellow-400" };
  if (score >= 40) return { text: "text-orange-400",  bg: "bg-orange-500",  label: "Fair",      ring: "stroke-orange-400" };
  return               { text: "text-rose-400",    bg: "bg-rose-500",    label: "Poor",      ring: "stroke-rose-400" };
}

export default function HealthScorePage() {
  const [vitals,       setVitals]       = useState<Vital[]>([]);
  const [medications,  setMedications]  = useState<Medication[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [reports,      setReports]      = useState<Report[]>([]);
  const [loading,      setLoading]      = useState(true);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  useEffect(() => {
    if (!token) { window.location.href = "/auth/login"; return; }
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch("http://10.157.36.194:8000/api/vitals/",       { headers: h }).then((r) => r.json()),
      fetch("http://10.157.36.194:8000/api/medications/",  { headers: h }).then((r) => r.json()),
      fetch("http://10.157.36.194:8000/api/appointments/", { headers: h }).then((r) => r.json()),
      fetch("http://10.157.36.194:8000/api/reports/",      { headers: h }).then((r) => r.json()),
    ]).then(([v, m, a, rp]) => {
      setVitals(Array.isArray(v) ? v : []);
      setMedications(Array.isArray(m) ? m : []);
      setAppointments(Array.isArray(a) ? a : []);
      setReports(Array.isArray(rp) ? rp : []);
    }).finally(() => setLoading(false));
  }, []);

  // ── Score calculation ──────────────────────────────────────────────────────
  const latest = vitals[0];
  const vitalScores: { label: string; score: number; value: string; icon: string }[] = [];

  if (latest) {
    if (latest.blood_pressure_sys) vitalScores.push({ label: "Blood Pressure", score: scoreVital("blood_pressure_sys", latest.blood_pressure_sys), value: `${latest.blood_pressure_sys}/${latest.blood_pressure_dia}`, icon: "❤️" });
    if (latest.heart_rate)         vitalScores.push({ label: "Heart Rate",     score: scoreVital("heart_rate",         latest.heart_rate),         value: `${latest.heart_rate} bpm`,   icon: "💓" });
    if (latest.blood_sugar)        vitalScores.push({ label: "Blood Sugar",    score: scoreVital("blood_sugar",        latest.blood_sugar),        value: `${latest.blood_sugar} mg/dL`, icon: "🩸" });
    if (latest.oxygen_saturation)  vitalScores.push({ label: "Oxygen (SpO2)", score: scoreVital("oxygen_saturation",  latest.oxygen_saturation),  value: `${latest.oxygen_saturation}%`, icon: "🫁" });
    if (latest.temperature)        vitalScores.push({ label: "Temperature",   score: scoreVital("temperature",        latest.temperature),        value: `${latest.temperature}°C`,      icon: "🌡️" });
  }

  const activeMeds       = medications.filter((m) => m.is_active).length;
  const upcomingAppts    = appointments.filter((a) => a.status === "upcoming").length;
  const processedReports = reports.filter((r) => r.status === "done").length;

  // Weighted score
  const vitalAvg     = vitalScores.length > 0 ? vitalScores.reduce((s, v) => s + v.score, 0) / vitalScores.length : 0;
  const recordScore  = Math.min(processedReports * 20, 100);
  const medScore     = activeMeds > 0 ? 80 : 100;
  const apptScore    = upcomingAppts > 0 ? 100 : 60;

  const overallScore = vitalScores.length > 0
    ? Math.round(vitalAvg * 0.5 + recordScore * 0.2 + medScore * 0.15 + apptScore * 0.15)
    : Math.round(recordScore * 0.4 + medScore * 0.3 + apptScore * 0.3);

  const scoreStyle = getScoreColor(overallScore);

  // SVG circle progress
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const progress = ((100 - overallScore) / 100) * circumference;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-slate-400 hover:text-white text-sm">← Dashboard</a>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center text-slate-950 font-bold text-sm">C</div>
          <span className="font-bold">CareChainAI</span>
        </div>
        <button onClick={handleLogout} className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 rounded-lg text-sm transition-all">🚪 Logout</button>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-1">Health Score</h1>
        <p className="text-slate-400 text-sm mb-8">Your overall health rating based on vitals, records and appointments</p>

        {loading ? (
          <div className="flex items-center gap-3 text-slate-400 py-16 justify-center">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
            Calculating your health score...
          </div>
        ) : (
          <>
            {/* Main score card */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-3xl p-8 mb-8 flex flex-col md:flex-row items-center gap-8">
              {/* Circle gauge */}
              <div className="relative flex-shrink-0">
                <svg width="180" height="180" className="rotate-[-90deg]">
                  <circle cx="90" cy="90" r={radius} fill="none" stroke="#1e293b" strokeWidth="12" />
                  <circle
                    cx="90" cy="90" r={radius} fill="none"
                    strokeWidth="12" strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={progress}
                    className={`${scoreStyle.ring} transition-all duration-1000`}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className={`text-5xl font-bold ${scoreStyle.text}`}>{overallScore}</div>
                  <div className={`text-sm font-medium ${scoreStyle.text}`}>{scoreStyle.label}</div>
                  <div className="text-slate-500 text-xs">out of 100</div>
                </div>
              </div>

              {/* Score breakdown */}
              <div className="flex-1 w-full">
                <h2 className="text-lg font-semibold mb-4">Score Breakdown</h2>
                <div className="space-y-3">
                  {[
                    { label: "Vital Signs",       score: Math.round(vitalAvg),  weight: "50%", icon: "❤️" },
                    { label: "Medical Records",   score: recordScore,            weight: "20%", icon: "📄" },
                    { label: "Medications",       score: medScore,               weight: "15%", icon: "💊" },
                    { label: "Appointments",      score: apptScore,              weight: "15%", icon: "🗓️" },
                  ].map((item) => (
                    <div key={item.label}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2 text-sm">
                          <span>{item.icon}</span>
                          <span className="text-slate-300">{item.label}</span>
                          <span className="text-slate-600 text-xs">({item.weight})</span>
                        </div>
                        <span className={`text-sm font-bold ${getScoreColor(item.score).text}`}>{item.score}</span>
                      </div>
                      <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${getScoreColor(item.score).bg} rounded-full transition-all duration-700`}
                          style={{ width: `${item.score}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Vital breakdown */}
            {vitalScores.length > 0 ? (
              <div className="mb-8">
                <h2 className="text-lg font-semibold mb-4">Vital Signs Detail</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {vitalScores.map((v) => (
                    <div key={v.label} className={`border rounded-2xl p-4 ${v.score >= 80 ? "border-emerald-700/40 bg-emerald-900/10" : v.score >= 60 ? "border-yellow-700/40 bg-yellow-900/10" : "border-rose-700/40 bg-rose-900/10"}`}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xl">{v.icon}</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${getScoreColor(v.score).text} bg-slate-900/60`}>{v.score}/100</span>
                      </div>
                      <div className="font-semibold text-sm">{v.value}</div>
                      <div className="text-slate-400 text-xs mt-0.5">{v.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-amber-900/20 border border-amber-700/40 rounded-2xl p-5 mb-8 flex items-center gap-4">
                <span className="text-3xl">⚠️</span>
                <div>
                  <div className="font-semibold text-amber-300">No vital signs logged yet</div>
                  <div className="text-slate-400 text-sm">Log your vitals to get a more accurate health score.</div>
                  <Link href="/vitals" className="text-cyan-400 text-sm hover:underline mt-1 inline-block">→ Log Vitals</Link>
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
              <h2 className="font-semibold mb-4">💡 Recommendations</h2>
              <div className="space-y-3">
                {vitalScores.length === 0 && <div className="flex gap-3 text-sm"><span className="text-amber-400">→</span><span className="text-slate-300">Log your vital signs regularly for an accurate health score</span></div>}
                {processedReports === 0 && <div className="flex gap-3 text-sm"><span className="text-amber-400">→</span><span className="text-slate-300">Upload medical reports to track your health history</span></div>}
                {upcomingAppts === 0 && <div className="flex gap-3 text-sm"><span className="text-amber-400">→</span><span className="text-slate-300">Schedule a routine checkup appointment</span></div>}
                {activeMeds > 0 && <div className="flex gap-3 text-sm"><span className="text-cyan-400">✓</span><span className="text-slate-300">You have {activeMeds} active medication{activeMeds > 1 ? "s" : ""} — stay consistent</span></div>}
                {overallScore >= 80 && <div className="flex gap-3 text-sm"><span className="text-emerald-400">✓</span><span className="text-slate-300">Excellent health score! Keep up the good habits.</span></div>}
                <div className="text-xs text-slate-500 pt-2 border-t border-slate-700">⚠️ This score is for informational purposes only. Always consult your doctor.</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
