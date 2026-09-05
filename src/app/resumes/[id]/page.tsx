"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { ResumeEditor } from "@/components/ResumeEditor";
import { defaultResumeData } from "@/lib/resume.utils";
import type { ResumeData } from "@/lib/resume.types";
import { Loader2, FileText } from "lucide-react";
import Link from "next/link";

export default function EditResumePage() {
  const { id } = useParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [data, setData] = useState<ResumeData>(defaultResumeData());
  const [title, setTitle] = useState("My Resume");

  useEffect(() => {
    if (!id) return;
    fetch(`/api/resumes/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error("Not found");
        return res.json();
      })
      .then((resume) => {
        setData((resume.content as ResumeData) || defaultResumeData());
        setTitle(resume.title || "My Resume");
        setLoading(false);
      })
      .catch(() => {
        setNotFound(true);
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="bg-surface border-4 border-black rounded-[24px] brutal-shadow-lg px-10 py-12 text-center max-w-md">
          <FileText className="w-10 h-10 mx-auto mb-4" />
          <h1 className="text-headline font-extrabold mb-3">
            Resume not found
          </h1>
          <Link
            href="/resumes"
            className="inline-flex items-center gap-2 bg-black text-white font-extrabold px-6 py-3 rounded-full border-3 border-black text-label uppercase tracking-widest"
          >
            Back to Resumes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-hidden flex flex-col bg-bg">
      <ResumeEditor resumeId={id} initialData={data} initialTitle={title} />
    </div>
  );
}
