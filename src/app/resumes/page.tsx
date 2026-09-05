import { prisma } from "@/lib/prisma";
import { APP_NAME } from "@/lib/constants";
import { FileText, Plus, Briefcase } from "lucide-react";
import Link from "next/link";
import { ResumeUploadButton } from "@/components/ResumeUploadButton";
import { DeleteResumeButton } from "@/components/DeleteResumeButton";
export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const resumes = await prisma.resume.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      skills: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <header className="shrink-0 px-6 pt-6">
        <div className="max-w-5xl mx-auto bg-surface border-4 border-black rounded-[24px] brutal-shadow-lg px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 rounded-full border-4 border-black flex items-center justify-center bg-yellow shrink-0">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-display font-black leading-none">Resumes</h1>
              <p className="text-body font-medium text-text-secondary mt-1.5">
                {APP_NAME} &middot; {resumes.length} saved
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-10 h-10 rounded-full border-3 border-black flex items-center justify-center hover:bg-black hover:text-white transition-[150ms]"
            >
              <Briefcase className="w-4 h-4" />
            </Link>
            <ResumeUploadButton variant="button" />
            <Link
              href="/resumes/new"
              className="bg-green text-black font-extrabold px-5 py-2.5 rounded-full border-3 border-black brutal-shadow-sm brutal-hover text-label uppercase tracking-widest inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              New Resume
            </Link>
          </div>
        </div>
      </header>

      <div className="flex-1 px-6 pt-8 pb-6">
        <div className="max-w-5xl mx-auto">
          {resumes.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center text-center bg-surface border-3 border-black rounded-[20px] brutal-shadow-md">
              <FileText className="w-10 h-10 mb-4" />
              <p className="text-title font-extrabold mb-1">No resumes yet</p>
              <p className="text-body font-medium text-text-secondary mb-6">
                Create your first resume to tailor for job applications.
              </p>
              <Link
                href="/resumes/new"
                className="inline-flex items-center gap-2 bg-green text-black font-extrabold px-6 py-3 rounded-full border-3 border-black brutal-shadow-sm brutal-hover text-label uppercase tracking-widest"
              >
                <Plus className="w-4 h-4" />
                Create Resume
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {resumes.map((r) => (
                <ResumeItemCard
                  key={r.id}
                  id={r.id}
                  title={r.title}
                  skills={r.skills}
                  updatedAt={r.updatedAt}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ResumeItemCard({
  id,
  title,
  skills,
  updatedAt,
}: {
  id: string;
  title: string;
  skills: string[];
  updatedAt: Date;
}) {
  return (
    <div className="bg-surface border-3 border-black rounded-[20px] brutal-shadow-md p-6 flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full border-3 border-black flex items-center justify-center bg-surface-secondary shrink-0">
            <FileText className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h3 className="text-title font-extrabold leading-tight truncate">
              {title}
            </h3>
            <p className="text-label font-bold text-text-secondary">
              Updated{" "}
              {new Date(updatedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </p>
          </div>
        </div>
        <DeleteResumeButton id={id} />
      </div>

      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {skills.slice(0, 6).map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 rounded-full bg-[#F3F3F3] text-label font-bold"
            >
              {s}
            </span>
          ))}
          {skills.length > 6 && (
            <span className="px-2 py-0.5 rounded-full bg-[#F3F3F3] text-label font-bold">
              +{skills.length - 6}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto pt-2">
        <a
          href={`/resumes/${id}`}
          className="flex-1 flex items-center justify-center gap-1.5 bg-black text-white font-extrabold px-4 py-2 rounded-full border-3 border-black text-label uppercase tracking-widest hover:opacity-90 transition-[150ms]"
        >
          Edit
        </a>
        <a
          href={`/api/resumes/${id}/download`}
          className="flex items-center justify-center gap-1.5 bg-surface text-black font-extrabold px-4 py-2 rounded-full border-3 border-black text-label uppercase tracking-widest hover:bg-black hover:text-white transition-[150ms]"
        >
          Download
        </a>
      </div>
    </div>
  );
}
