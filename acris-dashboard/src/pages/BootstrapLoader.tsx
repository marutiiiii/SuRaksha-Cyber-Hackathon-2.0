import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Loader2, Cpu, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface DownloadState {
  is_downloading: boolean;
  progress: number;
  status: string;
  total_bytes: number;
  downloaded_bytes: number;
}

interface SystemStatus {
  model_downloaded: boolean;
  download_state: DownloadState;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const BootstrapLoader = () => {
  const navigate = useNavigate();
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState("");

  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/system/status");
      const data: SystemStatus = await res.json();
      setStatus(data);
      setChecking(false);
      if (data.model_downloaded) {
        navigate("/auth", { replace: true });
      }
    } catch {
      setError("Failed to connect to the Acris backend. Please try restarting the application.");
      setChecking(false);
    }
  }, [navigate]);

  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 2000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const startDownload = async () => {
    setError("");
    try {
      const res = await fetch("/api/v1/system/download-model", { method: "POST" });
      if (!res.ok) throw new Error("Server error");
    } catch {
      setError("Failed to start download. Please check your internet connection.");
    }
  };

  const isDownloading = status?.download_state?.is_downloading ?? false;
  const progress = status?.download_state?.progress ?? 0;
  const downloadStatus = status?.download_state?.status ?? "Idle";
  const downloadedBytes = status?.download_state?.downloaded_bytes ?? 0;
  const totalBytes = status?.download_state?.total_bytes ?? 0;

  if (checking) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <Loader2 className="h-10 w-10 animate-spin text-blue-400 mb-4" />
        <h2 className="text-xl font-semibold text-slate-300">Starting Acris...</h2>
      </div>
    );
  }

  if (status?.model_downloaded) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white">
        <CheckCircle className="h-12 w-12 text-green-400 mb-4" />
        <h2 className="text-xl font-semibold">AI Engine Ready — Loading App...</h2>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-blue-700/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[300px] h-[300px] bg-indigo-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Card */}
      <div className="relative z-10 bg-slate-900/60 backdrop-blur-2xl border border-slate-700/60 p-10 rounded-2xl shadow-2xl shadow-black/40 max-w-md w-full text-center">

        {/* Icon */}
        <div className="mx-auto w-20 h-20 bg-gradient-to-br from-blue-500/20 to-indigo-500/20 rounded-2xl flex items-center justify-center mb-8 border border-blue-500/30 shadow-lg shadow-blue-900/20">
          <Cpu className="h-10 w-10 text-blue-400" />
        </div>

        <h1 className="text-3xl font-bold mb-3">
          <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">
            AI Engine Setup
          </span>
        </h1>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">
          Acris runs its AI models <strong className="text-slate-300">entirely on your device</strong> — no data leaves your machine. We need to download the AI engine once (~400 MB) to get started.
        </p>

        {isDownloading ? (
          <div className="space-y-5">
            {/* Progress bar */}
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium text-slate-300">{downloadStatus}</span>
                <span className="tabular-nums font-bold text-blue-400">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2.5 bg-slate-800 rounded-full" />
              {totalBytes > 0 && (
                <div className="text-xs text-slate-500 mt-2 tabular-nums">
                  {formatBytes(downloadedBytes)} / {formatBytes(totalBytes)}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
              <Loader2 className="h-3 w-3 animate-spin" />
              <span>Please keep this window open while downloading...</span>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {error && (
              <div className="bg-red-900/20 border border-red-700/50 text-red-300 text-sm px-4 py-3 rounded-xl">
                {error}
              </div>
            )}
            <Button
              id="bootstrap-download-btn"
              onClick={startDownload}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white py-6 text-base font-semibold rounded-xl shadow-lg shadow-blue-900/30 transition-all duration-200 hover:scale-[1.02] hover:shadow-blue-800/40"
            >
              <Download className="mr-2 h-5 w-5" />
              Download & Install AI Engine
            </Button>
            <p className="text-xs text-slate-600">
              One-time download · Stored locally · Never re-downloaded
            </p>
          </div>
        )}
      </div>

      {/* Bottom branding */}
      <p className="mt-8 text-xs text-slate-700 z-10">
        Acris — Powered by on-device AI
      </p>
    </div>
  );
};

export default BootstrapLoader;
