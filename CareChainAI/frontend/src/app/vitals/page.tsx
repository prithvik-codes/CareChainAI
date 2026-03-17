"use client";
import { useEffect, useState } from "react";

interface Vital {
  id: number;
  recorded_at: string;
  blood_pressure_sys: number | null;
  blood_pressure_dia: number | null;
  heart_rate: number | null;
  blood_sugar: number | null;
  weight: number | null;
  temperature: number | null;
  oxygen_saturation: number | null;
  notes: string | null;
}

const NORMAL_RANGES: Record<string, { min: number; max: number; unit: string }> = {
  blood_pressure_sys:  { min: 90,  max: 120, unit: "mmHg" },
  blood_pressure_dia:  { min: 60,  max: 80,  unit: "mmHg" },
  heart_rate:          { min: 60,  max: 100, unit: "bpm" },
  blood_sugar:         { min: 70,  max: 140, unit: "mg/dL" },
  weight:              { min: 0,   max: 999, unit: "kg" },
  temperature:         { min: 36,  max: 37.5, unit: "°C" },
  oxygen_saturation:   { min: 95,  max: 100, unit: "%" },
};

function getStatus(key: string, value: number) {
  const range = NORMAL_RANGES[key];
  if (!range) return "normal";
  if (value < range.min || value > range.max) return "abnormal";
  return "normal";
}

function handleLogout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

