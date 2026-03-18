"use client";
import { useEffect, useState } from "react";

interface Appointment {
  id: number;
  doctor_name: string;
  hospital: string | null;
  specialty: string | null;
  date: string;
  time: string | null;
  reason: string | null;
  notes: string | null;
  status: "upcoming" | "completed" | "cancelled";
}

const STATUS_STYLES: Record<string, string> = {
  upcoming:  "bg-cyan-900/60 text-cyan-300 border-cyan-700",
  completed: "bg-emerald-900/60 text-emerald-300 border-emerald-700",
  cancelled: "bg-rose-900/60 text-rose-300 border-rose-700",
};

function handleLogout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({
    doctor_name: "", hospital: "", specialty: "",
    date: "", time: "", reason: "", notes: "",
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const fetchAppts = () => {
    fetch("http://10.157.36.194:8000/api/appointments/", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json()).then(setAppointments).finally(() => setLoading(false));
  };

  useEffect(() => { fetchAppts(); }, []);

  const handleSave = async () => {
    if (!form.doctor_name || !form.date) return;
    setSaving(true);
    await fetch("http://10.157.36.194:8000/api/appointments/", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...form, hospital: form.hospital || null, specialty: form.specialty || null, time: form.time || null, reason: form.reason || null, notes: form.notes || null }),
    });
    setSaving(false); setShowForm(false);
    setForm({ doctor_name: "", hospital: "", specialty: "", date: "", time: "", reason: "", notes: "" });
    fetchAppts();
  };

  const updateStatus = async (id: number, status: string) => {
    const res = await fetch(`http://10.157.36.194:8000/api/appointments/${id}/status?status=${status}`, {
      method: "PATCH", headers: { Authorization: `Bearer ${token}` },
    });
    const updated = await res.json();
    setAppointments((prev) => prev.map((a) => a.id === id ? updated : a));
  };

  const deleteAppt = async (id: number) => {
    await fetch(`http://10.157.36.194:8000/api/appointments/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
    setAppointments((prev) => prev.filter((a) => a.id !== id));
  };

  const upcoming  = appointments.filter((a) => a.status === "upcoming");
  const past      = appointments.filter((a) => a.status !== "upcoming");

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
            <h1 className="text-3xl font-bold mb-1">Appointments</h1>
            <p className="text-slate-400 text-sm">Manage your doctor appointments</p>
          </div>
          <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl font-semibold text-sm transition-colors">
            + Book Appointment
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Upcoming",  value: upcoming.length, color: "text-cyan-400" },
            { label: "Completed", value: appointments.filter((a) => a.status === "completed").length, color: "text-emerald-400" },
            { label: "Cancelled", value: appointments.filter((a) => a.status === "cancelled").length, color: "text-rose-400" },
          ].map((s) => (
            <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-4 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-slate-400 text-sm">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Book form modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Book Appointment</h2>
                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white text-xl">✕</button>
              </div>
              <div className="space-y-3">
                {[
                  { key: "doctor_name", label: "👨‍⚕️ Doctor Name",    placeholder: "Dr. Sharma",         required: true },
                  { key: "hospital",    label: "🏥 Hospital/Clinic", placeholder: "City Medical Center" },
                  { key: "specialty",   label: "🩺 Specialty",       placeholder: "Cardiologist" },
                  { key: "reason",      label: "📋 Reason",          placeholder: "Routine checkup" },
                  { key: "notes",       label: "📝 Notes",           placeholder: "Any preparation notes" },
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
                    <label className="text-sm text-slate-400 mb-1 block">📅 Date <span className="text-cyan-400">*</span></label>
                    <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark]" />
                  </div>
                  <div>
                    <label className="text-sm text-slate-400 mb-1 block">⏰ Time</label>
                    <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })}
                      className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark]" />
                  </div>
                </div>
                <button onClick={handleSave} disabled={saving || !form.doctor_name || !form.date}
                  className="w-full bg-violet-600 hover:bg-violet-500 disabled:bg-slate-700 py-3 rounded-xl font-semibold text-sm transition-colors">
                  {saving ? "Booking..." : "Book Appointment"}
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? <div className="text-slate-400">Loading...</div> : (
          <>
            {/* Upcoming */}
            {upcoming.length > 0 && (
              <div className="mb-6">
                <h2 className="text-base font-semibold mb-3 text-cyan-400">📅 Upcoming</h2>
                <div className="space-y-3">
                  {upcoming.map((a) => (
                    <div key={a.id} className="bg-slate-800 border border-cyan-700/40 rounded-2xl p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-lg">👨‍⚕️</span>
                            <span className="font-semibold">{a.doctor_name}</span>
                            {a.specialty && <span className="text-xs bg-violet-900/60 text-violet-300 px-2 py-0.5 rounded-full">{a.specialty}</span>}
                          </div>
                          {a.hospital && <div className="text-sm text-slate-400">🏥 {a.hospital}</div>}
                          <div className="text-sm text-cyan-400 mt-1">📅 {a.date}{a.time ? ` at ${a.time}` : ""}</div>
                          {a.reason && <div className="text-xs text-slate-500 mt-1">📋 {a.reason}</div>}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button onClick={() => updateStatus(a.id, "completed")} className="px-3 py-1 bg-emerald-700 hover:bg-emerald-600 text-xs rounded-lg transition-colors">✅ Done</button>
                          <button onClick={() => updateStatus(a.id, "cancelled")} className="px-3 py-1 bg-rose-700 hover:bg-rose-600 text-xs rounded-lg transition-colors">✕ Cancel</button>
                          <button onClick={() => deleteAppt(a.id)} className="text-slate-500 hover:text-rose-400 text-xs transition-colors">🗑️</button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Past */}
            {past.length > 0 && (
              <div>
                <h2 className="text-base font-semibold mb-3 text-slate-400">📁 Past</h2>
                <div className="space-y-2">
                  {past.map((a) => (
                    <div key={a.id} className="bg-slate-800/50 border border-slate-700 rounded-2xl p-4 flex items-center justify-between opacity-70">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{a.doctor_name}</span>
                          <span className={`px-2 py-0.5 rounded-full text-xs border ${STATUS_STYLES[a.status]}`}>{a.status}</span>
                        </div>
                        <div className="text-xs text-slate-500 mt-0.5">{a.date}</div>
                      </div>
                      <button onClick={() => deleteAppt(a.id)} className="text-slate-500 hover:text-rose-400 transition-colors">🗑️</button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {appointments.length === 0 && (
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-10 text-center text-slate-400">
                <div className="text-4xl mb-3">📅</div>
                <div className="font-semibold mb-1">No appointments yet</div>
                <button onClick={() => setShowForm(true)} className="mt-3 px-5 py-2 bg-violet-600 hover:bg-violet-500 rounded-xl text-sm font-semibold transition-colors">Book First Appointment</button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
