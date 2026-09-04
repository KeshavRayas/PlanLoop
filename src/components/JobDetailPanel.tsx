"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, ArrowUpRight, Briefcase, MapPin, Clock, FileText, Sparkles } from "lucide-react";
import type { JobSearchResult } from "@/lib/types";
import { formatDaysAgo, formatSalary } from "@/lib/utils";

interface JobAnalysisView {
  id: string;
  summary: string;
  matchedSkills: string[];
  missingSkills: string[];
  potentialConcerns: string[];
  verdict: "STRONG" | "POSSIBLE" | "WEAK";
  verdictReasons: string[];
  cached?: boolean;
}

interface TailoredItemView {
  id: string;
  kind: string;
  fields: Record<string, string | boolean | string[]>;
  provenance: { sourceIds: string[]; change: "UNCHANGED" | "REWRITE" | "REORDER" | "COMBINE" };
}

interface TailoredSectionView {
  id: string;
  type: string;
  title: string;
  items: TailoredItemView[];
}

interface SemanticIssueView {
  itemId: string;
  type: string;
  severity: "LOW" | "MEDIUM" | "HIGH";
  explanation: string;
}

interface AtsResultView {
  textExtractable: boolean;
  charCount: number;
  sections: { summary: boolean; experience: boolean; education: boolean; skills: boolean };
  requiredSkillsFound: number;
  requiredSkillsTotal: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  keywordCoverage: number;
  warnings: string[];
}

interface TailoredResumeView {
  id: string;
  baseResumeId: string;
  version?: number;
  versionCount?: number;
  sections: TailoredSectionView[];
  validationStatus?: "STRUCTURAL_VALID" | "SEMANTIC_VALID" | "SEMANTIC_INVALID";
  validationResult?: { valid: boolean; issues: SemanticIssueView[] } | null;
  validatedAt?: string | null;
  renderStatus?: "PENDING" | "SUCCESS" | "FAILED";
  atsStatus?: "PENDING" | "CHECKED";
  atsResult?: AtsResultView | null;
  cached?: boolean;
}

interface CoverLetterView {
  id: string;
  content: {
    subject?: string;
    greeting: string;
    paragraphs: string[];
    closing: string;
  };
  cached?: boolean;
}

interface PrepQuestionView {
  question: string;
  whyAsked: string;
  evidenceIds: string[];
  answerStructure: string[];
  followUps: string[];
  starStory?: {
    situation: string;
    task: string;
    action: string;
    result: string;
    evidenceIds: string[];
  } | null;
}

interface InterviewPrepView {
  id: string;
  content: {
    technical: PrepQuestionView[];
    resumeBased: PrepQuestionView[];
    behavioral: PrepQuestionView[];
    toAsk: string[];
    gaps: { skill: string; bridgeAnswer: string }[];
  };
  cached?: boolean;
}

function renderTailoredFields(fields: TailoredItemView["fields"]): string {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (typeof value === "string" && value.trim()) parts.push(value.trim());
    else if (Array.isArray(value) && value.length > 0) parts.push(value.join(" • "));
  }
  return parts.join(" — ");
}

const CHANGE_STYLES: Record<TailoredItemView["provenance"]["change"], string> = {
  UNCHANGED: "bg-[#F3F3F3]",
  REWRITE: "bg-yellow",
  REORDER: "bg-purple text-white",
  COMBINE: "bg-green",
};

