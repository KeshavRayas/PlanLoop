"use client";

import { useState } from "react";
import { Trash2, Loader2, X } from "lucide-react";
import { useRouter } from "next/navigation";

export function DeleteResumeButton({ id }: { id: string }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const router = useRouter();

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/resumes/${id}`, { method: "DELETE" });
      if (res.ok) router.refresh();
    } catch {
      /* ignore */
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (confirming) {
    return (
      <div className="flex items-center gap-1">
        <button
          onClick={handleDelete}
          disabled={deleting}
          className="w-7 h-7 rounded-full border-2 border-red flex items-center justify-center text-red hover:bg-red hover:text-white transition-[150ms] disabled:opacity-50"
        >
          {deleting ? <Loader2 className="w-3 h-3 animate-spin" /> : "✓"}
        </button>
        <button
          onClick={() => setConfirming(false)}
          className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-[150ms]"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      className="w-7 h-7 rounded-full border-2 border-red flex items-center justify-center text-red hover:bg-red hover:text-white transition-[150ms] shrink-0"
      title="Delete resume"
    >
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  );
}
