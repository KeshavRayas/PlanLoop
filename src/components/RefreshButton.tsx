"use client";

import { useState, useCallback } from "react";
import { RefreshCw } from "lucide-react";

export function RefreshButton() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; error: boolean } | null>(null);

  const handleRefresh = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    try {
      const res = await fetch("/api/cron/ingest", { signal: controller.signal });
      if (!res.ok) {
        const text = await res.text().catch(() => "Unknown error");
        console.error("[Refresh] Server error:", res.status, text);
        throw new Error(text || `HTTP ${res.status}`);
      }
      setToast({ message: "Refreshed ✓", error: false });
    } catch (err) {
      console.error("[Refresh] Failed:", err);
      setToast({ message: "Refresh failed", error: true });
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
      setTimeout(() => setToast(null), 3000);
    }
  }, [loading]);

  return (
    <>
      <button
        onClick={handleRefresh}
        disabled={loading}
        className="w-10 h-10 rounded-full border-3 border-black flex items-center justify-center hover:bg-black hover:text-white transition-[150ms] disabled:opacity-50 disabled:cursor-not-allowed"
        title="Refresh job data"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
      </button>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface border-3 border-black rounded-[14px] brutal-shadow-sm px-5 py-3 flex items-center gap-2 text-label font-extrabold uppercase tracking-widest animate-fade-in">
          <span className={toast.error ? "text-red" : "text-green"}>{toast.error ? "✗" : "✓"}</span>
          {toast.message}
        </div>
      )}
    </>
  );
}