export function JobDetailPanel({ jobs }: { jobs: JobSearchResult[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selectedId = searchParams.get("selected");

  const job = useMemo(
    () => jobs.find((j) => j.id === selectedId) ?? null,
    [jobs, selectedId]
  );

  const [analysis, setAnalysis] = useState<JobAnalysisView | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [tailored, setTailored] = useState<TailoredResumeView | null>(null);
  const [tailoring, setTailoring] = useState(false);
  const [tailorError, setTailorError] = useState<string | null>(null);
  const [validating, setValidating] = useState(false);
  const [rendering, setRendering] = useState(false);

  const [cover, setCover] = useState<CoverLetterView | null>(null);
  const [covering, setCovering] = useState(false);
  const [coverError, setCoverError] = useState<string | null>(null);

  const [prep, setPrep] = useState<InterviewPrepView | null>(null);
  const [preparing, setPreparing] = useState(false);
  const [prepError, setPrepError] = useState<string | null>(null);

  const [decision, setDecision] = useState<string | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [liveness, setLiveness] = useState<{ alive: boolean; evidence: string | null } | null>(null);
  const [checkingLive, setCheckingLive] = useState(false);

  useEffect(() => {
    setAnalysis(null);
    setAnalysisError(null);
    setTailored(null);
    setTailorError(null);
    setCover(null);
    setCoverError(null);
    setPrep(null);
    setPrepError(null);
    setDecision(null);
    setLiveness(null);
    if (!selectedId) return;
    let cancelled = false;
    fetch(`/api/jobs/${selectedId}/analyze`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data) setAnalysis(data);
      })
      .catch(() => {});
    fetch(`/api/jobs/${selectedId}/tailor`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.sections) setTailored(data);
      })
      .catch(() => {});
    fetch(`/api/jobs/${selectedId}/decision`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.status && data.status !== "QUEUED") setDecision(data.status);
      })
      .catch(() => {});
    fetch(`/api/jobs/${selectedId}/cover`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.content) setCover(data);
      })
      .catch(() => {});
    fetch(`/api/jobs/${selectedId}/interview`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data?.content) setPrep(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function runJobPost<T>(
    busy: boolean,
    setBusy: (v: boolean) => void,
    setError: (e: string | null) => void,
    endpoint: string,
    refresh: boolean,
    fallback: string,
    onSuccess: (data: T) => void,
    blocked = false,
  ) {
    if (!selectedId || busy || blocked) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/jobs/${selectedId}${endpoint}${refresh ? "?refresh=1" : ""}`,
        { method: "POST" }
      );
      const data = (await res.json()) as T & { error?: string };
      if (!res.ok) throw new Error(data.error ?? fallback);
      onSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : fallback);
    } finally {
      setBusy(false);
    }
  }

  function runAnalysis(refresh: boolean) {
    return runJobPost(analyzing, setAnalyzing, setAnalysisError, "/analyze", refresh, "Analysis failed", setAnalysis);
  }

  function runTailor(refresh: boolean) {
    return runJobPost(tailoring, setTailoring, setTailorError, "/tailor", refresh, "Tailoring failed", setTailored, !analysis);
  }

  async function runValidation() {
    if (!selectedId || validating) return;
    setValidating(true);
    setTailorError(null);
    try {
      const res = await fetch(`/api/jobs/${selectedId}/validate`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Validation failed");
      const refreshed = await fetch(`/api/jobs/${selectedId}/tailor`).then((r) =>
        r.ok ? r.json() : null
      );
      if (refreshed?.sections) setTailored(refreshed);
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : "Validation failed");
    } finally {
      setValidating(false);
    }
  }

  async function runRender(refresh: boolean) {
    if (!selectedId || rendering) return;
    setRendering(true);
    setTailorError(null);
    try {
      const res = await fetch(
        `/api/jobs/${selectedId}/pdf${refresh ? "?refresh=1" : ""}`,
        { method: "POST" }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Render failed");
      const refreshed = await fetch(`/api/jobs/${selectedId}/tailor`).then((r) =>
        r.ok ? r.json() : null
      );
      if (refreshed?.sections) setTailored(refreshed);
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : "Render failed");
    } finally {
      setRendering(false);
    }
  }

  function runCover(refresh: boolean) {
    return runJobPost(covering, setCovering, setCoverError, "/cover", refresh, "Cover letter failed", setCover, !analysis || !tailored);
  }

  function runInterview(refresh: boolean) {
    return runJobPost(preparing, setPreparing, setPrepError, "/interview", refresh, "Interview prep failed", setPrep, !analysis || !tailored);
  }

  async function setJobDecision(status: string, openUrl = false) {
    if (!selectedId || deciding) return;
    setDeciding(true);
    try {
      const res = await fetch(`/api/jobs/${selectedId}/decision`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Decision failed");
      setDecision(data.status);
      // Opening the URL records OPENED — it never implies APPLIED.
      if (openUrl && job) window.open(job.applyUrl, "_blank", "noopener");
    } catch (err) {
      setTailorError(err instanceof Error ? err.message : "Decision failed");
    } finally {
      setDeciding(false);
    }
  }

  async function checkLiveness() {
    if (!selectedId || checkingLive) return;
    setCheckingLive(true);
    try {
      const res = await fetch(`/api/jobs/${selectedId}/liveness`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Liveness check failed");
      setLiveness({ alive: data.alive, evidence: data.evidence });
    } catch {
      setLiveness({ alive: false, evidence: "check failed" });
    } finally {
      setCheckingLive(false);
    }
  }

  function close() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("selected");
    router.push(`/?${params.toString()}`);
  }

  if (!selectedId) return null;

  const workModeLabel =
    job?.workMode === "REMOTE" ? "Remote"
    : job?.workMode === "HYBRID" ? "Hybrid"
    : "On-site";

  return (
    <div className="bg-white border border-black/10 rounded-[22px] overflow-hidden flex flex-col h-full calm-card">
      {/* Yellow header */}
      <div className="bg-[#FAFAF7] border-b border-black/10 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center">
            <Briefcase className="w-4 h-4 text-yellow" />
          </div>
          <span className="text-title font-extrabold">Job Detail</span>
        </div>
        <button
          onClick={close}
          className="w-9 h-9 rounded-full border border-black/10 flex items-center justify-center hover:bg-black hover:text-white transition-all duration-500"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {!job && (
          <div className="flex items-center justify-center h-full px-6">
            <div className="text-center">
              <span className="text-display block mb-4">👋</span>
              <p className="text-title font-extrabold mb-3">Select a role</p>
              <p className="text-body font-medium text-text-secondary leading-relaxed">
                View:<br />
                &bull; Requirements<br />
                &bull; Skills<br />
                &bull; Salary<br />
                &bull; Application link<br />
                &bull; Company details
              </p>
            </div>
          </div>
        )}

        {job && (
          <div className="p-6 space-y-6">
            {/* Header Section */}
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full border border-black/10 flex items-center justify-center bg-black/[0.03] shrink-0">
                <span className="text-title font-black">
                  {job.company.name.charAt(0)}
                </span>
              </div>
              <div>
                <span className="inline-block bg-purple text-white px-2.5 py-1 rounded-full text-label font-extrabold uppercase tracking-widest">
                  {job.company.companyType === "STARTUP" ? "Startup" : "MNC"}
                </span>
              </div>
            </div>

            {/* Job Meta Section */}
            <div>
              <h2 className="text-headline font-extrabold leading-tight">
                {job.title}
              </h2>
              <p className="text-body font-bold text-text-secondary mt-1">
                {job.company.name}
              </p>
            </div>

            <hr className="border-t border-black/10" />

            {/* Meta Section */}
            <div className="space-y-3">
              {job.location && (
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="text-body font-medium">{job.location}</span>
                </div>
              )}
              <div className="flex items-center gap-3">
                <Clock className="w-4 h-4 shrink-0" />
                <span className="text-body font-medium">{formatDaysAgo(job.postedAt)}</span>
              </div>
              <div className="flex items-center gap-3">
                <Briefcase className="w-4 h-4 shrink-0" />
                <span className="text-body font-medium">{workModeLabel}</span>
              </div>
            </div>

            {/* Salary Section */}
            <div className="flex items-center gap-3 p-4 border border-black/10 rounded-[14px] bg-black/[0.03]">
              <span className="text-title font-extrabold">
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryCurr)}
              </span>
            </div>

            {/* Skills / Tags Section */}
            {job.skills.length > 0 && (
              <div>
                <h3 className="text-title font-extrabold mb-3">Skills</h3>
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

            {/* About Section */}
            <div>
              <h3 className="text-title font-extrabold mb-3">About</h3>
              <p className="text-body font-medium text-text-secondary leading-relaxed line-clamp-4">
                {job.description}
              </p>
            </div>

            {/* AI Analysis Section */}
            <div className="p-4 border border-black/10 rounded-[14px] bg-black/[0.03] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-title font-extrabold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  AI Analysis
                </h3>
                {analysis && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-label font-extrabold uppercase tracking-widest border border-black/10 ${
                      analysis.verdict === "STRONG"
                        ? "bg-green"
                        : analysis.verdict === "POSSIBLE"
                          ? "bg-yellow"
                          : "bg-red text-white"
                    }`}
                  >
                    {analysis.verdict}
                  </span>
                )}
              </div>

              {analysis && (
                <div className="space-y-2">
                  <p className="text-body font-medium leading-relaxed">
                    {analysis.summary}
                  </p>
                  {analysis.verdictReasons.length > 0 && (
                    <ul className="text-body font-medium text-text-secondary leading-relaxed list-disc pl-5">
                      {analysis.verdictReasons.map((r) => (
                        <li key={r}>{r}</li>
                      ))}
                    </ul>
                  )}
                  {analysis.missingSkills.length > 0 && (
                    <p className="text-body font-medium">
                      <span className="font-extrabold">Gaps: </span>
                      {analysis.missingSkills.join(", ")}
                    </p>
                  )}
                  {analysis.potentialConcerns.length > 0 && (
                    <p className="text-body font-medium">
                      <span className="font-extrabold">Concerns: </span>
                      {analysis.potentialConcerns.join("; ")}
                    </p>
                  )}
                </div>
              )}

              {analysisError && (
                <p className="text-body font-bold text-red">{analysisError}</p>
              )}

              <button
                onClick={() => runAnalysis(!!analysis)}
                disabled={analyzing}
                className="w-full flex items-center justify-center gap-2 bg-black text-white font-extrabold px-4 py-3 rounded-full text-label uppercase tracking-widest transition-all duration-700 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {analyzing
                  ? "Analyzing…"
                  : analysis
                    ? "Re-analyze Job"
                    : "Analyze Job"}
              </button>
              <p className="text-label font-medium text-text-secondary">
                On-demand only — one model call per job, result is saved and
                reused. Re-analyze forces a fresh call.
              </p>
            </div>

            {/* Tailored Resume Section */}
            <div className="p-4 border border-black/10 rounded-[14px] bg-black/[0.03] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-title font-extrabold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Tailored Resume
                </h3>
                {tailored && (
                  <span className="px-2.5 py-1 rounded-full text-label font-extrabold uppercase tracking-widest border border-black/10 bg-green">
                    {tailored.sections.reduce((n, s) => n + s.items.length, 0)} items
                    {tailored.version ? ` · v${tailored.version}` : ""}
                    {tailored.versionCount && tailored.versionCount > 1 ? ` of ${tailored.versionCount}` : ""}
                  </span>
                )}
              </div>

              {tailored && (
                <div className="space-y-4">
                  {tailored.sections.map((section) => (
                    <div key={section.id}>
                      <p className="text-label font-extrabold uppercase tracking-widest mb-1.5">
                        {section.title}
                      </p>
                      <div className="space-y-1.5">
                        {section.items.map((item) => (
                          <div key={item.id} className="flex items-start gap-2">
                            <span
                              className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-label font-extrabold uppercase border-2 border-black ${CHANGE_STYLES[item.provenance.change]}`}
                            >
                              {item.provenance.change}
                            </span>
                            <p className="text-body font-medium leading-relaxed">
                              {renderTailoredFields(item.fields)}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {tailorError && (
                <p className="text-body font-bold text-red">{tailorError}</p>
              )}

              {tailored && (
                <div className="p-3 border border-black/10 rounded-[12px] bg-white space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-label font-extrabold uppercase tracking-widest">
                      Evidence check
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-full text-label font-extrabold uppercase tracking-widest border border-black/10 ${
                        tailored.validationStatus === "SEMANTIC_VALID"
                          ? "bg-green"
                          : tailored.validationStatus === "SEMANTIC_INVALID"
                            ? "bg-red text-white"
                            : "bg-yellow"
                      }`}
                    >
                      {tailored.validationStatus === "SEMANTIC_VALID"
                        ? "Valid"
                        : tailored.validationStatus === "SEMANTIC_INVALID"
                          ? "Issues found"
                          : "Structural only"}
                    </span>
                  </div>

                  {tailored.validationResult?.issues?.length ? (
                    <ul className="space-y-1.5">
                      {tailored.validationResult.issues.map((issue, i) => (
                        <li key={`${issue.itemId}-${i}`} className="text-body font-medium leading-relaxed">
                          <span className="font-extrabold">[{issue.severity}]</span>{" "}
                          <span className="font-bold">{issue.itemId}</span> —{" "}
                          {issue.explanation}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    tailored.validationStatus === "SEMANTIC_VALID" && (
                      <p className="text-body font-medium">
                        Every claim traces to base-resume evidence. Render the PDF below.
                      </p>
                    )
                  )}

                  <button
                    onClick={runValidation}
                    disabled={validating}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black font-extrabold px-4 py-2.5 rounded-full border border-black/10 text-label uppercase tracking-widest hover:bg-black hover:text-white transition-all duration-500 disabled:opacity-50"
                  >
                    {validating ? "Checking…" : "Check Evidence"}
                  </button>
                </div>
              )}

              <button
                onClick={() => runTailor(!!tailored)}
                disabled={tailoring || !analysis}
                className="w-full flex items-center justify-center gap-2 bg-black text-white font-extrabold px-4 py-3 rounded-full text-label uppercase tracking-widest transition-all duration-700 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                {tailoring
                  ? "Tailoring…"
                  : tailored
                    ? "Re-tailor Resume"
                    : "Tailor Resume"}
              </button>
              <p className="text-label font-medium text-text-secondary">
                {analysis
                  ? "Built from your base resume + the analysis above. Every item cites its evidence."
                  : "Analyze the job first — tailoring builds on the analysis."}
              </p>

              {tailored && tailored.validationStatus === "SEMANTIC_VALID" && (
                <div className="p-3 border border-black/10 rounded-[12px] bg-white space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-label font-extrabold uppercase tracking-widest">
                      PDF + ATS check
                    </span>
                    {tailored.renderStatus === "SUCCESS" && (
                      <a
                        href={`/api/jobs/${selectedId}/pdf/download`}
                        className="px-2.5 py-1 rounded-full text-label font-extrabold uppercase tracking-widest border border-black/10 bg-green"
                      >
                        Download
                      </a>
                    )}
                  </div>

                  {tailored.atsStatus === "CHECKED" && tailored.atsResult && (
                    <ul className="space-y-1">
                      <li className="text-body font-medium">
                        {tailored.atsResult.textExtractable ? "✓" : "✗"} PDF text is extractable
                      </li>
                      <li className="text-body font-medium">
                        {Object.values(tailored.atsResult.sections).every(Boolean) ? "✓" : "⚠"}{" "}
                        Sections detected ({Object.values(tailored.atsResult.sections).filter(Boolean).length}/4)
                      </li>
                      <li className="text-body font-medium">
                        {tailored.atsResult.missingKeywords.length === 0 ? "✓" : "⚠"}{" "}
                        {tailored.atsResult.requiredSkillsFound}/{tailored.atsResult.requiredSkillsTotal} required skills present
                      </li>
                      {tailored.atsResult.warnings.slice(0, 6).map((w) => (
                        <li key={w} className="text-body font-medium text-text-secondary">
                          ⚠ {w}
                        </li>
                      ))}
                    </ul>
                  )}

                  {tailored.renderStatus === "FAILED" && (
                    <p className="text-body font-bold text-red">
                      Render failed — check server logs. Content is untouched; fix the template and re-render.
                    </p>
                  )}

                  <button
                    onClick={() => runRender(tailored.renderStatus === "SUCCESS")}
                    disabled={rendering}
                    className="w-full flex items-center justify-center gap-2 bg-white text-black font-extrabold px-4 py-2.5 rounded-full border border-black/10 text-label uppercase tracking-widest hover:bg-black hover:text-white transition-all duration-500 disabled:opacity-50"
                  >
                    {rendering
                      ? "Rendering…"
                      : tailored.renderStatus === "SUCCESS"
                        ? "Re-render PDF"
                        : "Render PDF"}
                  </button>
                </div>
              )}
            </div>

            {/* Cover Letter Section */}
            <div className="p-4 border border-black/10 rounded-[14px] bg-black/[0.03] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-title font-extrabold flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  Cover letter
                </h3>
                {cover && (
                  <span className="px-2.5 py-1 rounded-full text-label font-extrabold uppercase tracking-widest border border-black/10 bg-white">
                    Saved
                  </span>
                )}
              </div>

              {cover && (
                <div className="p-3 border border-black/10 rounded-[12px] bg-white space-y-2">
                  {cover.content.subject && (
                    <p className="text-body font-extrabold leading-relaxed">
                      {cover.content.subject}
                    </p>
                  )}
                  <p className="text-body font-medium leading-relaxed">
                    {cover.content.greeting}
                  </p>
                  {cover.content.paragraphs.map((p) => (
                    <p key={p.slice(0, 32)} className="text-body font-medium leading-relaxed">
                      {p}
                    </p>
                  ))}
                  <p className="text-body font-medium leading-relaxed">
                    {cover.content.closing}
                  </p>
                </div>
              )}

              {coverError && (
                <p className="text-body font-bold text-red">{coverError}</p>
              )}

              <button
                onClick={() => runCover(!!cover)}
                disabled={covering || !analysis || !tailored}
                className="w-full flex items-center justify-center gap-2 bg-black text-white font-extrabold px-4 py-3 rounded-full text-label uppercase tracking-widest transition-all duration-700 disabled:opacity-50"
              >
                <FileText className="w-4 h-4" />
                {covering
                  ? "Writing…"
                  : cover
                    ? "Regenerate letter"
                    : "Write cover letter"}
              </button>
              <p className="text-label font-medium text-text-secondary">
                {analysis && tailored
                  ? "Built from the analysis + tailored resume above. Every claim cites base-resume evidence."
                  : "Analyze the job and tailor a resume first — the letter builds on both."}
              </p>
            </div>

            {/* Interview Prep Section */}
            <div className="p-4 border border-black/10 rounded-[14px] bg-black/[0.03] space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-title font-extrabold flex items-center gap-2">
                  <Sparkles className="w-4 h-4" />
                  Interview prep
                </h3>
                {prep && (
                  <span className="px-2.5 py-1 rounded-full text-label font-extrabold uppercase tracking-widest border border-black/10 bg-white">
                    Saved
                  </span>
                )}
              </div>

              {prep && (
                <div className="space-y-4">
                  {(
                    [
                      ["Technical", prep.content.technical],
                      ["Resume-based", prep.content.resumeBased],
                      ["Behavioral", prep.content.behavioral],
                    ] as const
                  ).map(([title, questions]) => (
                    <div key={title}>
                      <p className="text-label font-extrabold uppercase tracking-widest mb-1.5">
                        {title}
                      </p>
                      <div className="space-y-2.5">
                        {questions.map((q) => (
                          <div
                            key={q.question.slice(0, 48)}
                            className="p-3 border border-black/10 rounded-[12px] bg-white space-y-1.5"
                          >
                            <p className="text-body font-extrabold leading-relaxed">
                              {q.question}
                            </p>
                            <p className="text-body font-medium text-text-secondary leading-relaxed">
                              Why asked: {q.whyAsked}
                            </p>
                            <ul className="text-body font-medium text-text-secondary leading-relaxed list-disc pl-5">
                              {q.answerStructure.map((s) => (
                                <li key={s.slice(0, 40)}>{s}</li>
                              ))}
                            </ul>
                            {q.followUps.length > 0 && (
                              <p className="text-body font-medium text-text-secondary leading-relaxed">
                                Follow-ups: {q.followUps.join(" · ")}
                              </p>
                            )}
                            {q.starStory && (
                              <div className="p-2.5 border border-black/10 rounded-[10px] bg-black/[0.03] space-y-1">
                                <p className="text-label font-extrabold uppercase tracking-widest">
                                  STAR story
                                </p>
                                <p className="text-body font-medium leading-relaxed">
                                  <span className="font-extrabold">Situation:</span> {q.starStory.situation}
                                </p>
                                <p className="text-body font-medium leading-relaxed">
                                  <span className="font-extrabold">Task:</span> {q.starStory.task}
                                </p>
                                <p className="text-body font-medium leading-relaxed">
                                  <span className="font-extrabold">Action:</span> {q.starStory.action}
                                </p>
                                <p className="text-body font-medium leading-relaxed">
                                  <span className="font-extrabold">Result:</span> {q.starStory.result}
                                </p>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {prep.content.toAsk.length > 0 && (
                    <div>
                      <p className="text-label font-extrabold uppercase tracking-widest mb-1.5">
                        Ask them
                      </p>
                      <ul className="text-body font-medium leading-relaxed list-disc pl-5">
                        {prep.content.toAsk.map((q) => (
                          <li key={q.slice(0, 40)}>{q}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {prep.content.gaps.length > 0 && (
                    <div>
                      <p className="text-label font-extrabold uppercase tracking-widest mb-1.5">
                        Honest bridges
                      </p>
                      <div className="space-y-1.5">
                        {prep.content.gaps.map((g) => (
                          <p key={g.skill} className="text-body font-medium leading-relaxed">
                            <span className="font-extrabold">{g.skill}:</span> {g.bridgeAnswer}
                          </p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {prepError && (
                <p className="text-body font-bold text-red">{prepError}</p>
              )}

              <button
                onClick={() => runInterview(!!prep)}
                disabled={preparing || !analysis || !tailored}
                className="w-full flex items-center justify-center gap-2 bg-black text-white font-extrabold px-4 py-3 rounded-full text-label uppercase tracking-widest transition-all duration-700 disabled:opacity-50"
              >
                <Sparkles className="w-4 h-4" />
                {preparing
                  ? "Preparing…"
                  : prep
                    ? "Regenerate prep"
                    : "Prepare interview"}
              </button>
              <p className="text-label font-medium text-text-secondary">
                {analysis && tailored
                  ? "Grounded in your evidence. Gaps get honest bridges, never invented stories."
                  : "Analyze the job and tailor a resume first — prep builds on both."}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Sticky Footer — application lifecycle (2.5.3/2.5.4) */}
      {job && (
        <div className="sticky bottom-0 bg-white border-t border-black/10 px-6 py-5 shrink-0 z-10 space-y-3">
          {(decision || liveness) && (
            <div className="flex flex-wrap items-center gap-2">
              {decision && (
                <span className="px-2.5 py-1 rounded-full text-label font-extrabold uppercase tracking-widest border border-black/10 bg-purple text-white">
                  {decision}
                </span>
              )}
              {liveness && (
                <span
                  className={`px-2.5 py-1 rounded-full text-label font-extrabold uppercase tracking-widest border border-black/10 ${liveness.alive ? "bg-green" : "bg-red text-white"}`}
                  title={liveness.evidence ?? undefined}
                >
                  {liveness.alive ? "● Live" : "● Closed?"}
                </span>
              )}
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => setJobDecision("OPENED", true)}
              disabled={deciding}
              className="flex-1 flex items-center justify-center gap-2 bg-[#111] text-white font-semibold px-4 py-3 rounded-full text-[12px] uppercase tracking-widest transition-all duration-700 disabled:opacity-50"
            >
              Open Application
              <ArrowUpRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => setJobDecision("APPLIED")}
              disabled={deciding}
              className="flex-1 flex items-center justify-center gap-2 bg-black text-white font-extrabold px-4 py-3 rounded-full border border-black/10 text-label uppercase tracking-widest transition-all duration-700 disabled:opacity-50"
            >
              I&apos;ve Applied
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setJobDecision("SAVED")}
              disabled={deciding}
              className="flex-1 text-label font-extrabold uppercase tracking-widest px-3 py-2 rounded-full border border-black/10 hover:bg-black hover:text-white transition-all duration-500 disabled:opacity-50"
            >
              Save
            </button>
            <button
              onClick={() => setJobDecision("SKIPPED")}
              disabled={deciding}
              className="flex-1 text-label font-extrabold uppercase tracking-widest px-3 py-2 rounded-full border border-black/10 hover:bg-black hover:text-white transition-all duration-500 disabled:opacity-50"
            >
              Skip
            </button>
            <button
              onClick={checkLiveness}
              disabled={checkingLive}
              className="flex-1 text-label font-extrabold uppercase tracking-widest px-3 py-2 rounded-full border border-black/10 hover:bg-black hover:text-white transition-all duration-500 disabled:opacity-50"
            >
              {checkingLive ? "Checking…" : "Check live"}
            </button>
          </div>
          <p className="text-label font-medium text-text-secondary">
            Opening records OPENED only — confirm with I&apos;ve Applied after you submit.
          </p>
        </div>
      )}
    </div>
  );
}
