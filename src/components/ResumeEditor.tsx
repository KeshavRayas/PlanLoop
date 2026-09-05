"use client";

import { useState, useEffect } from "react";
import type { ResumeData } from "@/lib/resume.types";
import { ResumeForm } from "./ResumeForm";
import { LatexEditor } from "./LatexEditor";
import { Briefcase, MapPin, Clock, ArrowUpRight } from "lucide-react";
import { formatDaysAgo, formatSalary } from "@/lib/utils";
import type { JobSearchResult } from "@/lib/types";

type ResumeEditorProps = {
  resumeId?: string;
  initialData: ResumeData;
  initialTitle: string;
  jobId?: string;
};

export function ResumeEditor({
  resumeId,
  initialData,
  initialTitle,
  jobId,
}: ResumeEditorProps) {
  const [job, setJob] = useState<JobSearchResult | null>(null);
  const jobLoading = !!jobId && !job;

  useEffect(() => {
    if (!jobId) return;
    fetch(`/api/jobs/${jobId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setJob(data))
      .catch(() => setJob(null));
  }, [jobId]);

  const isLatex =
    initialData.originalFormat === "tex" ||
    (initialData.sections.length === 1 &&
      initialData.sections[0]?.type === "custom" &&
      initialData.sections[0]?.title === "LaTeX Document");

  if (isLatex) {
    return (
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
          <LatexEditor
            resumeId={resumeId}
            initialData={initialData}
            initialTitle={initialTitle}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className="flex-1 min-w-0 overflow-hidden flex flex-col">
        <ResumeForm
          resumeId={resumeId}
          initialData={initialData}
          initialTitle={initialTitle}
        />
      </div>

      {jobId && (
        <aside className="w-[420px] shrink-0 border-l-4 border-black overflow-hidden flex flex-col bg-surface">
          {jobLoading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-body font-medium text-text-secondary">
                Loading job...
              </p>
            </div>
          ) : job ? (
            <>
              <div className="bg-yellow border-b-4 border-black px-6 py-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
                    <Briefcase className="w-4 h-4 text-yellow" />
                  </div>
                  <span className="text-title font-extrabold">
                    Job Description
                  </span>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
                <div>
                  <h2 className="text-title font-extrabold leading-tight">
                    {job.title}
                  </h2>
                  <p className="text-body font-bold text-text-secondary mt-1">
                    {job.company.name}
                  </p>
                </div>

                <hr className="border-t-3 border-black" />

                <div className="space-y-2.5">
                  {job.location && (
                    <div className="flex items-center gap-2.5">
                      <MapPin className="w-4 h-4 shrink-0" />
                      <span className="text-body font-medium">
                        {job.location}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 shrink-0" />
                    <span className="text-body font-medium">
                      {formatDaysAgo(job.postedAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 border-3 border-black rounded-[14px] bg-surface-secondary">
                  <span className="text-title font-extrabold">
                    {formatSalary(
                      job.salaryMin ?? undefined,
                      job.salaryMax ?? undefined,
                      job.salaryCurr ?? undefined,
                    )}
                  </span>
                </div>

                {job.skills.length > 0 && (
                  <div>
                    <h3 className="text-title font-extrabold mb-3">
                      Required Skills
                    </h3>
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
                  </div>
                )}

                <div>
                  <h3 className="text-title font-extrabold mb-3">
                    Description
                  </h3>
                  <p className="text-body font-medium text-text-secondary leading-relaxed whitespace-pre-line">
                    {job.description}
                  </p>
                </div>

                <a
                  href={job.applyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-green text-black font-extrabold px-5 py-2.5 rounded-full border-3 border-black brutal-shadow-sm brutal-hover text-label uppercase tracking-widest"
                >
                  Apply
                  <ArrowUpRight className="w-4 h-4" />
                </a>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-full p-6 text-center">
              <p className="text-body font-medium text-text-secondary">
                Job not found
              </p>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
