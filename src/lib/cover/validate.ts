import type { CoverLetterData } from "@/lib/cover/contract";

// ─── Deterministic cover-letter validation (Phase 3A) ────────────────────────
// No model involved. Checks evidence-ID integrity against the base resume's
// evidence map (id → normalized text), mirroring validateTailoredResume.

export interface CoverValidationIssue {
  type: "UNKNOWN_SOURCE" | "EMPTY_SOURCES" | "DUPLICATE_EVIDENCE";
  text: string;
}

export function validateCoverLetter(
  output: CoverLetterData,
  evidence: Map<string, string>
): CoverValidationIssue[] {
  const issues: CoverValidationIssue[] = [];

  if (output.evidenceIds.length === 0) {
    issues.push({ type: "EMPTY_SOURCES", text: "no evidence cited" });
    return issues;
  }

  const seen = new Set<string>();
  for (const src of output.evidenceIds) {
    if (seen.has(src)) {
      issues.push({ type: "DUPLICATE_EVIDENCE", text: `duplicate evidence id: ${src}` });
    }
    seen.add(src);
    if (!evidence.has(src)) {
      issues.push({ type: "UNKNOWN_SOURCE", text: `cites unknown evidence: ${src}` });
    }
  }

  return issues;
}
