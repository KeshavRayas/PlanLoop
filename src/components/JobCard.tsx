import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatDaysAgo } from "@/lib/utils";
import type { JobSearchResult } from "@/lib/types";

const workModeStyles: Record<string, string> = {
  REMOTE: "bg-green/15 text-green border-green",
  HYBRID: "bg-yellow/15 text-yellow-800 border-yellow",
  ONSITE: "bg-gray-100 text-gray-500 border-gray-300",
};

export function JobCard({ job }: { job: JobSearchResult }) {
  return (
    <Link
      href={`/?selected=${job.id}`}
      className="block bg-surface border-3 border-black rounded-[20px] p-5 brutal-shadow-md brutal-hover"
    >
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-3">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full border-2 text-label font-extrabold uppercase tracking-widest text-[11px] ${workModeStyles[job.workMode]}`}
            >
              {job.workMode === "REMOTE" ? "Remote"
                : job.workMode === "HYBRID" ? "Hybrid"
                : "On-site"}
            </span>
          </div>

          <h3 className="text-headline font-extrabold leading-tight mb-2 line-clamp-2">
            {job.title}
          </h3>

          <div className="flex items-center gap-1.5 text-body font-medium text-text-secondary mb-3">
            <span className="w-5 h-5 rounded-full border-2 border-black flex items-center justify-center bg-surface-secondary shrink-0 text-[10px] font-black leading-none">
              {job.company.name.charAt(0)}
            </span>
            <span>{job.company.name}</span>
            <span className="text-text-secondary/40">&bull;</span>
            <span>{formatDaysAgo(job.postedAt)}</span>
          </div>

          {job.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {job.skills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="px-2 py-0.5 rounded-full bg-[#F3F3F3] text-label font-bold text-[11px]"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="w-8 h-8 rounded-full border-3 border-black flex items-center justify-center shrink-0 mt-1 group-hover:bg-black group-hover:text-white transition-[150ms]">
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </Link>
  );
}
