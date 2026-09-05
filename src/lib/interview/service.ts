import { prisma } from "@/lib/prisma";
import {
  INTERVIEW_SYSTEM_PROMPT,
  buildInterviewPrompt,
  interviewPrepSchema,
  type InterviewPrepData,
} from "@/lib/interview/contract";
import { validateInterviewPrep } from "@/lib/interview/validate";
import { collectEvidencePair } from "@/lib/tailor/evidence";
import { getDefaultProvider, setDefaultProvider } from "@/lib/analysis/service";
import {
  EmptyResumeError,
  requireBaseResumeContent,
} from "@/lib/tailor/service";
import { extractTailoredHighlights } from "@/lib/cover/service";
import type { LlmProvider } from "@/lib/llm/types";
import { generateJsonSanitized } from "@/lib/llm/sanitize";
import { parseWithSingleRetry } from "@/lib/llm/retry";

export class NeedsAnalysisError extends Error {
  constructor() {
    super(
      "analyze the job before preparing an interview — no JobAnalysis found",
    );
    this.name = "NeedsAnalysisError";
  }
}

export class NeedsValidTailoredResumeError extends Error {
  constructor(status: string) {
    super(
      `tailored resume must be SEMANTIC_VALID for interview prep (found ${status})`,
    );
    this.name = "NeedsValidTailoredResumeError";
  }
}

export class InterviewValidationError extends Error {
  constructor(detail: string) {
    super(`interview prep failed validation: ${detail}`);
    this.name = "InterviewValidationError";
  }
}

export { setDefaultProvider, EmptyResumeError };

export async function getInterviewPrep(jobId: string) {
  return prisma.interviewPrep.findUnique({ where: { jobId } });
}

/**
 * Relevant evidence slice: only what the current tailored resume actually
 * cites, plus skills/summary context for skill questions. Never the whole
 * resume blindly — keeps the prompt targeted and the output grounded.
 */
export function relevantEvidence(
  all: { id: string; kind: string; text: string }[],
  tailoredContent: unknown,
  limit = 30,
): { id: string; kind: string; text: string }[] {
  const cited = new Set<string>();
  const sections = (
    tailoredContent as {
      sections?: { items?: { provenance?: { sourceIds?: string[] } }[] }[];
    }
  )?.sections;
  if (Array.isArray(sections)) {
    for (const section of sections) {
      for (const item of section?.items ?? []) {
        for (const src of item?.provenance?.sourceIds ?? []) cited.add(src);
      }
    }
  }
  const picked: typeof all = [];
  const seen = new Set<string>();
  const take = (e: (typeof all)[number]) => {
    if (seen.has(e.id) || picked.length >= limit) return;
    seen.add(e.id);
    picked.push(e);
  };
  for (const e of all) if (cited.has(e.id)) take(e);
  for (const e of all) if (e.kind === "skills" || e.kind === "summary") take(e);
  for (const e of all) take(e);
  return picked;
}

/**
 * Generate interview prep for a job (Phase 3B). Reuses the existing
 * JobAnalysis + SEMANTIC_VALID current TailoredResume + gaps from
 * analysis.missingSkills — never re-analyzes. Only validated output
 * persists; JobMatch.score is never touched.
 */
export async function generateInterviewPrep(
  jobId: string,
  provider: LlmProvider = getDefaultProvider(),
): Promise<{ prep: InterviewPrepData & { id: string }; cached: false }> {
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
  if (!tailored) {
    throw new NeedsValidTailoredResumeError("none");
  }
  if (tailored.validationStatus !== "SEMANTIC_VALID") {
    throw new NeedsValidTailoredResumeError(tailored.validationStatus);
  }

  const { base, content } = await requireBaseResumeContent();

  const { evidence: allEvidence, evidenceById } = collectEvidencePair(content);
  const evidence = relevantEvidence(allEvidence, tailored.content);

  const prompt = buildInterviewPrompt({
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

  const raw = await generateJsonSanitized(
    provider,
    INTERVIEW_SYSTEM_PROMPT,
    prompt,
  );
  const { data, raw: validRaw } = await parseWithSingleRetry({
    schema: interviewPrepSchema,
    raw,
    jobId,
    logTag: "interview",
    provider,
    systemPrompt: INTERVIEW_SYSTEM_PROMPT,
    prompt,
    makeError: (detail) => new InterviewValidationError(detail),
  });

  return persistValidated(jobId, base.id, data, evidenceById, validRaw);
}

async function persistValidated(
  jobId: string,
  baseResumeId: string,
  data: InterviewPrepData,
  evidenceById: Map<string, string>,
  raw: unknown,
): Promise<{ prep: InterviewPrepData & { id: string }; cached: false }> {
  const problems = validateInterviewPrep(data, evidenceById);
  if (problems.length > 0) {
    console.error(
      `[interview] provenance invalid for job ${jobId}: ${JSON.stringify(problems).slice(0, 1000)}`,
    );
    throw new InterviewValidationError(problems.map((p) => p.text).join("; "));
  }
  const evidenceIds = [
    ...new Set(
      [...data.technical, ...data.resumeBased, ...data.behavioral].flatMap(
        (q) => {
          const base = [...q.evidenceIds];
          const story = (q as { starStory?: { evidenceIds?: string[] } })
            .starStory;
          if (story && Array.isArray(story.evidenceIds))
            base.push(...story.evidenceIds);
          return base;
        },
      ),
    ),
  ];
  const content = {
    technical: data.technical,
    resumeBased: data.resumeBased,
    behavioral: data.behavioral,
    toAsk: data.toAsk,
    gaps: data.gaps,
  };
  const shared = {
    baseResumeId,
    content,
    evidenceIds,
    rawJson: raw as object,
  };
  const saved = await prisma.interviewPrep.upsert({
    where: { jobId },
    create: { jobId, ...shared },
    update: shared,
  });
  return { prep: { ...data, id: saved.id }, cached: false as const };
}
