"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Search, Sparkles, X } from "lucide-react";
import { ALL_SKILLS } from "@/lib/constants";

const EMPLOYMENT_OPTIONS = [
  { label: "Full-Time", value: "FULL_TIME" },
  { label: "Contract", value: "CONTRACT" },
  { label: "Internship", value: "INTERNSHIP" },
];

const LOCATION_OPTIONS = [
  { label: "Remote", value: "REMOTE" },
  { label: "Hybrid", value: "HYBRID" },
  { label: "On-site", value: "ONSITE" },
];

const EXPERIENCE_OPTIONS = [
  { label: "Entry Level", value: "ENTRY" },
];

const DEPARTMENT_OPTIONS = ALL_SKILLS.slice(0, 12);

const WORK_MODE_LABELS: Record<string, string> = {
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ONSITE: "On-site",
};

const JOB_TYPE_LABELS: Record<string, string> = {
  FULL_TIME: "Full-Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

function ActiveChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full border-2 border-black bg-surface text-label font-bold text-[11px]">
      {label}
      <button
        onClick={onRemove}
        className="hover:text-red-500 leading-none transition-[150ms]"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

export function JobFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const setParams = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value) params.set(key, value);
        else params.delete(key);
      }
      params.set("page", "1");
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  const currentQuery = searchParams.get("q") || "";
  const currentWorkMode = searchParams.get("workMode");
  const currentExp = searchParams.get("experience") || "ENTRY";
  const currentSkill = searchParams.get("skills");
  const currentJobType = searchParams.get("jobType");

  const activeSkills = currentSkill ? currentSkill.split(",") : [];

  function removeSkill(skill: string) {
    const remaining = activeSkills.filter((s) => s !== skill);
    setParams({ skills: remaining.length > 0 ? remaining.join(",") : null });
  }

  function isLocationSelected(value: string): boolean {
    return currentWorkMode === value;
  }

  function handleLocation(value: string) {
    if (value === "REMOTE") {
      setParams({ workMode: "REMOTE", location: null });
    } else if (value === "HYBRID") {
      setParams({ workMode: "HYBRID", location: "Bangalore" });
    } else if (value === "ONSITE") {
      setParams({ workMode: "ONSITE", location: "Bangalore" });
    } else {
      setParams({ workMode: null, location: null });
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const form = e.currentTarget as HTMLFormElement;
    const q = (form.elements.namedItem("q") as HTMLInputElement).value.trim();
    setParams({ q: q || null });
  }

  const hasActiveFilters = currentWorkMode || currentExp !== "ENTRY" || currentJobType || activeSkills.length > 0;

  return (
    <div className="bg-surface border-3 border-black rounded-[20px] p-6 brutal-shadow-md flex flex-col gap-10 h-full overflow-y-auto custom-scrollbar">
        {/* Personal badge */}
        <div className="flex items-center gap-2 bg-purple/10 border-2 border-purple rounded-[10px] px-3 py-2">
          <Sparkles className="w-4 h-4 text-purple shrink-0" />
          <span className="text-label font-extrabold uppercase tracking-[0.06em] text-purple">
            Entry-Level CS &middot; BLR &amp; Remote
          </span>
        </div>

        {/* Search */}
        <form onSubmit={handleSearch}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" />
            <input
              type="text"
              name="q"
              defaultValue={currentQuery}
              placeholder="Search jobs..."
              className="w-full pl-9 pr-3 py-2.5 border-3 border-black rounded-[10px] text-body font-medium placeholder:text-text-secondary focus:outline-none"
            />
          </div>
        </form>

        {/* Active Filter Chips */}
        {hasActiveFilters && (
          <section>
            <h3 className="text-label font-extrabold uppercase tracking-[0.08em] mb-3">
              Active
            </h3>
            <div className="flex flex-wrap gap-2">
              {currentWorkMode && (
                <ActiveChip
                  label={WORK_MODE_LABELS[currentWorkMode] || currentWorkMode}
                  onRemove={() => setParams({ workMode: null, location: null })}
                />
              )}
              {currentExp && currentExp !== "ENTRY" && (
                <ActiveChip
                  label="Entry Level"
                  onRemove={() => setParams({ experience: null })}
                />
              )}
              {currentJobType && (
                <ActiveChip
                  label={JOB_TYPE_LABELS[currentJobType] || currentJobType}
                  onRemove={() => setParams({ jobType: null })}
                />
              )}
              {activeSkills.map((skill) => (
                <ActiveChip
                  key={skill}
                  label={skill}
                  onRemove={() => removeSkill(skill)}
                />
              ))}
            </div>
          </section>
        )}

        {/* Department */}
        <section>
          <h3 className="text-label font-extrabold uppercase tracking-[0.08em] mb-4">
            Department
          </h3>
          <div className="space-y-3">
            {DEPARTMENT_OPTIONS.map((skill) => (
              <label
                key={skill}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  className="control-checkbox"
                  checked={activeSkills.includes(skill)}
                  onChange={() =>
                    setParams({
                      skills: activeSkills.includes(skill)
                        ? activeSkills.filter((s) => s !== skill).join(",") || null
                        : [...activeSkills, skill].join(","),
                    })
                  }
                />
                <span
                  className={`text-body font-medium transition-[150ms] ${
                    activeSkills.includes(skill)
                      ? "text-text font-extrabold"
                      : "text-text-secondary group-hover:text-text"
                  }`}
                >
                  {skill}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Location */}
        <section>
          <h3 className="text-label font-extrabold uppercase tracking-[0.08em] mb-4">
            Location
          </h3>
          <div className="space-y-3">
            {LOCATION_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="radio"
                  name="location"
                  className="control-radio"
                  checked={isLocationSelected(opt.value)}
                  onChange={() => handleLocation(opt.value)}
                />
                <span
                  className={`text-body font-medium transition-[150ms] ${
                    isLocationSelected(opt.value)
                      ? "text-text font-extrabold"
                      : "text-text-secondary group-hover:text-text"
                  }`}
                >
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Experience */}
        <section>
          <h3 className="text-label font-extrabold uppercase tracking-[0.08em] mb-4">
            Experience
          </h3>
          <div className="space-y-3">
            {EXPERIENCE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  className="control-checkbox"
                  checked={currentExp === opt.value}
                  onChange={() =>
                    setParams({ experience: currentExp === opt.value ? null : opt.value })
                  }
                />
                <span
                  className={`text-body font-medium transition-[150ms] ${
                    currentExp === opt.value
                      ? "text-text font-extrabold"
                      : "text-text-secondary group-hover:text-text"
                  }`}
                >
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Employment Type */}
        <section>
          <h3 className="text-label font-extrabold uppercase tracking-[0.08em] mb-4">
            Type
          </h3>
          <div className="space-y-3">
            {EMPLOYMENT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <input
                  type="checkbox"
                  className="control-checkbox"
                  checked={currentJobType === opt.value}
                  onChange={() =>
                    setParams({ jobType: currentJobType === opt.value ? null : opt.value })
                  }
                />
                <span
                  className={`text-body font-medium transition-[150ms] ${
                    currentJobType === opt.value
                      ? "text-text font-extrabold"
                      : "text-text-secondary group-hover:text-text"
                  }`}
                >
                  {opt.label}
                </span>
              </label>
            ))}
          </div>
        </section>

        {/* Reset */}
        <button
          onClick={() => router.push("/")}
          className="w-full py-2.5 border-3 border-black rounded-full text-label font-extrabold uppercase tracking-[0.08em] hover:bg-black hover:text-white transition-[150ms]"
        >
          Reset Filters
        </button>
    </div>
  );
}
