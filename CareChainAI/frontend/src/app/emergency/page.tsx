"use client";
import { useEffect, useState } from "react";

interface EmergencyProfile {
  name:                string;
  blood_group:         string | null;
  allergies:           string | null;
  emergency_contact:   string | null;
  current_medications: string | null;
}

interface QRData {
  token:      string;
  url:        string;
  expires_at: string;
}

function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user_name");
  window.location.href = "/";
}

function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http:// 10.157.36.194:8000/api";

function QRCode({ value }: { value: string }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(value)}`;
  return (
    <div className="bg-white p-4 rounded-2xl inline-block">
      <img src={url} alt="Emergency QR Code" width={200} height={200} className="rounded-lg" />
    </div>
  );
}

export default function EmergencyPage() {
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [qrData,  setQrData]  = useState<QRData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";
  const dob   = typeof window !== "undefined" ? localStorage.getItem("user_dob") || "" : "";

  const fetchData = () => {
    if (!token) { window.location.href = "/auth/login"; return; }
    const h = { Authorization: `Bearer ${token}` };
    Promise.all([
      fetch(`${API}/emergency/profile`, { headers: h }).then((r) => r.json()),
      fetch(`${API}/emergency/qr`,      { headers: h }).then((r) => r.json()),
    ]).then(([p, q]) => {
      setProfile(p);
      setQrData(q);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  // Build QR URL — include DOB as query param so public page can show age
  const getQrUrl = () => {
    if (!qrData) return "";
    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const base   = `${origin}/emergency/public/${qrData.token}`;
    return dob ? `${base}?dob=${dob}` : base;
  };

  const copyLink = async () => {
    await navigator.clipboard.writeText(getQrUrl());
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  const profileComplete = profile?.blood_group || profile?.allergies || profile?.emergency_contact;

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-slate-400 hover:text-white text-sm">← Dashboard</a>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center text-slate-950 font-bold text-sm">C</div>
          <span className="font-bold">CareChainAI</span>
        </div>
        <button onClick={handleLogout} className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 rounded-lg text-sm transition-all">
          🚪 Logout
        </button>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-1">Emergency Profile</h1>
        <p className="text-slate-400 text-sm mb-8">Critical health information for first responders</p>

        {loading ? (
          <div className="flex items-center gap-3 text-slate-400 py-16 justify-center">
            <div className="w-5 h-5 border-2 border-slate-600 border-t-rose-500 rounded-full animate-spin" />
            Loading...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* ── Left ── */}
            <div className="space-y-4">
              {!profileComplete && (
                <div className="bg-amber-900/30 border border-amber-700/50 rounded-xl px-4 py-3 flex items-start gap-3">
                  <span className="text-xl">⚠️</span>
                  <div>
                    <div className="text-amber-300 font-medium text-sm">Profile incomplete</div>
                    <a href="/profile" className="text-amber-400 text-xs hover:underline mt-0.5 inline-block">→ Complete profile</a>
                  </div>
                </div>
              )}

              {/* Age */}
              {dob && (
                <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex items-center gap-4">
                  <span className="text-3xl">🎂</span>
                  <div>
                    <div className="text-2xl font-bold text-cyan-400">{calculateAge(dob)} years</div>
                    <div className="text-slate-400 text-xs mt-0.5">
                      DOB: {new Date(dob).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}
                    </div>
                  </div>
                </div>
              )}

              {/* Blood group */}
              <div className="bg-rose-900/20 border border-rose-700/40 rounded-2xl p-5">
                <div className="text-slate-400 text-xs uppercase tracking-wide mb-1">🩸 Blood Group</div>
                {profile?.blood_group ? (
                  <div className="text-4xl font-bold text-rose-400">{profile.blood_group}</div>
                ) : (
                  <div className="text-slate-500 text-sm">Not set — <a href="/profile" className="text-rose-400 hover:underline">add now</a></div>
                )}
              </div>

              {/* Emergency contact */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">📞 Emergency Contact</div>
                {profile?.emergency_contact ? (
                  <div className="text-white font-medium">{profile.emergency_contact}</div>
                ) : (
                  <div className="text-slate-500 text-sm">Not set — <a href="/profile" className="text-cyan-400 hover:underline">add now</a></div>
                )}
              </div>

              {/* Allergies */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">⚠️ Known Allergies</div>
                {profile?.allergies ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.allergies.split(",").map((a) => (
                      <span key={a} className="px-3 py-1 bg-amber-900/50 border border-amber-700/50 text-amber-300 rounded-full text-xs">{a.trim()}</span>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm">None — <a href="/profile" className="text-cyan-400 hover:underline">add now</a></div>
                )}
              </div>

              {/* Medications */}
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
                <div className="text-slate-400 text-xs uppercase tracking-wide mb-2">💊 Current Medications</div>
                {profile?.current_medications ? (
                  <div className="flex flex-wrap gap-2">
                    {profile.current_medications.split(",").map((m) => (
                      <span key={m} className="px-3 py-1 bg-blue-900/50 border border-blue-700/50 text-blue-300 rounded-full text-xs">{m.trim()}</span>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 text-sm">None — <a href="/profile" className="text-cyan-400 hover:underline">add now</a></div>
                )}
              </div>

              <a href="/profile" className="block w-full text-center py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm font-medium transition-colors">
                ✏️ Edit Emergency Profile
              </a>
            </div>

            {/* ── Right: QR ── */}
            <div className="space-y-4">
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 text-center">
                <div className="text-slate-300 font-semibold mb-1">Emergency QR Code</div>
                <div className="text-slate-500 text-xs mb-5">Scan to view critical health info without login</div>

                {qrData ? (
                  <div className="flex justify-center mb-4">
                    <QRCode value={getQrUrl()} />
                  </div>
                ) : (
                  <div className="w-[200px] h-[200px] bg-slate-700 rounded-2xl mx-auto mb-4 flex items-center justify-center text-slate-500 text-sm">
                    Generating...
                  </div>
                )}

                {qrData && (
                  <div className="text-xs text-slate-500 mb-4">
                    Expires: {new Date(qrData.expires_at).toLocaleString("en-IN")}
                  </div>
                )}

                <div className="space-y-2">
                  <button onClick={copyLink} className="w-full py-2.5 bg-cyan-700 hover:bg-cyan-600 rounded-xl text-sm font-medium transition-colors">
                    {copying ? "✅ Link Copied!" : "🔗 Copy Emergency Link"}
                  </button>
                  <button onClick={fetchData} className="w-full py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium transition-colors">
                    🔄 Regenerate QR
                  </button>
                </div>
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                <div className="text-sm font-semibold mb-3">How it works</div>
                <div className="space-y-2 text-sm text-slate-400">
                  {[
                    "First responder scans your QR code",
                    "Opens read-only page with critical info",
                    "No login required for emergency access",
                    "Token expires every 24 hours for security",
                  ].map((s, i) => (
                    <div key={i} className="flex gap-2"><span className="text-rose-400 font-bold">{i + 1}.</span>{s}</div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-800/40 border border-slate-700/50 rounded-xl px-4 py-3 text-xs text-slate-500">
                🔒 HMAC-signed time-limited token. Only critical health info is visible.
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
