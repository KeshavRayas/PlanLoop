import { JobFilters } from "@/components/JobFilters";
import { JobCard } from "@/components/JobCard";
import { JobDetailPanel } from "@/components/JobDetailPanel";
import { Pagination } from "@/components/Pagination";
import { searchJobs } from "@/lib/repositories/jobs.repository";
import { logSearchEvent } from "@/lib/repositories/search.repository";
import { APP_NAME } from "@/lib/constants";
import type { JobFilters as Filters } from "@/lib/types";
import { Briefcase, FileText } from "lucide-react";
import Link from "next/link";
import { RefreshButton } from "@/components/RefreshButton";


type SearchParams = Promise<{
  q?: string;
  location?: string;
  workMode?: string;
  companyTypes?: string;
  skills?: string;
  jobType?: string;
  experience?: string;
  daysOld?: string;
  sources?: string;
  page?: string;
  selected?: string;
}>;

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;

  const filters: Filters = {
    query: sp.q,
    location: sp.location,
    workMode: sp.workMode as Filters["workMode"],
    companyTypes: sp.companyTypes
      ? (sp.companyTypes.split(",") as Filters["companyTypes"])
      : undefined,
    skills: sp.skills ? sp.skills.split(",") : undefined,
    jobType: sp.jobType as Filters["jobType"],
    experience: sp.experience as Filters["experience"],
    daysOld: sp.daysOld ? Number(sp.daysOld) : undefined,
    page: sp.page ? Number(sp.page) : 1,
    pageSize: 20,
  };

  if (filters.query) {
    await logSearchEvent(filters.query);
  }

  const result = await searchJobs(filters);
  const total = result.total;
  const selectedId = sp.selected;

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-bg">
      {/* Static Header — never scrolls */}
      <header className="shrink-0 px-6 pt-6">
        <div className="max-w-container-max mx-auto bg-surface border-4 border-black rounded-[24px] brutal-shadow-lg px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-full border-4 border-black flex items-center justify-center bg-yellow shrink-0">
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-display font-black leading-none">{APP_NAME}</h1>
              <p className="text-body font-medium text-text-secondary mt-1.5">
                CS &middot; Bangalore, India &amp; Remote
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <RefreshButton />
            <Link
              href="/resumes"
              className="w-10 h-10 rounded-full border-3 border-black flex items-center justify-center hover:bg-black hover:text-white transition-[150ms]"
            >
              <FileText className="w-4 h-4" />
            </Link>
            <div className="bg-green text-black font-extrabold px-5 py-2.5 rounded-full border-3 border-black brutal-shadow-sm text-label uppercase tracking-widest inline-flex items-center gap-2">
              Applications
              <span className="bg-black text-green px-2 py-0.5 rounded-full text-label font-extrabold">
                {total}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Three-column layout — fills remaining viewport height */}
      <div className="flex-1 flex overflow-hidden px-6 pt-8 pb-6">
        <div className="flex max-w-container-max mx-auto gap-6 w-full min-w-0">
          {/* Left: Filters — fills column height, scrolls internally */}
          <aside className="w-[280px] shrink-0 overflow-hidden flex flex-col">
            <JobFilters />
          </aside>

          {/* Center: Job Listings — independent scroll */}
          <section className="flex-1 min-w-0 overflow-hidden flex flex-col">
            <div className="overflow-y-auto custom-scrollbar flex-1">
              <div className="mb-8">
                <h2 className="text-headline font-extrabold">
                  {filters.query
                    ? `${total} Results for "${filters.query}"`
                    : `${total} Open Roles`}
                </h2>
                <p className="text-body font-medium text-text-secondary mt-1.5">
                  Curated CS roles &mdash; Bangalore, India &amp; Remote
                </p>
              </div>

              <div className="space-y-4">
                {result.data.length === 0 && (
                  <div className="py-20 flex flex-col items-center justify-center text-center bg-surface border-3 border-black rounded-[20px] brutal-shadow-md">
                    <Briefcase className="w-10 h-10 mb-4" />
                    <p className="text-title font-extrabold mb-1">No matches found</p>
                    <p className="text-body font-medium text-text-secondary">
                      Try adjusting your filters or search query.
                    </p>
                  </div>
                )}
                {result.data.map((job) => (
                  <JobCard key={job.id} job={job} />
                ))}
              </div>

              <Pagination currentPage={result.page} totalPages={result.totalPages} />
            </div>
          </section>

          {/* Right: Detail Panel — independent scroll */}
          {selectedId && (
            <aside className="w-[420px] shrink-0 overflow-hidden">
              <div className="h-full overflow-y-auto custom-scrollbar">
                <JobDetailPanel jobs={result.data} />
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