export default function VitalsPage() {
  const [vitals,   setVitals]   = useState<Vital[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    recorded_at: new Date().toISOString().split("T")[0],
    blood_pressure_sys: "", blood_pressure_dia: "",
    heart_rate: "", blood_sugar: "", weight: "",
    temperature: "", oxygen_saturation: "", notes: "",
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const fetchVitals = () => {
    fetch("http://localhost:8000/api/vitals/", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setVitals).finally(() => setLoading(false));
  };

  useEffect(() => { fetchVitals(); }, []);

  const handleSave = async () => {
    setSaving(true);
    const body: Record<string, any> = { recorded_at: form.recorded_at };
    if (form.blood_pressure_sys) body.blood_pressure_sys = parseFloat(form.blood_pressure_sys);
    if (form.blood_pressure_dia) body.blood_pressure_dia = parseFloat(form.blood_pressure_dia);
    if (form.heart_rate)         body.heart_rate         = parseFloat(form.heart_rate);
    if (form.blood_sugar)        body.blood_sugar        = parseFloat(form.blood_sugar);
    if (form.weight)             body.weight             = parseFloat(form.weight);
    if (form.temperature)        body.temperature        = parseFloat(form.temperature);
    if (form.oxygen_saturation)  body.oxygen_saturation  = parseFloat(form.oxygen_saturation);
    if (form.notes)              body.notes              = form.notes;

    await fetch("http://localhost:8000/api/vitals/", {
      method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
    setSaving(false); setShowForm(false);
    setForm({ recorded_at: new Date().toISOString().split("T")[0], blood_pressure_sys: "", blood_pressure_dia: "", heart_rate: "", blood_sugar: "", weight: "", temperature: "", oxygen_saturation: "", notes: "" });
    fetchVitals();
  };

  const handleDelete = async (id: number) => {
    await fetch(`http://localhost:8000/api/vitals/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setVitals((prev) => prev.filter((v) => v.id !== id));
  };

  // Get latest reading for summary cards
  const latest = vitals[0];

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

      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Vital Signs</h1>
            <p className="text-slate-400 text-sm">Track your health metrics over time</p>
          </div>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-semibold text-sm transition-colors">
            + Log Vitals
          </button>
        </div>

        {/* Latest readings summary */}
        {latest && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[
              { key: "blood_pressure_sys", label: "Blood Pressure", value: latest.blood_pressure_sys ? `${latest.blood_pressure_sys}/${latest.blood_pressure_dia}` : null, unit: "mmHg", icon: "❤️" },
              { key: "heart_rate",         label: "Heart Rate",     value: latest.heart_rate,    unit: "bpm",   icon: "💓" },
              { key: "blood_sugar",        label: "Blood Sugar",    value: latest.blood_sugar,   unit: "mg/dL", icon: "🩸" },
              { key: "oxygen_saturation",  label: "SpO2",           value: latest.oxygen_saturation, unit: "%", icon: "🫁" },
            ].map((s) => (
              <div key={s.key} className={`rounded-xl p-4 border ${s.value ? (getStatus(s.key, Number(String(s.value).split("/")[0])) === "abnormal" ? "bg-rose-900/30 border-rose-700" : "bg-emerald-900/30 border-emerald-700") : "bg-slate-800 border-slate-700"}`}>
                <div className="text-xl mb-1">{s.icon}</div>
                <div className="text-2xl font-bold">{s.value ?? "—"}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.label} · {s.unit}</div>
                {s.value && getStatus(s.key, Number(String(s.value).split("/")[0])) === "abnormal" && (
                  <div className="text-xs text-rose-400 mt-1">⚠️ Out of range</div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Log form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Log Vital Signs</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">📅 Date</label>
                  <input type="date" value={form.recorded_at} onChange={(e) => setForm({ ...form, recorded_at: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark]" />
                </div>
                {[
                  { key: "blood_pressure_sys", label: "❤️ Systolic BP", placeholder: "e.g. 120", unit: "mmHg" },
                  { key: "blood_pressure_dia", label: "❤️ Diastolic BP", placeholder: "e.g. 80", unit: "mmHg" },
                  { key: "heart_rate",         label: "💓 Heart Rate",   placeholder: "e.g. 72", unit: "bpm" },
                  { key: "blood_sugar",        label: "🩸 Blood Sugar",  placeholder: "e.g. 95", unit: "mg/dL" },
                  { key: "weight",             label: "⚖️ Weight",       placeholder: "e.g. 70", unit: "kg" },
                  { key: "temperature",        label: "🌡️ Temperature",  placeholder: "e.g. 36.6", unit: "°C" },
                  { key: "oxygen_saturation",  label: "🫁 SpO2",         placeholder: "e.g. 98", unit: "%" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-sm text-slate-400 mb-1 block">{f.label} <span className="text-slate-600">({f.unit})</span></label>
                    <input type="number" value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500" />
                  </div>
                ))}
                <div>
                  <label className="text-sm text-slate-400 mb-1 block">📝 Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any additional notes..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 resize-none" rows={2} />
                </div>
                <button onClick={handleSave} disabled={saving}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 py-3 rounded-xl font-semibold text-sm transition-colors">
                  {saving ? "Saving..." : "Save Vitals"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History table */}
        <h2 className="text-lg font-semibold mb-4">History</h2>
        {loading ? (
          <div className="text-slate-400">Loading...</div>
        ) : vitals.length === 0 ? (
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 text-center text-slate-400">
            <div className="text-4xl mb-3">📊</div>
            <div className="font-semibold mb-1">No vitals logged yet</div>
            <button onClick={() => setShowForm(true)} className="mt-3 px-5 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-xl text-sm font-semibold transition-colors">
              Log First Reading
            </button>
          </div>
        ) : (
          <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-9 gap-2 px-4 py-3 border-b border-slate-700 text-xs text-slate-400 uppercase tracking-wide">
              <div>Date</div><div>BP</div><div>HR</div><div>Sugar</div><div>Weight</div><div>Temp</div><div>SpO2</div><div>Notes</div><div></div>
            </div>
            {vitals.map((v) => (
              <div key={v.id} className="grid grid-cols-9 gap-2 px-4 py-3 border-b border-slate-700/50 last:border-0 items-center text-sm hover:bg-slate-700/20">
                <div className="text-slate-300 text-xs">{v.recorded_at}</div>
                <div className={v.blood_pressure_sys && (v.blood_pressure_sys > 120 || v.blood_pressure_sys < 90) ? "text-rose-400" : "text-white"}>
                  {v.blood_pressure_sys ? `${v.blood_pressure_sys}/${v.blood_pressure_dia}` : "—"}
                </div>
                <div className={v.heart_rate && (v.heart_rate > 100 || v.heart_rate < 60) ? "text-rose-400" : "text-white"}>
                  {v.heart_rate ?? "—"}
                </div>
                <div className={v.blood_sugar && (v.blood_sugar > 140 || v.blood_sugar < 70) ? "text-rose-400" : "text-white"}>
                  {v.blood_sugar ?? "—"}
                </div>
                <div>{v.weight ?? "—"}</div>
                <div className={v.temperature && (v.temperature > 37.5 || v.temperature < 36) ? "text-rose-400" : "text-white"}>
                  {v.temperature ?? "—"}
                </div>
                <div className={v.oxygen_saturation && v.oxygen_saturation < 95 ? "text-rose-400" : "text-white"}>
                  {v.oxygen_saturation ?? "—"}
                </div>
                <div className="text-slate-400 text-xs truncate">{v.notes ?? "—"}</div>
                <div>
                  <button onClick={() => handleDelete(v.id)} className="text-slate-500 hover:text-rose-400 transition-colors">🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
