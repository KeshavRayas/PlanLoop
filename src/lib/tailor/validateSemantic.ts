import { prisma } from "@/lib/prisma";
import {
  VALIDATOR_SYSTEM_PROMPT,
  buildValidatePrompt,
  semanticResultSchema,
  type SemanticResult,
} from "@/lib/tailor/semantic";
import { collectEvidence } from "@/lib/tailor/evidence";
import { tailoredResumeSchema } from "@/lib/tailor/contract";
import { getDefaultProvider } from "@/lib/analysis/service";
import type { LlmProvider } from "@/lib/llm/types";
import type { ResumeData } from "@/lib/resume.types";
import type { TailorValidationStatus } from "@/generated/prisma/enums";

export class NothingToValidateError extends Error {
  constructor() {
    super("tailor the resume before validating — no TailoredResume found");
    this.name = "NothingToValidateError";
  }
}

export class SemanticValidationError extends Error {
  constructor(detail: string) {
    super(`validator returned invalid result: ${detail}`);
    this.name = "SemanticValidationError";
  }
}

/**
 * LLM semantic validation (Phase 2.3). Judge-only: persists
 * SEMANTIC_VALID / SEMANTIC_INVALID + issues on the TailoredResume.
 * Any HIGH issue forces invalid regardless of the model's valid flag.
 */
export async function validateTailored(
  jobId: string,
  provider: LlmProvider = getDefaultProvider(),
): Promise<{ status: TailorValidationStatus; result: SemanticResult }> {
  const tailored = await prisma.tailoredResume.findFirst({
    where: { jobId, isCurrent: true },
    orderBy: { version: "desc" },
  });
  if (!tailored) throw new NothingToValidateError();

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    include: { company: true },
  });
  if (!job) throw new Error(`job not found: ${jobId}`);

  const base = await prisma.resume.findUnique({
    where: { id: tailored.baseResumeId },
  });
  const content = base?.content as ResumeData | null;
  if (!content) throw new Error("base resume missing");

  const evidence = collectEvidence(content);
  const stored = tailoredResumeSchema.parse(tailored.content);

  const items = stored.sections.flatMap((s) =>
    s.items.map((item) => {
      const fields = item.fields as Record<string, unknown>;
      const text = Object.values(fields)
        .flatMap((v) =>
          typeof v === "string"
            ? [v]
            : Array.isArray(v)
              ? v.filter((x): x is string => typeof x === "string")
              : [],
        )
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      return { id: item.id, text, sourceIds: item.provenance.sourceIds };
    }),
  );

  const prompt = buildValidatePrompt({
    jobTitle: job.title,
    companyName: job.company.name,
    evidence: evidence.map((e) => ({ id: e.id, text: e.text })),
    items,
  });

  const raw = await provider.generateJson(VALIDATOR_SYSTEM_PROMPT, prompt);
  let parsed = semanticResultSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    console.error(
      `[validate] first attempt invalid for job ${jobId}: ${issues}`,
    );
    const retry = await provider.generateJson(
      VALIDATOR_SYSTEM_PROMPT,
      `Your previous output failed validation: ${issues}\nReturn ONLY the corrected JSON in exactly the requested shape.\n\n---\n\n${prompt}`,
    );
    parsed = semanticResultSchema.safeParse(retry);
    if (!parsed.success) {
      throw new SemanticValidationError(
        parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`)
          .join("; "),
      );
    }
    return persist(jobId, parsed.data);
  }
  return persist(jobId, parsed.data);
}

/**
 * The model does not get the final word on invented facts: any HIGH issue
 * forces the whole result invalid.
 */
export function applyHighRule(data: SemanticResult): {
  valid: boolean;
  forced: boolean;
} {
  const forced = data.issues.some((i) => i.severity === "HIGH");
  return { valid: data.valid && !forced, forced };
}

async function persist(
  jobId: string,
  data: SemanticResult,
): Promise<{ status: TailorValidationStatus; result: SemanticResult }> {
  // Any HIGH issue forces invalid — the model does not get the final word
  // on invented facts.
  const { valid, forced } = applyHighRule(data);
  const result: SemanticResult = forced
    ? { valid: false, issues: data.issues }
    : data;
  const status: TailorValidationStatus = valid
    ? "SEMANTIC_VALID"
    : "SEMANTIC_INVALID";

  const current = await prisma.tailoredResume.findFirst({
    where: { jobId, isCurrent: true },
    orderBy: { version: "desc" },
    select: { id: true },
  });
  if (!current) throw new NothingToValidateError();
  await prisma.tailoredResume.update({
    where: { id: current.id },
    data: {
      validationStatus: status,
      validationResult: { ...result, highForced: forced } as object,
      validatedAt: new Date(),
    },
  });
  return { status, result };
}

export async function getValidation(jobId: string) {
  const tailored = await prisma.tailoredResume.findFirst({
    where: { jobId, isCurrent: true },
    orderBy: { version: "desc" },
  });
  if (!tailored) throw new NothingToValidateError();
  return {
    status: tailored.validationStatus,
    result: tailored.validationResult,
    validatedAt: tailored.validatedAt,
  };
}
