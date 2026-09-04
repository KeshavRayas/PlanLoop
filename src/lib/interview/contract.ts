import { z } from "zod";

// ─── Interview prep contract (Phase 3B) ──────────────────────────────────────
// Reuses existing JobAnalysis + current SEMANTIC_VALID TailoredResume — never
// re-analyzes the job. Every question's evidence must trace to base-resume
// evidence; gaps come from analysis.missingSkills, never a second analysis.
// STAR stories are optional per behavioral question and carry their own
// evidence. Deterministic validation (validate.ts) enforces evidence-ID
// integrity; no model involved.

export const starStorySchema = z.object({
  situation: z.string().min(1).max(1000),
  task: z.string().min(1).max(1000),
  action: z.string().min(1).max(2000),
  result: z.string().min(1).max(1000),
  evidenceIds: z.array(z.string().min(1)).min(1).max(10),
});

const baseQuestionSchema = z.object({
  question: z.string().min(1).max(500),
  whyAsked: z.string().min(1).max(500),
  evidenceIds: z.array(z.string().min(1)).max(10),
  answerStructure: z.array(z.string().min(1).max(500)).min(1).max(8),
  followUps: z.array(z.string().min(1).max(500)).max(5),
});

const behavioralQuestionSchema = baseQuestionSchema.extend({
  starStory: starStorySchema.optional(),
});

const gapSchema = z.object({
  skill: z.string().min(1).max(200),
  bridgeAnswer: z.string().min(1).max(1000),
});

export const interviewPrepSchema = z.object({
  technical: z.array(baseQuestionSchema).length(5),
  resumeBased: z.array(baseQuestionSchema).length(5),
  behavioral: z.array(behavioralQuestionSchema).length(4),
  toAsk: z.array(z.string().min(1).max(500)).length(4),
  gaps: z.array(gapSchema).max(8),
});

export type InterviewPrepData = z.infer<typeof interviewPrepSchema>;

export const INTERVIEW_SYSTEM_PROMPT = [
  "Answer DIRECTLY in this response. Do NOT use any tools. Do NOT explore files. Do NOT run commands.",
  "Your entire reply must be ONLY a JSON object matching the requested shape.",
  "Every question's evidence must come from the EVIDENCE items below. Citing a source ID you were not given is forbidden.",
  "Prepare the candidate to tell their own story — never invent experience, metrics, employers, or skills. Gaps are bridged honestly from real adjacent experience, never filled with fiction.",
].join(" ");

export interface InterviewPromptInput {
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

export function buildInterviewPrompt(input: InterviewPromptInput): string {
  const evidenceBlock = input.evidence.map((e) => `[${e.id} | ${e.kind}] ${e.text}`).join("\n");
  return [
    "Prepare interview prep for the JOB below, using the ANALYSIS and the candidate's TAILORED HIGHLIGHTS. Ground every question in real evidence.",
    "technical[5]: questions on the job's required skills. resumeBased[5]: questions about things the candidate actually claims. behavioral[4]: experience questions; attach an optional starStory (situation/task/action/result + evidenceIds) ONLY where a genuine experience story fits — never force one (e.g. 'why this role' needs none). toAsk[4]: role/team/tech-specific questions for the interviewer. gaps[]: one honest bridge answer per known gap.",
    "Return ONLY this JSON shape and nothing else:",
    '{"technical": [{"question": string, "whyAsked": string, "evidenceIds": string[], "answerStructure": string[], "followUps": string[]}] x5, "resumeBased": [...] x5, "behavioral": [{"question": string, "whyAsked": string, "evidenceIds": string[], "answerStructure": string[], "followUps": string[], "starStory?": {"situation": string, "task": string, "action": string, "result": string, "evidenceIds": string[]}}] x4, "toAsk": string[4], "gaps": [{"skill": string, "bridgeAnswer": string}]}',
    "Example behavioral with story:",
    '{"question": "Tell me about a time you improved system performance.", "whyAsked": "Backend roles probe debugging depth.", "evidenceIds": ["bullet_erp_04"], "answerStructure": ["symptom", "tracing approach", "fix", "verification"], "followUps": ["What would you monitor?"], "starStory": {"situation": "...", "task": "...", "action": "...", "result": "...", "evidenceIds": ["bullet_erp_04"]}}',
    "",
    `JOB: ${input.jobTitle} at ${input.companyName} (${input.location ?? "location n/a"})`,
    `ANALYSIS: ${input.analysisSummary}`,
    `Required: ${input.requiredSkills.join(", ") || "none listed"}`,
    `Known gaps (bridge honestly, do not fill): ${input.missingSkills.join(", ") || "none"}`,
    `Verdict: ${input.verdict}`,
    `Tailored highlights: ${input.tailoredHighlights.join(" | ") || "none"}`,
    "",
    "EVIDENCE (only facts you may use):",
    evidenceBlock,
    "",
    "Reminder: no tools. Reply with ONLY the JSON object.",
  ].join("\n");
}
