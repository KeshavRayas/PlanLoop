import { notFound } from "next/navigation";
import { getJobById } from "@/lib/repositories/jobs.repository";
import { formatDaysAgo, formatSalary } from "@/lib/utils";
import { Briefcase, MapPin, Clock, ArrowUpRight, DollarSign, FileText } from "lucide-react";
import Link from "next/link";

type Params = Promise<{ id: string }>;

export default async function JobDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const job = await getJobById(id);

  if (!job) notFound();

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-6 pt-6">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-label font-extrabold uppercase tracking-widest border-3 border-black px-4 py-2 rounded-full hover:bg-black hover:text-white transition-[150ms]"
        >
          &larr; Back to Jobs
        </Link>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-6 pb-12">
        <div className="bg-surface border-4 border-black rounded-[24px] brutal-shadow-lg overflow-hidden">
          {/* Yellow header */}
          <div className="bg-yellow px-8 py-6 border-b-4 border-black">
              <div className="flex items-start">
                <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full border-4 border-black flex items-center justify-center bg-white shrink-0">
                  <span className="text-headline font-black">
                    {job.company.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="text-label font-extrabold uppercase tracking-widest text-text-secondary mb-1">
                    {job.company.companyType === "STARTUP" ? "Startup" : "MNC"}
                  </p>
                  <h1 className="text-headline font-extrabold leading-tight">
                    {job.title}
                  </h1>
                  <p className="text-body font-bold mt-1 text-text-secondary">
                    {job.company.name}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {/* Meta */}
            <div className="flex flex-wrap gap-6">
              {job.location && (
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  <span className="text-body font-medium">{job.location}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="text-body font-medium">{formatDaysAgo(job.postedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4" />
                <span className="text-body font-medium">
                  {job.workMode === "REMOTE" ? "Remote"
                    : job.workMode === "HYBRID" ? "Hybrid"
                    : "On-site"}
                </span>
              </div>
            </div>

            {/* Salary */}
            <div className="flex items-center gap-3 p-4 border-3 border-black rounded-[14px] bg-surface-secondary">
              <DollarSign className="w-5 h-5 shrink-0" />
              <span className="text-title font-extrabold">
                {formatSalary(job.salaryMin ?? undefined, job.salaryMax ?? undefined, job.salaryCurr ?? undefined)}
              </span>
            </div>

            {/* Skills */}
            {job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {job.skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2.5 py-1 rounded-full bg-[#F3F3F3] text-label font-bold"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <hr className="border-3 border-black" />

            {/* Description */}
            <article>
              <h2 className="text-title font-extrabold mb-3">About the Role</h2>
              <p className="text-body font-medium text-text-secondary leading-relaxed">
                {job.description}
              </p>
            </article>

            {/* Actions */}
            <div className="pt-2 flex flex-col md:flex-row gap-3">
              <a
                href={job.applyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-green text-black font-extrabold px-6 py-3 rounded-full border-3 border-black brutal-shadow-md brutal-hover text-label uppercase tracking-widest"
              >
                Apply Now
                <ArrowUpRight className="w-4 h-4" />
              </a>
              <a
                href={`/resumes/new?job=${job.id}`}
                className="inline-flex items-center gap-2 bg-surface text-text font-extrabold px-6 py-3 rounded-full border-3 border-black brutal-hover text-label uppercase tracking-widest hover:bg-black hover:text-white"
              >
                <FileText className="w-4 h-4" />
                Create Resume
              </a>

            </div>

            {job.externalId && (
              <p className="text-label font-bold text-text-secondary">
                Source: {job.source} &middot; ID: {job.externalId}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
