"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

interface EmergencyProfile {
  name:                string;
  blood_group:         string | null;
  allergies:           string | null;
  emergency_contact:   string | null;
  current_medications: string | null;
}

const API = process.env.NEXT_PUBLIC_API_URL || "http:// 10.157.36.194:8000/api";

function calculateAge(dob: string): number {
  const today = new Date();
  const birth = new Date(dob);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export default function PublicEmergencyPage() {
  const params    = useParams();
  const token     = params?.token as string;
  const [profile, setProfile] = useState<EmergencyProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // Age from QR URL param or localStorage fallback
  const [patientAge, setPatientAge] = useState<number | null>(null);
  const [patientDob, setPatientDob] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;

    // Try to get DOB from URL search params
    const urlParams = new URLSearchParams(window.location.search);
    const dobParam  = urlParams.get("dob");
    if (dobParam) {
      setPatientDob(dobParam);
      setPatientAge(calculateAge(dobParam));
    }

    fetch(`${API}/emergency/public/${token}`)
      .then((r) => { if (!r.ok) throw new Error("Invalid or expired token"); return r.json(); })
      .then(setProfile)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return (
    <div className="min-h-screen bg-red-950 flex items-center justify-center text-white">
      <div className="w-6 h-6 border-2 border-red-700 border-t-white rounded-full animate-spin mr-3" />
      Loading emergency profile...
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white px-4">
      <div className="text-center">
        <div className="text-5xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-2">Link Expired</h1>
        <p className="text-slate-400">This emergency QR code has expired or is invalid.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-red-950 text-white">
      <div className="bg-red-600 px-6 py-4 text-center">
        <div className="text-2xl font-bold">🚨 MEDICAL EMERGENCY INFORMATION</div>
        <div className="text-red-100 text-sm mt-1">Read-only · For first responders only</div>
      </div>

      <div className="max-w-lg mx-auto px-6 py-8 space-y-4">

        {/* Patient name + age */}
        <div className="bg-red-900/50 border border-red-700 rounded-2xl p-5">
          <div className="text-red-300 text-xs uppercase tracking-wide mb-1">Patient</div>
          <div className="text-3xl font-bold">{profile?.name}</div>
          {(patientAge || patientDob) && (
            <div className="flex items-center gap-4 mt-2 flex-wrap">
              {patientAge && (
                <div className="flex items-center gap-1.5">
                  <span className="text-red-300 text-sm">🎂 Age:</span>
                  <span className="text-white font-bold text-xl">{patientAge} years</span>
                </div>
              )}
              {patientDob && (
                <span className="text-red-300 text-sm">
                  DOB: {new Date(patientDob).toLocaleDateString("en-IN", {
                    day: "numeric", month: "long", year: "numeric"
                  })}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Blood group */}
        <div className="bg-red-800/60 border-2 border-red-500 rounded-2xl p-6 text-center">
          <div className="text-red-300 text-xs uppercase tracking-wide mb-2">🩸 Blood Group</div>
          <div className="text-6xl font-bold text-white">{profile?.blood_group || "Unknown"}</div>
        </div>

        {/* Allergies */}
        <div className="bg-red-900/40 border border-red-700/60 rounded-2xl p-5">
          <div className="text-red-300 text-xs uppercase tracking-wide mb-3">⚠️ Known Allergies</div>
          {profile?.allergies ? (
            <div className="flex flex-wrap gap-2">
              {profile.allergies.split(",").map((a) => (
                <span key={a} className="px-3 py-1.5 bg-red-700/60 border border-red-600 text-white rounded-full text-sm font-medium">
                  {a.trim()}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-red-300/60">No known allergies</div>
          )}
        </div>

        {/* Medications */}
        <div className="bg-red-900/40 border border-red-700/60 rounded-2xl p-5">
          <div className="text-red-300 text-xs uppercase tracking-wide mb-3">💊 Current Medications</div>
          {profile?.current_medications ? (
            <div className="flex flex-wrap gap-2">
              {profile.current_medications.split(",").map((m) => (
                <span key={m} className="px-3 py-1.5 bg-red-700/60 border border-red-600 text-white rounded-full text-sm">
                  {m.trim()}
                </span>
              ))}
            </div>
          ) : (
            <div className="text-red-300/60">No medications listed</div>
          )}
        </div>

        {/* Emergency contact */}
        <div className="bg-red-900/40 border border-red-700/60 rounded-2xl p-5">
          <div className="text-red-300 text-xs uppercase tracking-wide mb-2">📞 Emergency Contact</div>
          {profile?.emergency_contact ? (
            <div className="text-white font-semibold text-lg">{profile.emergency_contact}</div>
          ) : (
            <div className="text-red-300/60">No emergency contact listed</div>
          )}
        </div>

        <div className="text-center text-red-400/60 text-xs pt-2">
          Accessed via emergency QR code from CareChainAI. Consult a qualified healthcare professional for medical advice.
        </div>
      </div>
    </div>
  );
}
