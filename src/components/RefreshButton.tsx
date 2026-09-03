"use client";

import { useState, useCallback } from "react";

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
        throw new Error(text || `HTTP ${res.status}`);
      }
      setToast({ message: "Refreshed ✓", error: false });
    } catch {
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
        className="calm-pill disabled:opacity-50"
        title="Refresh job data"
      >
        {loading ? "Refreshing…" : "Refresh ↻"}
      </button>
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-[#111] text-white rounded-full px-5 py-3 text-[13px] animate-fade-in">
          {toast.message}
        </div>
      )}
    </>
  );
}
