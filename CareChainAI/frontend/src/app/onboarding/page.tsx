"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const STEPS = [
  { id: 1, title: "Welcome",          icon: "👋", desc: "Let's set up your health profile" },
  { id: 2, title: "Personal Info",    icon: "👤", desc: "Basic health information" },
  { id: 3, title: "Emergency Info",   icon: "🆘", desc: "Critical info for emergencies" },
  { id: 4, title: "First Report",     icon: "📄", desc: "Upload your first medical report" },
  { id: 5, title: "You're all set!",  icon: "🎉", desc: "Start using CareChainAI" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [step,   setStep]   = useState(1);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    blood_group: "", allergies: "", emergency_contact: "", current_medications: "",
  });

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : "";

  const saveProfile = async () => {
    setSaving(true);
    try {
      await fetch("http://10.157.36.194:8000/api/emergency/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          blood_group:         form.blood_group || null,
          allergies:           form.allergies || null,
          emergency_contact:   form.emergency_contact || null,
          current_medications: form.current_medications || null,
        }),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step === 3) await saveProfile();
    if (step < 5) setStep(step + 1);
  };

  const handleFinish = () => {
    localStorage.setItem("onboarding_done", "true");
    router.push("/dashboard");
  };

  const handleSkip = () => {
    localStorage.setItem("onboarding_done", "true");
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4">
      <div className="w-full max-w-lg">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">Step {step} of {STEPS.length}</span>
            <button onClick={handleSkip} className="text-sm text-slate-500 hover:text-slate-300 transition-colors">
              Skip setup →
            </button>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${(step / STEPS.length) * 100}%` }}
            />
          </div>
          {/* Step indicators */}
          <div className="flex justify-between mt-3">
            {STEPS.map((s) => (
              <div key={s.id} className={`flex flex-col items-center gap-1 ${s.id <= step ? "opacity-100" : "opacity-30"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm border-2 transition-all ${
                  s.id < step  ? "bg-cyan-600 border-cyan-500" :
                  s.id === step ? "bg-slate-800 border-cyan-500" :
                  "bg-slate-800 border-slate-700"
                }`}>
                  {s.id < step ? "✓" : s.icon}
                </div>
                <span className="text-xs text-slate-500 hidden md:block">{s.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step content */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8">

          {/* ── STEP 1: Welcome ── */}
          {step === 1 && (
            <div className="text-center">
              <div className="text-6xl mb-4">👋</div>
              <h2 className="text-2xl font-bold mb-2">Welcome to CareChainAI</h2>
              <p className="text-slate-400 mb-6">
                Your AI-powered health record manager. Let's set up your profile in just a few steps so you can get the most out of the app.
              </p>
              <div className="grid grid-cols-2 gap-3 mb-6 text-left">
                {[
                  { icon: "📄", title: "Upload Reports",    desc: "PDF, images, scans" },
                  { icon: "🤖", title: "Ask AI",            desc: "Query your records" },
                  { icon: "📅", title: "Health Timeline",   desc: "See your history" },
                  { icon: "🆘", title: "Emergency QR",      desc: "Critical info access" },
                ].map((f) => (
                  <div key={f.title} className="bg-slate-800 rounded-xl p-3 flex items-start gap-2">
                    <span className="text-xl">{f.icon}</span>
                    <div>
                      <div className="text-sm font-medium">{f.title}</div>
                      <div className="text-xs text-slate-400">{f.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── STEP 2: Personal Info ── */}
          {step === 2 && (
            <div>
              <div className="text-4xl mb-3">👤</div>
              <h2 className="text-xl font-bold mb-1">Personal Health Info</h2>
              <p className="text-slate-400 text-sm mb-6">This helps personalise your health dashboard.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-2 block">🩸 Blood Group</label>
                  <div className="grid grid-cols-4 gap-2">
                    {BLOOD_GROUPS.map((bg) => (
                      <button key={bg} type="button" onClick={() => setForm({ ...form, blood_group: bg })}
                        className={`py-2 rounded-xl text-sm font-medium border transition-all ${
                          form.blood_group === bg
                            ? "bg-rose-600/30 border-rose-500 text-rose-300"
                            : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400"
                        }`}
                      >
                        {bg}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">💊 Current Medications <span className="text-slate-600">(optional)</span></label>
                  <textarea value={form.current_medications} onChange={(e) => setForm({ ...form, current_medications: e.target.value })}
                    placeholder="e.g. Metformin 500mg, Vitamin D"
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 resize-none" />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Emergency Info ── */}
          {step === 3 && (
            <div>
              <div className="text-4xl mb-3">🆘</div>
              <h2 className="text-xl font-bold mb-1">Emergency Information</h2>
              <p className="text-slate-400 text-sm mb-6">Shown to first responders when your Emergency QR code is scanned.</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">⚠️ Known Allergies</label>
                  <textarea value={form.allergies} onChange={(e) => setForm({ ...form, allergies: e.target.value })}
                    placeholder="e.g. Penicillin, Sulfa drugs, Peanuts"
                    rows={2}
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500 resize-none" />
                </div>
                <div>
                  <label className="text-sm text-slate-400 mb-1.5 block">📞 Emergency Contact</label>
                  <input value={form.emergency_contact} onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
                    placeholder="Name — Phone number"
                    className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500" />
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 4: Upload first report ── */}
          {step === 4 && (
            <div className="text-center">
              <div className="text-4xl mb-3">📄</div>
              <h2 className="text-xl font-bold mb-1">Upload Your First Report</h2>
              <p className="text-slate-400 text-sm mb-6">
                Upload a medical report (PDF or image) and AI will automatically extract and organise the information.
              </p>
              <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 text-left mb-4">
                <div className="text-sm font-medium mb-2 text-slate-300">What you can upload:</div>
                <div className="space-y-1.5 text-sm text-slate-400">
                  {["Lab reports / blood tests", "Prescriptions", "MRI / X-ray scans", "Hospital discharge summaries"].map((i) => (
                    <div key={i} className="flex gap-2"><span className="text-cyan-400">✓</span>{i}</div>
                  ))}
                </div>
              </div>
              <a href="/upload"
                className="block w-full bg-cyan-600 hover:bg-cyan-500 py-3 rounded-xl font-semibold text-sm transition-colors mb-3"
                onClick={() => localStorage.setItem("onboarding_done", "true")}
              >
                ⬆️ Upload Now
              </a>
              <button onClick={handleNext} className="w-full py-2 text-slate-400 hover:text-white text-sm transition-colors">
                Skip for now →
              </button>
            </div>
          )}

          {/* ── STEP 5: Done ── */}
          {step === 5 && (
            <div className="text-center">
              <div className="text-6xl mb-4">🎉</div>
              <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
              <p className="text-slate-400 mb-6">
                Your CareChainAI profile is ready. Start uploading reports and asking AI questions about your health.
              </p>
              <div className="bg-slate-800 rounded-2xl p-4 text-left mb-6 space-y-2">
                <div className="text-sm font-medium text-slate-300 mb-2">Your profile summary:</div>
                {form.blood_group && <div className="flex gap-2 text-sm"><span className="text-rose-400">🩸</span><span className="text-slate-300">Blood Group: <span className="text-white font-medium">{form.blood_group}</span></span></div>}
                {form.allergies && <div className="flex gap-2 text-sm"><span className="text-amber-400">⚠️</span><span className="text-slate-300">Allergies: <span className="text-white font-medium">{form.allergies}</span></span></div>}
                {form.emergency_contact && <div className="flex gap-2 text-sm"><span className="text-cyan-400">📞</span><span className="text-slate-300">Emergency: <span className="text-white font-medium">{form.emergency_contact}</span></span></div>}
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className={`flex gap-3 mt-6 ${step === 1 ? "justify-center" : "justify-between"}`}>
            {step > 1 && step < 5 && (
              <button onClick={() => setStep(step - 1)} className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl text-sm font-medium transition-colors">
                ← Back
              </button>
            )}
            {step < 4 && (
              <button onClick={handleNext} disabled={saving}
                className="flex-1 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 py-2.5 rounded-xl text-sm font-semibold transition-colors">
                {saving ? "Saving..." : step === 3 ? "Save & Continue →" : "Continue →"}
              </button>
            )}
            {step === 5 && (
              <button onClick={handleFinish} className="w-full bg-gradient-to-r from-cyan-600 to-violet-600 hover:from-cyan-500 hover:to-violet-500 py-3 rounded-xl font-semibold transition-all">
                🚀 Go to Dashboard
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
