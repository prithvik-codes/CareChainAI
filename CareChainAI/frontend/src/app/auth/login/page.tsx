"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("http://10.157.36.194:8000/api/auth/login", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Login failed");

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
        <h2 className="text-2xl font-bold text-white mb-1">Welcome back</h2>
        <p className="text-slate-400 text-sm mb-6">Login to your health records</p>

        {error && (
          <div className="bg-rose-900/50 border border-rose-700 text-rose-300 rounded-lg px-4 py-2 text-sm mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-sm text-slate-400 mb-1 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              placeholder="••••••••"
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 text-white py-3 rounded-xl font-semibold transition-colors"
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </div>

        {/* Role hint */}
        <div className="mt-4 bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-400">
          👤 <span className="text-cyan-400">Patient</span> → redirected to Health Dashboard<br />
          👨‍⚕️ <span className="text-violet-400">Doctor</span> → redirected to Doctor Portal
        </div>

        <p className="text-slate-400 text-sm text-center mt-6">
          Don't have an account?{" "}
          <a href="/auth/signup" className="text-cyan-400 hover:underline">Sign up</a>
        </p>
      </div>
    </div>
  );
}
