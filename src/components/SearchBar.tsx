"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { Search } from "lucide-react";

export function SearchBar({ initialQuery = "" }: { initialQuery?: string }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/?q=${encodeURIComponent(q)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <div className="relative flex-1">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by role, skill, or company..."
          className="w-full pl-10 pr-3.5 py-2.5 border-3 border-black rounded-[10px] text-body font-medium placeholder:text-text-secondary focus:outline-none"
        />
      </div>
      <button
        type="submit"
        className="bg-green text-black font-extrabold px-5 py-2.5 rounded-full border-3 border-black brutal-shadow-sm brutal-hover text-label uppercase tracking-widest"
      >
        Search
      </button>
    </form>
  );
}
