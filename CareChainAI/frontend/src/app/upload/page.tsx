"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function handleLogout() {
  localStorage.removeItem("token");
  window.location.href = "/";
}

const REPORT_TYPES = [
  { value: "lab",          label: "🧪 Lab Report" },
  { value: "prescription", label: "💊 Prescription" },
  { value: "mri",          label: "🧲 MRI Scan" },
  { value: "xray",         label: "☢️ X-Ray" },
  { value: "discharge",    label: "🏥 Discharge Summary" },
  { value: "other",        label: "📄 Other" },
];

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  // Metadata fields
  const [reportDate, setReportDate] = useState("");
  const [reportType, setReportType] = useState("other");
  const [hospitalName, setHospitalName] = useState("");
  const [doctorName, setDoctorName] = useState("");

  // Camera states
  const [cameraOpen, setCameraOpen] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState("");
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) router.push("/auth/login");
  }, [router]);

  useEffect(() => {
    return () => {
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [stream]);

  // ── Camera ─────────────────────────────────────────────────────

  const startCamera = async (facing: "user" | "environment" = facingMode) => {
    setCameraError("");
    try {
      if (stream) stream.getTracks().forEach((t) => t.stop());
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      setStream(mediaStream);
      setCameraOpen(true);
      setFacingMode(facing);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
      }, 150);
    } catch (err: any) {
      if (err.name === "NotAllowedError") {
        setCameraError("Camera permission denied. Click the camera icon in your browser's address bar and allow access.");
      } else if (err.name === "NotFoundError") {
        setCameraError("No camera found on this device.");
      } else {
        setCameraError(`Camera error: ${err.message}`);
      }
    }
  };

  const stopCamera = () => {
    if (stream) stream.getTracks().forEach((t) => t.stop());
    setStream(null);
    setCameraOpen(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (facingMode === "user") {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: "image/jpeg" });
      handleFile(file);
      stopCamera();
    }, "image/jpeg", 0.92);
  };

  const switchCamera = () => {
    const next = facingMode === "environment" ? "user" : "environment";
    startCamera(next);
  };

  // ── File handling ──────────────────────────────────────────────

  const handleFile = (file: File) => {
    const allowed = ["application/pdf", "image/jpeg", "image/png", "image/webp", "image/tiff"];
    if (!allowed.includes(file.type)) {
      setError("Unsupported file type. Please upload PDF, JPG, PNG, WEBP, or TIFF.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File too large. Maximum size is 50 MB.");
      return;
    }
    setError("");
    setSelectedFile(file);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  // ── Upload ─────────────────────────────────────────────────────

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError("");

    try {
      const token = localStorage.getItem("token");
      const form = new FormData();
      form.append("file", selectedFile);

      // Append metadata — backend will use these to override AI extraction
      if (reportDate)   form.append("report_date", reportDate);
      if (reportType)   form.append("report_type", reportType);
      if (hospitalName) form.append("hospital_name", hospitalName);
      if (doctorName)   form.append("doctor_name", doctorName);

      const res = await fetch("http://10.157.36.194:8000/api/reports/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Upload failed");

      setSuccess(true);
      setSelectedFile(null);
      setPreview(null);
      setReportDate("");
      setReportType("other");
      setHospitalName("");
      setDoctorName("");
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (e: any) {
      setError(e.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  // ── UI ─────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="border-b border-slate-800 px-8 py-4 flex items-center justify-between">
        <a href="/dashboard" className="text-slate-400 hover:text-white text-sm transition-colors">
          ← Back to Dashboard
        </a>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-cyan-500 rounded-lg flex items-center justify-center text-slate-950 font-bold text-sm">C</div>
          <span className="font-bold">CareChainAI</span>
        </div>
        <button
          onClick={handleLogout}
          className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900 border border-slate-700 hover:border-rose-700 text-slate-300 hover:text-rose-300 rounded-lg text-sm transition-all"
        >
          🚪 Logout
        </button>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-bold mb-1">Upload Medical Report</h1>
        <p className="text-slate-400 text-sm mb-8">
          Upload a file and fill in report details for an accurate health timeline.
        </p>

        {/* Success */}
        {success && (
          <div className="bg-emerald-900/50 border border-emerald-600 text-emerald-300 rounded-xl px-5 py-4 mb-6 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div>
              <div className="font-semibold">Upload successful!</div>
              <div className="text-sm text-emerald-400">AI is processing your report. Redirecting to dashboard...</div>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-rose-900/50 border border-rose-700 text-rose-300 rounded-xl px-5 py-3 mb-6 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ── CAMERA VIEW ── */}
        {cameraOpen && (
          <div className="bg-slate-900 border border-slate-700 rounded-2xl overflow-hidden mb-6">
            <div className="relative bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full max-h-80 object-cover ${facingMode === "user" ? "[transform:scaleX(-1)]" : ""}`}
              />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="border-2 border-white/40 rounded-2xl w-3/4 h-3/4" />
              </div>
              <div className="absolute top-3 left-0 right-0 text-center text-white/60 text-xs">
                Position your document inside the frame
              </div>
            </div>
            <div className="flex items-center justify-between p-4 gap-3 bg-slate-900">
              <button onClick={stopCamera} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium transition-colors">
                ✕ Cancel
              </button>
              <button
                onClick={capturePhoto}
                className="flex-none w-16 h-16 bg-white hover:bg-slate-100 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                <div className="w-12 h-12 bg-slate-900 rounded-full border-4 border-white" />
              </button>
              <button onClick={switchCamera} className="flex-1 py-2.5 bg-slate-700 hover:bg-slate-600 rounded-xl text-sm font-medium transition-colors">
                🔄 Flip
              </button>
            </div>
          </div>
        )}

        {cameraError && (
          <div className="bg-amber-900/50 border border-amber-700 text-amber-300 rounded-xl px-5 py-3 mb-6 text-sm">
            📷 {cameraError}
          </div>
        )}

        {/* ── FILE SELECTION ── */}
        {!selectedFile && !cameraOpen && (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={() => startCamera()}
                className="flex flex-col items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-cyan-500 rounded-2xl p-8 transition-all group"
              >
                <span className="text-4xl group-hover:scale-110 transition-transform">📷</span>
                <div>
                  <div className="font-semibold text-center">Take Photo</div>
                  <div className="text-slate-400 text-xs text-center mt-1">Open webcam / camera</div>
                </div>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-3 bg-slate-800 hover:bg-slate-700 border-2 border-slate-600 hover:border-cyan-500 rounded-2xl p-8 transition-all group"
              >
                <span className="text-4xl group-hover:scale-110 transition-transform">📁</span>
                <div>
                  <div className="font-semibold text-center">Choose File</div>
                  <div className="text-slate-400 text-xs text-center mt-1">PDF, JPG, PNG</div>
                </div>
              </button>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragOver ? "border-cyan-400 bg-cyan-500/10" : "border-slate-600 hover:border-slate-400 hover:bg-slate-800/40"
              }`}
            >
              <div className="text-3xl mb-2">⬆️</div>
              <div className="font-medium text-slate-300">Or drag & drop your file here</div>
              <div className="text-slate-500 text-sm mt-1">PDF · JPG · PNG · WEBP · TIFF · Max 50MB</div>
            </div>
          </>
        )}

        {/* ── FILE SELECTED: METADATA FORM + UPLOAD ── */}
        {selectedFile && (
          <div className="space-y-4">
            {/* File info */}
            <div className="bg-slate-800 border border-slate-600 rounded-2xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{selectedFile.type === "application/pdf" ? "📄" : "🖼️"}</span>
                <div>
                  <div className="font-medium text-sm">{selectedFile.name}</div>
                  <div className="text-slate-400 text-xs">{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</div>
                </div>
              </div>
              <button
                onClick={() => { setSelectedFile(null); setPreview(null); setError(""); }}
                className="text-slate-400 hover:text-rose-400 transition-colors text-xl"
              >
                ✕
              </button>
            </div>

            {/* Image preview */}
            {preview && (
              <div className="rounded-2xl overflow-hidden border border-slate-600">
                <img src={preview} alt="Preview" className="w-full max-h-64 object-contain bg-slate-900" />
              </div>
            )}

            {/* ── METADATA FORM ── */}
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 space-y-4">
              <div className="text-sm font-semibold text-slate-300 mb-1">
                📋 Report Details
                <span className="text-slate-500 font-normal ml-2">(helps build an accurate timeline)</span>
              </div>

              {/* Date — most important field */}
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">
                  📅 Report / Prescription Date
                  <span className="text-cyan-400 ml-1">*</span>
                </label>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  max={new Date().toISOString().split("T")[0]}
                  className="w-full bg-slate-900 border border-slate-600 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white focus:outline-none transition-colors [color-scheme:dark]"
                />
                <p className="text-slate-500 text-xs mt-1">
                  When was this report issued or prescription given?
                </p>
              </div>

              {/* Report type */}
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">🏷️ Report Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {REPORT_TYPES.map((t) => (
                    <button
                      key={t.value}
                      type="button"
                      onClick={() => setReportType(t.value)}
                      className={`py-2 px-3 rounded-xl text-xs font-medium border transition-all ${
                        reportType === t.value
                          ? "bg-cyan-600 border-cyan-500 text-white"
                          : "bg-slate-900 border-slate-600 text-slate-400 hover:border-slate-400 hover:text-white"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Hospital name */}
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">🏥 Hospital / Clinic Name</label>
                <input
                  type="text"
                  value={hospitalName}
                  onChange={(e) => setHospitalName(e.target.value)}
                  placeholder="e.g. City Medical Center"
                  className="w-full bg-slate-900 border border-slate-600 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Doctor name */}
              <div>
                <label className="text-sm text-slate-400 mb-1.5 block">👨‍⚕️ Doctor Name</label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Dr. Sharma"
                  className="w-full bg-slate-900 border border-slate-600 focus:border-cyan-500 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Helper note */}
              <div className="bg-slate-900/60 border border-slate-700 rounded-xl px-4 py-3 text-xs text-slate-400">
                💡 If you skip a field, AI will try to extract it automatically from the document.
                Providing the date manually ensures it appears correctly on your timeline.
              </div>
            </div>

            {/* Upload button */}
            <button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Uploading & Processing...
                </>
              ) : (
                "⬆️ Upload Report"
              )}
            </button>

            <button
              onClick={() => { setSelectedFile(null); setPreview(null); }}
              className="w-full py-2 text-slate-400 hover:text-white text-sm transition-colors"
            >
              ← Choose a different file
            </button>
          </div>
        )}

        {/* Hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png,.webp,.tiff"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />
        <canvas ref={canvasRef} className="hidden" />

        {/* Info */}
        {!selectedFile && (
          <div className="mt-6 bg-slate-800/60 border border-slate-700 rounded-xl p-4">
            <div className="text-sm font-semibold text-slate-300 mb-2">🤖 What happens after upload?</div>
            <div className="space-y-1.5 text-sm text-slate-400">
              {[
                "Ingestion Agent extracts text (OCR for images, pdfplumber for PDFs)",
                "Timeline Agent uses your provided date & type for accurate timeline placement",
                "RAG Agent creates embeddings and stores them in FAISS",
                "Report appears in your Health Timeline",
                "You can ask AI questions about the report",
              ].map((s, i) => (
                <div key={i} className="flex gap-2">
                  <span className="text-cyan-500 font-bold">{i + 1}.</span>
                  {s}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
