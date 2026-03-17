export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-cyan-400 mb-4">CareChainAI</h1>
      <p className="text-slate-400 mb-8">AI-Powered Health Record System</p>
      <div className="flex gap-4">
        <a href="/auth/signup" className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-xl font-semibold transition-colors">
          Get Started
        </a>
        <a href="/auth/login" className="px-6 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-xl font-semibold transition-colors">
          Login
        </a>
      </div>
    </div>
  );
}
