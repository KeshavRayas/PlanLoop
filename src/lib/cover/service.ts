import { prisma } from "@/lib/prisma";
import {
  COVER_SYSTEM_PROMPT,
  buildCoverPrompt,
  coverLetterSchema,
  type CoverLetterData,
} from "@/lib/cover/contract";
import { validateCoverLetter } from "@/lib/cover/validate";
import { collectEvidence, evidenceMap } from "@/lib/tailor/evidence";
import type { ResumeData } from "@/lib/resume.types";
import { hasResumeContent } from "@/lib/resume.utils";
import { getDefaultProvider, setDefaultProvider } from "@/lib/analysis/service";
import { EmptyResumeError, getBaseResume } from "@/lib/tailor/service";
import type { LlmProvider } from "@/lib/llm/types";
import { generateJsonSanitized } from "@/lib/llm/sanitize";

export class NeedsAnalysisError extends Error {
  constructor() {
    super("analyze the job before writing a cover letter — no JobAnalysis found");
    this.name = "NeedsAnalysisError";
  }
}

export class NeedsTailoredResumeError extends Error {
  constructor() {
    super("tailor a resume before writing a cover letter — no current TailoredResume found");
    this.name = "NeedsTailoredResumeError";
  }
}

export class CoverValidationError extends Error {
  constructor(detail: string) {
    super(`cover letter failed validation: ${detail}`);
    this.name = "CoverValidationError";
  }
}

export { setDefaultProvider, EmptyResumeError };

export async function getCoverLetter(jobId: string) {
  return prisma.coverLetter.findUnique({ where: { jobId } });
}

/**
 * Flatten a persisted tailored-resume content blob into short highlight
 * strings for the cover prompt. The blob is the canonical shape
 * ({sections: [{items: [{fields}]}]}), but this stays defensive: unknown
 * shapes yield an empty list rather than throwing.
 */
export function extractTailoredHighlights(content: unknown, limit = 8): string[] {
  if (!content || typeof content !== "object") return [];
  const sections = (content as { sections?: unknown }).sections;
  if (!Array.isArray(sections)) return [];
  const out: string[] = [];
  for (const section of sections) {
    if (!section || typeof section !== "object") continue;
    const items = (section as { items?: unknown }).items;
    if (!Array.isArray(items)) continue;
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const fields = (item as { fields?: unknown }).fields;
      if (!fields || typeof fields !== "object") continue;
      const parts: string[] = [];
      for (const value of Object.values(fields as Record<string, unknown>)) {
        if (typeof value === "string" && value.trim()) parts.push(value.trim());
        else if (Array.isArray(value)) {
          for (const v of value) {
            if (typeof v === "string" && v.trim()) parts.push(v.trim());
          }
        }
      }
      if (parts.length > 0) {
        out.push(parts.join(" ").replace(/\s+/g, " ").trim());
        if (out.length >= limit) return out;
      }
    }
  }
  return out;
}

/**
 * Generate a cover letter for a job (Phase 3A). Reuses the existing
 * JobAnalysis + current TailoredResume — never re-analyzes the job.
 * Only validated output persists; JobMatch.score is never touched.
 */
export async function generateCoverLetter(
  jobId: string,
  provider: LlmProvider = getDefaultProvider()
): Promise<{ cover: CoverLetterData & { id: string }; cached: false }> {
  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { company: true, analysis: true },
  });
  if (!job) throw new Error(`job not found: ${jobId}`);
  if (!job.analysis) throw new NeedsAnalysisError();

  const tailored = await prisma.tailoredResume.findFirst({
    where: { jobId, isCurrent: true },
    orderBy: { version: "desc" },
  });
  if (!tailored) throw new NeedsTailoredResumeError();

  const base = await getBaseResume();
  const content = base?.content as ResumeData | null;
  if (!base || !content || !hasResumeContent(content)) throw new EmptyResumeError();

  const evidence = collectEvidence(content);
  const evidenceById = evidenceMap(content);

  const prompt = buildCoverPrompt({
    jobTitle: job.title,
    companyName: job.company.name,
    location: job.location,
    analysisSummary: job.analysis.summary,
    requiredSkills: job.analysis.requiredSkills,
    missingSkills: job.analysis.missingSkills,
    verdict: job.analysis.verdict,
    tailoredHighlights: extractTailoredHighlights(tailored.content),
    evidence,
  });

  const raw = await generateJsonSanitized(provider, COVER_SYSTEM_PROMPT, prompt);
  let parsed = coverLetterSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    console.error(`[cover] schema invalid for job ${jobId}: ${issues}`);
    const retry = await generateJsonSanitized(provider, 
      COVER_SYSTEM_PROMPT,
      `Your previous output failed validation: ${issues}\nReturn ONLY the corrected JSON in exactly the requested shape.\n\n---\n\n${prompt}`
    );
    parsed = coverLetterSchema.safeParse(retry);
    if (!parsed.success) {
      throw new CoverValidationError(
        parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")
      );
    }
    return persistValidated(jobId, base.id, parsed.data, evidenceById, retry);
  }

  return persistValidated(jobId, base.id, parsed.data, evidenceById, raw);
}

async function persistValidated(
  jobId: string,
  baseResumeId: string,
  data: CoverLetterData,
  evidenceById: Map<string, string>,
  raw: unknown
): Promise<{ cover: CoverLetterData & { id: string }; cached: false }> {
  const problems = validateCoverLetter(data, evidenceById);
  if (problems.length > 0) {
    console.error(`[cover] provenance invalid for job ${jobId}: ${JSON.stringify(problems).slice(0, 1000)}`);
    throw new CoverValidationError(problems.map((p) => p.text).join("; "));
  }
  const saved = await prisma.coverLetter.upsert({
    where: { jobId },
    create: {
      jobId,
      baseResumeId,
      content: {
        subject: data.subject,
        greeting: data.greeting,
        paragraphs: data.paragraphs,
        closing: data.closing,
      },
      evidenceIds: data.evidenceIds,
      rawJson: raw as object,
    },
    update: {
      baseResumeId,
      content: {
        subject: data.subject,
        greeting: data.greeting,
        paragraphs: data.paragraphs,
        closing: data.closing,
      },
      evidenceIds: data.evidenceIds,
      rawJson: raw as object,
    },
  });
  return { cover: { ...data, id: saved.id }, cached: false as const };
}
