/**
 * Typed API client for the HealthVault FastAPI backend.
 * All requests automatically attach the JWT Bearer token from localStorage.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface TokenResponse {
  access_token: string;
  token_type: string;
  role: "patient" | "doctor" | "admin";
  user_id: number;
  name: string;
}

export interface UserOut {
  id: number;
  name: string;
  email: string;
  role: string;
  blood_group: string | null;
  allergies: string | null;
  emergency_contact: string | null;
  current_medications: string | null;
}

export interface ReportOut {
  id: number;
  original_filename: string;
  file_type: string;
  report_type: string;
  report_date: string | null;
  hospital_name: string | null;
  doctor_name: string | null;
  summary: string | null;
  status: "pending" | "processing" | "done" | "failed";
  created_at: string;
}

export interface TimelineEntry {
  id: number;
  report_date: string | null;
  report_type: string;
  hospital_name: string | null;
  summary: string | null;
  original_filename: string;
}

export interface AskResponse {
  answer: string;
  sources: number[];
  retrieved_chunks: number;
  safe: boolean;
  warnings: string[];
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) headers["Authorization"] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || "Request failed");
  }

  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (data: { name: string; email: string; password: string; role?: string }) =>
    apiFetch<TokenResponse>("/auth/signup", { method: "POST", body: JSON.stringify(data) }),

  login: (data: { email: string; password: string }) =>
    apiFetch<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),

  me: () => apiFetch<UserOut>("/auth/me"),
};

// ── Reports ───────────────────────────────────────────────────────────────────

export const reportsApi = {
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiFetch<ReportOut>("/reports/upload", { method: "POST", body: form });
  },

  list: () => apiFetch<ReportOut[]>("/reports/"),

  get: (id: number) => apiFetch<ReportOut>(`/reports/${id}`),

  delete: (id: number) => apiFetch<void>(`/reports/${id}`, { method: "DELETE" }),
};

// ── Timeline ──────────────────────────────────────────────────────────────────

export const timelineApi = {
  get: () => apiFetch<TimelineEntry[]>("/timeline/"),
};

// ── AI ────────────────────────────────────────────────────────────────────────

export const aiApi = {
  ask: (question: string) =>
    apiFetch<AskResponse>("/ai/ask", { method: "POST", body: JSON.stringify({ question }) }),
};

// ── Emergency ─────────────────────────────────────────────────────────────────

export const emergencyApi = {
  getProfile: () => apiFetch<UserOut>("/emergency/profile"),

  updateProfile: (data: Partial<UserOut>) =>
    apiFetch<UserOut>("/emergency/profile", { method: "PUT", body: JSON.stringify(data) }),

  getQR: () => apiFetch<{ token: string; url: string; expires_at: string }>("/emergency/qr"),

  publicView: (token: string) =>
    fetch(`${BASE_URL}/emergency/public/${token}`).then((r) => r.json()) as Promise<UserOut>,
};
