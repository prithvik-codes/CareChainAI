"use client";
import { useEffect, useState } from "react";

interface DBStats {
  total_users: number;
  total_patients: number;
  total_doctors: number;
  total_reports: number;
  total_embeddings: number;
  processed_reports: number;
  failed_reports: number;
}

interface PatientRecord {
  id: number;
  name: string;
  email: string;
  role: string;
  blood_group: string | null;
  allergies: string | null;
  emergency_contact: string | null;
  current_medications: string | null;
  created_at: string;
  report_count: number;
}

interface ReportRecord {
  id: number;
  user_id: number;
  user_name: string;
  user_email: string;
  original_filename: string;
  file_type: string;
  report_type: string;
  report_date: string | null;
  hospital_name: string | null;
  doctor_name: string | null;
  summary: string | null;
  status: string;
  created_at: string;
}

const STATUS_COLORS: Record<string, string> = {
  done:       "bg-emerald-900/60 text-emerald-300",
  failed:     "bg-rose-900/60 text-rose-300",
  processing: "bg-amber-900/60 text-amber-300",
  pending:    "bg-amber-900/60 text-amber-300",
};

const ROLE_COLORS: Record<string, string> = {
  patient: "bg-cyan-900/60 text-cyan-300",
  doctor:  "bg-violet-900/60 text-violet-300",
  admin:   "bg-rose-900/60 text-rose-300",
};

type Tab = "overview" | "patients" | "reports";

function handleLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("role");
  localStorage.removeItem("user_name");
  window.location.href = "/";
}

