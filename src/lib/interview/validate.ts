import type { InterviewPrepData } from "@/lib/interview/contract";

// ─── Deterministic interview-prep validation (Phase 3B) ──────────────────────
// No model involved. Every evidenceIds[] — on questions and inside optional
// STAR stories — must resolve against the base resume's evidence map.

export interface InterviewValidationIssue {
  type: "UNKNOWN_SOURCE" | "EMPTY_SOURCES" | "DUPLICATE_EVIDENCE";
  text: string;
}

function checkIds(
  owner: string,
  ids: string[] | undefined,
  evidence: Map<string, string>,
  issues: InterviewValidationIssue[],
  { allowEmpty }: { allowEmpty: boolean },
): void {
  if (!ids || ids.length === 0) {
    if (!allowEmpty)
      issues.push({
        type: "EMPTY_SOURCES",
        text: `${owner}: no evidence cited`,
      });
    return;
  }
  const seen = new Set<string>();
  for (const src of ids) {
    if (seen.has(src)) {
      issues.push({
        type: "DUPLICATE_EVIDENCE",
        text: `${owner}: duplicate evidence id: ${src}`,
      });
    }
    seen.add(src);
    if (!evidence.has(src)) {
      issues.push({
        type: "UNKNOWN_SOURCE",
        text: `${owner} cites unknown evidence: ${src}`,
      });
    }
  }
}

export function validateInterviewPrep(
  output: InterviewPrepData,
  evidence: Map<string, string>,
): InterviewValidationIssue[] {
  const issues: InterviewValidationIssue[] = [];

  const allQuestions = [
    ...output.technical,
    ...output.resumeBased,
    ...output.behavioral,
  ];
  for (const q of allQuestions) {
    checkIds(
      `question "${q.question.slice(0, 60)}"`,
      q.evidenceIds,
      evidence,
      issues,
      {
        // toAsk-style items carry no evidence; technical/resume/behavioral must.
        allowEmpty: false,
      },
    );
    const story = (q as { starStory?: { evidenceIds?: string[] } }).starStory;
    if (story) {
      checkIds(
        `starStory for "${q.question.slice(0, 60)}"`,
        story.evidenceIds ?? [],
        evidence,
        issues,
        { allowEmpty: false },
      );
    }
  }

  return issues;
}
