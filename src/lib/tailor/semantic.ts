import { z } from "zod";

// ─── Semantic validation contract (Phase 2.3) ────────────────────────────────
// Judge-only: answers whether tailored claims are supported by base-resume
// evidence. Never rewrites. The job description is deliberately NOT sent —
// it must never become evidence for what the candidate has done.

export const semanticIssueTypeSchema = z.enum([
  "UNSUPPORTED_CLAIM",
  "INFLATED_CLAIM",
  "NEW_TECHNOLOGY",
  "NEW_METRIC",
  "ROLE_MISMATCH",
]);

export const severitySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const semanticIssueSchema = z.object({
  itemId: z.string().min(1).max(100),
  type: semanticIssueTypeSchema,
  severity: severitySchema,
  explanation: z.string().min(1).max(500),
});

export const semanticResultSchema = z.object({
  valid: z.boolean(),
  issues: z.array(semanticIssueSchema).max(50),
});

export type SemanticResult = z.infer<typeof semanticResultSchema>;
export type SemanticIssue = z.infer<typeof semanticIssueSchema>;

export const VALIDATOR_SYSTEM_PROMPT = [
  "Answer DIRECTLY in this response. Do NOT use any tools. Do NOT explore files. Do NOT run commands.",
  "Your entire reply must be ONLY a JSON object matching the requested shape.",
  "You are a strict evidence checker, not an editor. Judge support; propose no rewrites.",
  "Only the EVIDENCE items below count as support. The JOB TITLE is context for role mismatch only — it proves nothing about the candidate.",
].join(" ");

export interface ValidatePromptInput {
  jobTitle: string;
  companyName: string;
  evidence: { id: string; text: string }[];
  items: { id: string; text: string; sourceIds: string[] }[];
}

export function buildValidatePrompt(input: ValidatePromptInput): string {
  const evidenceBlock = input.evidence
    .map((e) => `[${e.id}] ${e.text}`)
    .join("\n");
  const itemsBlock = input.items
    .map(
      (i) =>
        `- item ${i.id} (cites: ${i.sourceIds.join(", ") || "none"}): ${i.text}`,
    )
    .join("\n");
  return [
    "Check each TAILORED item against the EVIDENCE. Flag escalation: added scope (INFLATED_CLAIM), technologies/metrics/roles absent from evidence (NEW_TECHNOLOGY, NEW_METRIC, ROLE_MISMATCH), or claims with no support at all (UNSUPPORTED_CLAIM). Rephrasing and combining cited evidence is fine.",
    "Severity: HIGH = invented fact a recruiter would verify (new employer, metric, technology, degree). MEDIUM = inflated scope. LOW = wording stretch that stays truthful.",
    "Return ONLY this JSON shape and nothing else:",
    '{"valid": boolean, "issues": [{"itemId": string, "type": "UNSUPPORTED_CLAIM"|"INFLATED_CLAIM"|"NEW_TECHNOLOGY"|"NEW_METRIC"|"ROLE_MISMATCH", "severity": "LOW"|"MEDIUM"|"HIGH", "explanation": string}]}',
    "Set valid=false when any MEDIUM or HIGH issue exists. Empty issues with valid=true when everything is supported.",
    "Example supported item: evidence [bullet_erp_02] says building backend APIs; tailored says backend API development with PostgreSQL. Verdict: no issue.",
    'Example violation: evidence says used PostgreSQL; tailored says architected PostgreSQL infrastructure handling millions of requests. Verdict: {"itemId": "...", "type": "INFLATED_CLAIM", "severity": "HIGH", "explanation": "..."}.',
    "",
    `JOB (context only, not evidence): ${input.jobTitle} at ${input.companyName}`,
    "",
    "EVIDENCE:",
    evidenceBlock,
    "",
    "TAILORED ITEMS:",
    itemsBlock,
    "",
    "Reminder: no tools. Reply with ONLY the JSON object.",
  ].join("\n");
}
