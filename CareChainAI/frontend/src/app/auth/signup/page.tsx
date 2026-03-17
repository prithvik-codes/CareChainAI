"use client";
import { useState } from "react";

export default function SignupPage() {
  const [form,    setForm]    = useState({ name: "", email: "", password: "", role: "patient" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/auth/signup", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Signup failed");

      // Save token, role and name
      localStorage.setItem("token",     data.access_token);
      localStorage.setItem("role",      data.role);
      localStorage.setItem("user_name", data.name);

      // Redirect based on role
      window.location.href = data.role === "doctor" ? "/doctor" : "/dashboard";
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-700 rounded-2xl p-8">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center text-slate-950 font-bold">C</div>
          <span className="font-bold text-lg text-white">CareChainAI</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-1">Create account</h2>
        <p className="text-slate-400 text-sm mb-6">Start managing your health records</p>

        {error && (
          <div className="bg-rose-900/50 border border-rose-700 text-rose-300 rounded-lg px-4 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Full Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="John Doe"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="you@example.com"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          {/* Role selector — visually distinct */}
          <div>
            <label className="text-sm text-slate-400 mb-2 block">I am a...</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setForm({ ...form, role: "patient" })}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.role === "patient"
                    ? "bg-cyan-600/20 border-cyan-500 text-cyan-300"
                    : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400"
                }`}
              >
                👤 Patient
              </button>
              <button
                type="button"
                onClick={() => setForm({ ...form, role: "doctor" })}
                className={`py-3 px-4 rounded-xl border-2 text-sm font-medium transition-all ${
                  form.role === "doctor"
                    ? "bg-violet-600/20 border-violet-500 text-violet-300"
                    : "bg-slate-800 border-slate-600 text-slate-400 hover:border-slate-400"
                }`}
              >
                👨‍⚕️ Doctor
              </button>
            </div>
            <p className="text-slate-500 text-xs mt-2">
              {form.role === "doctor"
                ? "👨‍⚕️ You'll get access to the Doctor Portal with patient record management."
                : "👤 You'll get access to your personal Health Dashboard."}
            </p>
          </div>

          <button
            onClick={handleSignup}
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </div>

        <p className="text-slate-400 text-sm text-center mt-6">
          Already have an account?{" "}
          <a href="/auth/login" className="text-cyan-400 hover:underline">Login</a>
        </p>
      </div>
    </div>
  );
}
