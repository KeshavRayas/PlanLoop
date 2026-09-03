import { z } from "zod";

// ─── JobAnalysis contract (Phase 2A) ─────────────────────────────────────────
// Structured result of Analyze Job. The model returns this as JSON; anything
// else is rejected and never persisted. This never overwrites JobMatch.score.

export const jobAnalysisSchema = z.object({
  summary: z.string().min(1).max(2000),
  responsibilities: z.array(z.string()).max(20),
  requiredSkills: z.array(z.string()).max(30),
  preferredSkills: z.array(z.string()).max(30),
  matchedSkills: z.array(z.string()).max(30),
  missingSkills: z.array(z.string()).max(30),
  experienceRequirements: z.array(z.string()).max(20),
  potentialConcerns: z.array(z.string()).max(20),
  workAuthorization: z.string().max(500).nullish(),
  workMode: z.string().max(100).nullish(),
  verdict: z.enum(["STRONG", "POSSIBLE", "WEAK"]),
  verdictReasons: z.array(z.string()).min(1).max(10),
});

export type JobAnalysisData = z.infer<typeof jobAnalysisSchema>;

export const ANALYZE_SYSTEM_PROMPT = [
  "Answer DIRECTLY in this response. Do NOT use any tools. Do NOT explore files. Do NOT run commands.",
  "Your entire reply must be ONLY a JSON object matching the requested shape.",
  "No markdown fences, no prose before or after, no tool calls.",
  "Be honest about gaps: a required skill the profile lacks must appear in missingSkills and potentialConcerns, never silently dropped.",
  "Do not invent salary, location, or sponsorship facts. If the posting does not state them, say so in potentialConcerns.",
].join(" ");

const MAX_DESCRIPTION_CHARS = 6000;

export interface AnalyzePromptInput {
  title: string;
  companyName: string;
  description: string;
  location?: string | null;
  workMode?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurr?: string | null;
  jobSkills: string[];
  profileSkills: string[];
  profileMinSalary?: number | null;
}

export function buildAnalyzePrompt(input: AnalyzePromptInput): string {
  const description =
    input.description.length > MAX_DESCRIPTION_CHARS
      ? `${input.description.slice(0, MAX_DESCRIPTION_CHARS)}\n[…truncated]`
      : input.description;

  return [
    "Read the JOB and CANDIDATE data below and answer directly.",
    "Every field below is required. Use [] for empty lists and null only where allowed. Never omit a key.",
    'verdict must be exactly one of "STRONG", "POSSIBLE" or "WEAK".',
    "Return ONLY this JSON shape and nothing else:",
    '{"summary": string, "responsibilities": string[], "requiredSkills": string[], "preferredSkills": string[], "matchedSkills": string[], "missingSkills": string[], "experienceRequirements": string[], "potentialConcerns": string[], "workAuthorization": string|null, "workMode": string|null, "verdict": "STRONG"|"POSSIBLE"|"WEAK", "verdictReasons": string[]}',
    "Example for a junior backend posting where the candidate knows Python but not Kubernetes:",
    '{"summary": "Junior backend role building APIs; Python fit is direct, Kubernetes is a gap.", "responsibilities": ["Build REST APIs"], "requiredSkills": ["Python"], "preferredSkills": ["Kubernetes"], "matchedSkills": ["Python"], "missingSkills": ["Kubernetes"], "experienceRequirements": ["0-2 years"], "potentialConcerns": ["Kubernetes gap"], "workAuthorization": null, "workMode": "Remote", "verdict": "POSSIBLE", "verdictReasons": ["Python matches day-one work", "Kubernetes is learnable on the job"]}',
    "",
    `JOB: ${input.title} at ${input.companyName}`,
    `Location: ${input.location ?? "not stated"}`,
    `Work mode: ${input.workMode ?? "not stated"}`,
    `Salary: ${input.salaryMin ?? "?"}–${input.salaryMax ?? "?"} ${input.salaryCurr ?? ""}`.trim(),
    `Extracted job skills: ${input.jobSkills.join(", ") || "none"}`,
    "",
    "CANDIDATE PROFILE:",
    `Skills: ${input.profileSkills.join(", ") || "none stated"}`,
    `Minimum salary: ${input.profileMinSalary ?? "not set"}`,
    "",
    "POSTING:",
    description,
    "",
    "Reminder: do not use tools. Reply with ONLY the JSON object.",
  ].join("\n");
}
