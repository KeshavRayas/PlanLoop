import { z } from "zod";

// ─── Cover letter contract (Phase 3A) ────────────────────────────────────────
// Reuses existing JobAnalysis + current TailoredResume — never re-analyzes the
// job. Every achievement/experience claim must trace to base-resume evidence;
// the model may rephrase but never invent. Deterministic validation
// (validate.ts) enforces evidence-ID integrity; no model involved.

export const coverLetterSchema = z.object({
  subject: z.string().max(200).optional(),
  greeting: z.string().min(1).max(200),
  paragraphs: z.array(z.string().min(1).max(2000)).min(3).max(6),
  closing: z.string().min(1).max(500),
  evidenceIds: z.array(z.string().min(1)).min(1).max(20),
});

export type CoverLetterData = z.infer<typeof coverLetterSchema>;

export const COVER_SYSTEM_PROMPT = [
  "Answer DIRECTLY in this response. Do NOT use any tools. Do NOT explore files. Do NOT run commands.",
  "Your entire reply must be ONLY a JSON object matching the requested shape.",
  "Every achievement or experience claim must come from the EVIDENCE items below. Citing a source ID you were not given is forbidden.",
  "Forbidden: new skills, new employers, new numbers, new dates, new degrees. If the evidence lacks something the job wants, leave the gap out of the letter — never invent it.",
].join(" ");

export interface CoverPromptInput {
  jobTitle: string;
  companyName: string;
  location?: string | null;
  analysisSummary: string;
  requiredSkills: string[];
  missingSkills: string[];
  verdict: string;
  tailoredHighlights: string[];
  evidence: { id: string; kind: string; text: string }[];
}

export function buildCoverPrompt(input: CoverPromptInput): string {
  const evidenceBlock = input.evidence
    .map((e) => `[${e.id} | ${e.kind}] ${e.text}`)
    .join("\n");
  return [
    "Write a cover letter for the JOB below, using the ANALYSIS and the TAILORED HIGHLIGHTS. Address the company's needs with evidence-backed achievements only.",
    "Cite every achievement's source in evidenceIds (evidence IDs used).",
    "Return ONLY this JSON shape and nothing else:",
    '{"subject": string (optional), "greeting": string, "paragraphs": string[3..6], "closing": string, "evidenceIds": string[1..20]}',
    "Example:",
    '{"greeting": "Dear Hiring Manager,", "paragraphs": ["I am excited to apply for ...", "At Acme I built ...", "Thank you for your consideration."], "closing": "Sincerely, Jane", "evidenceIds": ["bullet_erp_02"]}',
    "",
    `JOB: ${input.jobTitle} at ${input.companyName} (${input.location ?? "location n/a"})`,
    `ANALYSIS: ${input.analysisSummary}`,
    `Required: ${input.requiredSkills.join(", ") || "none listed"}`,
    `Known gaps (leave out of the letter, do not fill): ${input.missingSkills.join(", ") || "none"}`,
    `Verdict: ${input.verdict}`,
    `Tailored highlights: ${input.tailoredHighlights.join(" | ") || "none"}`,
    "",
    "EVIDENCE (only facts you may use):",
    evidenceBlock,
    "",
    "Reminder: no tools. Reply with ONLY the JSON object.",
  ].join("\n");
}