export default function AdminPage() {
  const [tab,      setTab]      = useState<Tab>("overview");
  const [stats,    setStats]    = useState<DBStats | null>(null);
  const [patients, setPatients] = useState<PatientRecord[]>([]);
  const [reports,  setReports]  = useState<ReportRecord[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState("");
  const [deleting, setDeleting] = useState<number | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const fetchAll = async () => {
    if (!token) { window.location.href = "/auth/login"; return; }
    setLoading(true);
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [statsRes, patientsRes, reportsRes] = await Promise.all([
        fetch("http://10.157.36.194:8000/api/admin/stats",    { headers }),
        fetch("http://10.157.36.194:8000/api/admin/patients", { headers }),
        fetch("http://10.157.36.194:8000/api/admin/reports",  { headers }),
      ]);
      setStats(await statsRes.json());
      setPatients(await patientsRes.json());
      setReports(await reportsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleDeleteUser = async (id: number) => {
    setDeleting(id);
    try {
      await fetch(`http://10.157.36.194:8000/api/admin/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setPatients((prev) => prev.filter((p) => p.id !== id));
      setReports((prev) => prev.filter((r) => r.user_id !== id));
      if (stats) setStats({ ...stats, total_users: stats.total_users - 1 });
    } finally {
      setDeleting(null);
      setConfirmDelete(null);
    }
  };

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredReports = reports.filter((r) =>
    r.original_filename.toLowerCase().includes(search.toLowerCase()) ||
    r.user_name.toLowerCase().includes(search.toLowerCase()) ||
    r.user_email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="bg-slate-900 border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-rose-600 rounded-xl flex items-center justify-center font-bold text-lg">🛡️</div>
          <div>
            <div className="font-bold">Admin Panel</div>
            <div className="text-xs text-rose-400">Database Management</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center text-slate-950 font-bold text-sm">C</div>
          <span className="font-bold">CareChainAI</span>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchAll} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-lg text-sm transition-all">
            🔄 Refresh
          </button>
          <button onClick={handleLogout} className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 rounded-lg text-sm transition-all">
            🚪 Logout
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-1">Database Overview</h1>
        <p className="text-slate-400 text-sm mb-6">All patients, reports and records stored in the system</p>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-800 pb-0">
          {(["overview", "patients", "reports"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-sm font-medium capitalize transition-all border-b-2 -mb-px ${
                tab === t
                  ? "border-cyan-500 text-cyan-400"
                  : "border-transparent text-slate-400 hover:text-white"
              }`}
            >
              {t === "overview" ? "📊 Overview" : t === "patients" ? `👥 Users (${patients.length})` : `📄 Reports (${reports.length})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="flex items-center gap-3 text-slate-400 py-16 justify-center">
            <div className="w-6 h-6 border-2 border-slate-600 border-t-cyan-500 rounded-full animate-spin" />
            Loading database...
          </div>
        ) : (
          <>
            {/* ── OVERVIEW TAB ── */}
            {tab === "overview" && stats && (
              <div className="space-y-6">
                {/* Stats grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: "Total Users",     value: stats.total_users,       icon: "👥", color: "text-cyan-400" },
                    { label: "Patients",         value: stats.total_patients,    icon: "👤", color: "text-cyan-400" },
                    { label: "Doctors",          value: stats.total_doctors,     icon: "👨‍⚕️", color: "text-violet-400" },
                    { label: "Total Reports",    value: stats.total_reports,     icon: "📄", color: "text-emerald-400" },
                    { label: "Processed",        value: stats.processed_reports, icon: "✅", color: "text-emerald-400" },
                    { label: "Failed",           value: stats.failed_reports,    icon: "❌", color: "text-rose-400" },
                    { label: "Embeddings",       value: stats.total_embeddings,  icon: "🧮", color: "text-amber-400" },
                    { label: "Pending",          value: stats.total_reports - stats.processed_reports - stats.failed_reports, icon: "⏳", color: "text-amber-400" },
                  ].map((s) => (
                    <div key={s.label} className="bg-slate-800 border border-slate-700 rounded-xl p-5">
                      <div className="text-2xl mb-1">{s.icon}</div>
                      <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
                      <div className="text-slate-400 text-sm mt-1">{s.label}</div>
                    </div>
                  ))}
                </div>

                {/* Recent patients */}
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl p-5">
                  <h2 className="font-semibold mb-4">Recent Registrations</h2>
                  <div className="space-y-3">
                    {patients.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-700/50 last:border-0">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-sm font-bold">
                            {p.name[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-medium">{p.name}</div>
                            <div className="text-xs text-slate-400">{p.email}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS[p.role]}`}>{p.role}</span>
                          <span className="text-xs text-slate-500">{p.report_count} reports</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── PATIENTS TAB ── */}
            {tab === "patients" && (
              <div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by name or email..."
                  className="w-full max-w-md bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 mb-4"
                />
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-slate-700 text-xs text-slate-400 font-medium uppercase tracking-wide">
                    <div className="col-span-1">ID</div>
                    <div className="col-span-2">Name</div>
                    <div className="col-span-3">Email</div>
                    <div className="col-span-1">Role</div>
                    <div className="col-span-1">Reports</div>
                    <div className="col-span-1">Blood</div>
                    <div className="col-span-2">Joined</div>
                    <div className="col-span-1">Action</div>
                  </div>
                  {/* Rows */}
                  {filteredPatients.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">No users found</div>
                  ) : (
                    filteredPatients.map((p) => (
                      <div key={p.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20 transition-colors items-center text-sm">
                        <div className="col-span-1 text-slate-500">#{p.id}</div>
                        <div className="col-span-2 font-medium truncate">{p.name}</div>
                        <div className="col-span-3 text-slate-400 truncate">{p.email}</div>
                        <div className="col-span-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${ROLE_COLORS[p.role]}`}>{p.role}</span>
                        </div>
                        <div className="col-span-1 text-cyan-400 font-bold">{p.report_count}</div>
                        <div className="col-span-1 text-slate-300">{p.blood_group || "—"}</div>
                        <div className="col-span-2 text-slate-500 text-xs">
                          {new Date(p.created_at).toLocaleDateString("en-IN")}
                        </div>
                        <div className="col-span-1">
                          {confirmDelete === p.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => handleDeleteUser(p.id)}
                                disabled={deleting === p.id}
                                className="px-2 py-1 bg-rose-700 hover:bg-rose-600 rounded text-xs font-medium transition-colors"
                              >
                                {deleting === p.id ? "..." : "Yes"}
                              </button>
                              <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-2 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs transition-colors"
                              >
                                No
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDelete(p.id)}
                              className="text-slate-500 hover:text-rose-400 transition-colors"
                              title="Delete user"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── REPORTS TAB ── */}
            {tab === "reports" && (
              <div>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search by filename, patient name or email..."
                  className="w-full max-w-md bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 mb-4"
                />
                <div className="bg-slate-800/60 border border-slate-700 rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-3 px-5 py-3 border-b border-slate-700 text-xs text-slate-400 font-medium uppercase tracking-wide">
                    <div className="col-span-1">ID</div>
                    <div className="col-span-2">Patient</div>
                    <div className="col-span-2">Email</div>
                    <div className="col-span-2">Filename</div>
                    <div className="col-span-1">Type</div>
                    <div className="col-span-1">Date</div>
                    <div className="col-span-1">Hospital</div>
                    <div className="col-span-1">Status</div>
                    <div className="col-span-1">Uploaded</div>
                  </div>
                  {/* Rows */}
                  {filteredReports.length === 0 ? (
                    <div className="text-center py-10 text-slate-400 text-sm">No reports found</div>
                  ) : (
                    filteredReports.map((r) => (
                      <div key={r.id} className="grid grid-cols-12 gap-3 px-5 py-4 border-b border-slate-700/50 last:border-0 hover:bg-slate-700/20 transition-colors items-center text-sm">
                        <div className="col-span-1 text-slate-500">#{r.id}</div>
                        <div className="col-span-2 font-medium truncate">{r.user_name}</div>
                        <div className="col-span-2 text-slate-400 truncate text-xs">{r.user_email}</div>
                        <div className="col-span-2 text-slate-300 truncate text-xs">{r.original_filename}</div>
                        <div className="col-span-1 text-slate-300 capitalize text-xs">{r.report_type}</div>
                        <div className="col-span-1 text-slate-400 text-xs">{r.report_date || "—"}</div>
                        <div className="col-span-1 text-slate-400 truncate text-xs">{r.hospital_name || "—"}</div>
                        <div className="col-span-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[r.status]}`}>
                            {r.status}
                          </span>
                        </div>
                        <div className="col-span-1 text-slate-500 text-xs">
                          {new Date(r.created_at).toLocaleDateString("en-IN")}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
