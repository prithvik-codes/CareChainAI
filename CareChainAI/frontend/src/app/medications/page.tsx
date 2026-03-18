"use client";
import { useEffect, useState } from "react";

interface Medication {
  id: number;
  name: string;
  dosage: string;
  frequency: string;
  start_date: string;
  end_date: string | null;
  prescribed_by: string | null;
  notes: string | null;
  is_active: boolean;
}

function handleLogout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

export default function MedicationsPage() {
  const [meds,     setMeds]     = useState<Medication[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    name: "", dosage: "", frequency: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "", prescribed_by: "", notes: "",
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const fetchMeds = () => {
    fetch("http://10.157.36.194:8000/api/medications/", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setMeds).finally(() => setLoading(false));
  };

  useEffect(() => { fetchMeds(); }, []);

  const handleSave = async () => {
    if (!form.name || !form.dosage || !form.frequency) return;
    setSaving(true);
    await fetch("http://10.157.36.194:8000/api/medications/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, end_date: form.end_date || null }),
    });
    setSaving(false); setShowForm(false);
    setForm({ name: "", dosage: "", frequency: "", start_date: new Date().toISOString().split("T")[0], end_date: "", prescribed_by: "", notes: "" });
    fetchMeds();
  };

  const toggleActive = async (id: number) => {
    const res = await fetch(`http://10.157.36.194:8000/api/medications/${id}/toggle`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` },
    });
    const updated = await res.json();
    setMeds((prev) => prev.map((m) => m.id === id ? updated : m));
  };

  const deleteMed = async (id: number) => {
    await fetch(`http://10.157.36.194:8000/api/medications/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setMeds((prev) => prev.filter((m) => m.id !== id));
  };

  const active   = meds.filter((m) => m.is_active);
  const inactive = meds.filter((m) => !m.is_active);

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

      <div className="max-w-3xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Medications</h1>
            <p className="text-slate-400 text-sm">Track your current and past medications</p>
          </div>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-semibold text-sm transition-colors">
            + Add Medication
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-emerald-900/30 border border-emerald-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-emerald-400">{active.length}</div>
            <div className="text-slate-400 text-sm">Active Medications</div>
          </div>
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <div className="text-2xl font-bold text-slate-400">{inactive.length}</div>
            <div className="text-slate-400 text-sm">Past Medications</div>
          </div>
        </div>

        {/* Add form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Add Medication</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>
              <div className="space-y-3">
                {[
                  { key: "name",          label: "💊 Medication Name",  placeholder: "e.g. Metformin", required: true },
                  { key: "dosage",        label: "⚖️ Dosage",           placeholder: "e.g. 500mg",    required: true },
                  { key: "frequency",     label: "🔁 Frequency",        placeholder: "e.g. Twice daily", required: true },
                  { key: "prescribed_by", label: "👨‍⚕️ Prescribed By",  placeholder: "e.g. Dr. Sharma" },
                  { key: "notes",         label: "📝 Notes",            placeholder: "Any instructions..." },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="text-sm text-slate-400 mb-1 block">{f.label}{f.required && <span className="text-cyan-400 ml-1">*</span>}</label>
                    <input value={(form as any)[f.key]} onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                      placeholder={f.placeholder}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500" />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">📅 Start Date</label>
                    <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">📅 End Date</label>
                    <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark]" />
                  </div>
                </div>
                <button onClick={handleSave} disabled={saving || !form.name || !form.dosage || !form.frequency}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 py-3 rounded-xl font-semibold text-sm transition-colors">
                  {saving ? "Saving..." : "Add Medication"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? <div className="text-slate-400">Loading...</div> : (
          <>
            {/* Active medications */}
            {active.length > 0 && (
              <div className="mb-6">
                <h2 className="text-base font-semibold mb-3 text-emerald-400">✅ Active</h2>
                <div className="space-y-3">
                  {active.map((m) => (
                    <div key={m.id} className="bg-slate-800 border border-emerald-700/40 rounded-2xl p-4 flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">💊</span>
                          <span className="font-semibold">{m.name}</span>
                          <span className="text-xs bg-emerald-900/60 text-emerald-300 px-2 py-0.5 rounded-full">{m.dosage}</span>
                        </div>
                        <div className="text-sm text-slate-400">{m.frequency}</div>
                        {m.prescribed_by && <div className="text-xs text-slate-500 mt-1">👨‍⚕️ {m.prescribed_by}</div>}
                        <div className="text-xs text-slate-500 mt-1">Since {m.start_date}{m.end_date ? ` → ${m.end_date}` : ""}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toggleActive(m.id)} className="px-3 py-1 bg-slate-700 hover:bg-amber-900 text-xs rounded-lg transition-colors" title="Mark as inactive">⏸</button>
                        <button onClick={() => deleteMed(m.id)} className="text-slate-500 hover:text-rose-400 transition-colors">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Inactive medications */}
            {inactive.length > 0 && (
              <div>
                <h2 className="text-base font-semibold mb-3 text-slate-400">📁 Past</h2>
                <div className="space-y-2">
                  {inactive.map((m) => (
                    <div key={m.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-start justify-between gap-4 opacity-60">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{m.name}</span>
                          <span className="text-xs bg-slate-700 text-slate-400 px-2 py-0.5 rounded-full">{m.dosage}</span>
                        </div>
                        <div className="text-xs text-slate-500">{m.start_date}{m.end_date ? ` → ${m.end_date}` : ""}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => toggleActive(m.id)} className="px-3 py-1 bg-slate-700 hover:bg-emerald-900 text-xs rounded-lg transition-colors" title="Mark as active">▶</button>
                        <button onClick={() => deleteMed(m.id)} className="text-slate-500 hover:text-rose-400 transition-colors">🗑️</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {meds.length === 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 text-center text-slate-400">
                <div className="text-4xl mb-3">💊</div>
                <div className="font-semibold mb-1">No medications added yet</div>
                <button onClick={() => setShowForm(true)} className="mt-3 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl text-sm font-semibold transition-colors">Add First Medication</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
