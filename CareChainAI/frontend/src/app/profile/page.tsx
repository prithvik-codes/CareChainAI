"use client";
import { useEffect, useState } from "react";

interface UserProfile {
  id: number;
  name: string;
  email: string;
  role: string;
  blood_group: string | null;
  allergies: string | null;
  emergency_contact: string | null;
  current_medications: string | null;
}

function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user_name");
  window.location.href = "/";
}

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function ProfilePage() {
  const [profile,   setProfile]   = useState<UserProfile | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [saved,     setSaved]     = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "emergency" | "security">("profile");

  const [form, setForm] = useState({
    name:                "",
    date_of_birth:       "",
    blood_group:         "",
    allergies:           "",
    emergency_contact:   "",
    current_medications: "",
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const API   = process.env.NEXT_PUBLIC_API_URL || "http:// 10.157.36.194:8000/api";

  useEffect(() => {
    if (!token) { window.location.href = "/auth/login"; return; }
    fetch(`${API}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setProfile(data);
        const savedDob = localStorage.getItem("user_dob") || "";
        setForm({
          name:                data.name               || "",
          date_of_birth:       savedDob,
          blood_group:         data.blood_group        || "",
          allergies:           data.allergies          || "",
          emergency_contact:   data.emergency_contact  || "",
          current_medications: data.current_medications || "",
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch(`${API}/emergency/profile`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          blood_group:         form.blood_group         || null,
          allergies:           form.allergies           || null,
          emergency_contact:   form.emergency_contact   || null,
          current_medications: form.current_medications || null,
        }),
      });
      localStorage.setItem("user_name", form.name);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">
      <div className="w-5 h-5 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin mr-3" />
      Loading profile...
    </div>
  );

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
        {/* Profile header */}
        <div className="flex items-center gap-5 mb-8">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-600 to-violet-600 flex items-center justify-center text-3xl font-bold">
            {profile?.name?.[0]?.toUpperCase() || "P"}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{profile?.name}</h1>
            <div className="text-slate-400 text-sm mt-0.5">{profile?.email}</div>
            {form.date_of_birth && (
              <div className="text-slate-400 text-sm mt-0.5">
                🎂 Age: <span className="text-cyan-400 font-semibold">{calculateAge(form.date_of_birth)} years old</span>
              </div>
            )}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="px-2 py-0.5 bg-cyan-900/60 text-cyan-300 rounded-full text-xs capitalize">{profile?.role}</span>
              {form.blood_group && <span className="px-2 py-0.5 bg-rose-900/60 text-rose-300 rounded-full text-xs">🩸 {form.blood_group}</span>}
              {form.date_of_birth && (
                <span className="px-2 py-0.5 bg-slate-700 text-slate-300 rounded-full text-xs">
                  🎂 {calculateAge(form.date_of_birth)} yrs
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-800/60 border border-slate-700 rounded-xl p-1 mb-6">
          {[
            { key: "profile",   label: "👤 Profile"  },
            { key: "emergency", label: "🆘 Emergency" },
            { key: "security",  label: "🔒 Security"  },
          ].map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key as any)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === t.key ? "bg-slate-700 text-white" : "text-slate-400 hover:text-white"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {saved && (
          <div className="bg-emerald-900/50 border border-emerald-600 text-emerald-300 rounded-xl px-5 py-3 mb-6 flex items-center gap-2 text-sm">
            ✅ Profile saved successfully!
          </div>
        )}

        {/* ── PROFILE TAB ── */}
        {activeTab === "profile" && (
          <div className="space-y-5">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-slate-300">Personal Information</h2>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Full Name</label>
                <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">Email</label>
                <input value={profile?.email || ""} disabled
                  className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-sm text-slate-500 cursor-not-allowed" />
                <p className="text-xs text-slate-600 mt-1">Email cannot be changed</p>
              </div>
              {/* Date of Birth */}
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">🎂 Date of Birth</label>
                <input
                  type="date"
                  value={form.date_of_birth}
                  onChange={(e) => {
                    setForm({ ...form, date_of_birth: e.target.value });
                    localStorage.setItem("user_dob", e.target.value);
                  }}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500 [color-scheme:dark]"
                />
                {form.date_of_birth && (
                  <p className="text-sm text-cyan-400 mt-1">
                    🎉 Age: {calculateAge(form.date_of_birth)} years old
                  </p>
                )}
              </div>
              {/* Blood Group */}
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">🩸 Blood Group</label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map((bg) => (
                    <button key={bg} type="button" onClick={() => setForm({ ...form, blood_group: bg })}
                      className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                        form.blood_group === bg
                          ? "bg-rose-600/30 border-rose-500 text-rose-300"
                          : "bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-400"
                      }`}>
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 py-3 rounded-xl font-semibold text-sm transition-colors">
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        )}

        {/* ── EMERGENCY TAB ── */}
        {activeTab === "emergency" && (
          <div className="space-y-5">
            <div className="bg-rose-900/20 border border-rose-700/40 rounded-xl px-4 py-3 text-sm text-rose-300">
              🆘 This information is shown to first responders when your Emergency QR is scanned.
            </div>
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
              {form.date_of_birth && (
                <div className="flex items-center gap-3 bg-slate-900/60 rounded-xl px-4 py-3">
                  <span className="text-2xl">🎂</span>
                  <div>
                    <div className="text-sm font-medium">Age: {calculateAge(form.date_of_birth)} years</div>
                    <div className="text-xs text-slate-500">
                      DOB: {new Date(form.date_of_birth).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">🩸 Blood Group</label>
                <div className="grid grid-cols-4 gap-2">
                  {BLOOD_GROUPS.map((bg) => (
                    <button key={bg} type="button" onClick={() => setForm({ ...form, blood_group: bg })}
                      className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                        form.blood_group === bg
                          ? "bg-rose-600/30 border-rose-500 text-rose-300"
                          : "bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-400"
                      }`}>
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">⚠️ Known Allergies</label>
                <textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, Latex" rows={3}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 resize-none" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">📞 Emergency Contact</label>
                <input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                  placeholder="e.g. Priya Sharma — +91 98765 43210"
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">💊 Current Medications</label>
                <textarea value={form.current_medications} onChange={(e) => setForm({ ...form, current_medications: e.target.value })}
                  placeholder="e.g. Metformin 500mg, Lisinopril 10mg" rows={3}
                  className="w-full bg-slate-900 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 resize-none" />
              </div>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="w-full bg-rose-600 hover:bg-rose-500 disabled:bg-slate-700 py-3 rounded-xl font-semibold text-sm transition-colors">
              {saving ? "Saving..." : "💾 Save Emergency Profile"}
            </button>
          </div>
        )}

        {/* ── SECURITY TAB ── */}
        {activeTab === "security" && (
          <div className="space-y-4">
            <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5 space-y-4">
              <h2 className="font-semibold text-slate-300">Account Security</h2>
              <div className="flex items-center justify-between py-3 border-b border-slate-700">
                <div>
                  <div className="text-sm font-medium">Account Role</div>
                  <div className="text-xs text-slate-500 capitalize">{profile?.role}</div>
                </div>
                <span className="text-xs text-cyan-400 bg-cyan-900/40 px-3 py-1 rounded-lg capitalize">{profile?.role}</span>
              </div>
              <div className="flex items-center justify-between py-3">
                <div>
                  <div className="text-sm font-medium">JWT Session</div>
                  <div className="text-xs text-slate-500">Expires every 24 hours</div>
                </div>
                <span className="text-xs text-emerald-400 bg-emerald-900/40 px-3 py-1 rounded-lg">Active</span>
              </div>
            </div>
            <button onClick={handleLogout}
              className="w-full bg-rose-900/40 hover:bg-rose-800/60 border border-rose-700 text-rose-300 py-3 rounded-xl font-semibold text-sm transition-colors">
              🚪 Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
