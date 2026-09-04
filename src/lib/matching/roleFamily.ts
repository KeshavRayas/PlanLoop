// ─── Role-family classification (Matcher v2, deterministic) ─────────────────
// Title-driven taxonomy. Order matters: specific families (annotation,
// forward-deployed, SRE) are checked before their generic parents so
// "Data Annotation Specialist" never lands in DATA.

export type RoleFamily =
  | "BACKEND"
  | "INFRASTRUCTURE"
  | "DEVOPS_SRE"
  | "FULL_STACK"
  | "FRONTEND"
  | "ML_AI"
  | "DATA"
  | "DATA_ANNOTATION"
  | "FORWARD_DEPLOYED"
  | "OTHER";

export type RoleFit = "STRONG_FIT" | "ACCEPTABLE_FIT" | "WEAK_FIT" | "VETO";

export const ROLE_FIT_SCORE: Record<RoleFit, number> = {
  STRONG_FIT: 1,
  ACCEPTABLE_FIT: 0.6,
  WEAK_FIT: 0.3,
  VETO: 0,
};

function has(text: string, ...needles: string[]): boolean {
  return needles.some((n) => text.includes(n));
}

export function classifyRoleFamily(title: string, description = ""): RoleFamily {
  const t = ` ${title.toLowerCase()} `;
  const d = description.toLowerCase();

  if (
    has(t, "data annot", "annotation specialist", "data label", "labelling", "labeling specialist", "rater", "content moderator", "moderation specialist") ||
    (has(t, "annotator") && !has(t, "data engineer", "data scientist"))
  ) {
    return "DATA_ANNOTATION";
  }
  if (has(t, "forward deployed", "forward-deployed", " fde ", "(fde)")) return "FORWARD_DEPLOYED";
  // Pure-infra titles only: "Software Engineer, X Infrastructure" belongs to
  // its leading role noun (usually BACKEND), decided further below.
  const hasRoleNoun = has(t, "software engineer", "sde", "swe", "developer", "backend", "frontend", "data ", " ml", "ml ", " ai ", " ai,", "sre", "devops", "manager", "lead ", "intern");
  const infraLike =
    has(t, "infrastructure", "platform engineer", "platform engineering", "cloud engineer", "cloud infrastructure") &&
    !hasRoleNoun;
  const sreLike = has(t, "devops", "dev ops", "site reliability", " sre", "sre ", "sre,");
  if (infraLike && !sreLike) return "INFRASTRUCTURE";
  if (sreLike) return "DEVOPS_SRE";
  if (has(t, "frontend", "front end", "front-end", "ui engineer", "ux engineer", "react developer", "angular developer", "vue developer") && !has(t, "full")) {
    return "FRONTEND";
  }
  if (has(t, "full stack", "fullstack", "full-stack", "mern", "mean")) return "FULL_STACK";
  if (
    has(t, "machine learning", " ml ", "ml engineer", "ai engineer", "ai inference", " ai ", "ai-", " ai,", "artificial intelligence", "deep learning", " nlp", "nlp ", "computer vision", " llm", "llm ", "genai", "generative ai", "research scientist", "research engineer", "applied scientist", "applied ai", "mle", "data scientist")
  ) {
    return "ML_AI";
  }
  if (
    has(t, "data engineer", "data analyst", "data science", "analytics engineer", "bi developer", "business intelligence", "data platform", "database administrator", "dba")
  ) {
    return "DATA";
  }
  if (
    has(t, "backend", "back end", "back-end", "server engineer", "server-side", "api engineer", "api developer", "systems engineer", "systems programming", "distributed systems", "embedded", "firmware", "sde", "swe", "software engineer", "software developer", "software development", "developer", "programmer")
  ) {
    return "BACKEND";
  }
  return "OTHER";
}

export interface RoleGoals {
  preferred?: string[] | null;
  vetoed?: string[] | null;
}

/**
 * Fit of a classified family against profile goals. VETO is a hard
 * exclusion signal (caller filters), not just a low score: annotation-type
 * work is a different career direction, not a slightly worse match.
 */
export function roleFit(family: RoleFamily, goals: RoleGoals): { fit: RoleFit; score: number } {
  // Data annotation is a different job category, not a worse match — vetoed
  // unconditionally, like the ingestion classifier's NON_CS rejection.
  if (family === "DATA_ANNOTATION") return { fit: "VETO", score: ROLE_FIT_SCORE.VETO };
  const vetoed = (goals.vetoed ?? []).map((s) => s.toUpperCase());
  const preferred = (goals.preferred ?? []).map((s) => s.toUpperCase());
  if (vetoed.includes(family)) return { fit: "VETO", score: ROLE_FIT_SCORE.VETO };
  if (preferred.length === 0) return { fit: "ACCEPTABLE_FIT", score: ROLE_FIT_SCORE.ACCEPTABLE_FIT };
  if (preferred.includes(family)) return { fit: "STRONG_FIT", score: ROLE_FIT_SCORE.STRONG_FIT };
  if (family === "OTHER") return { fit: "WEAK_FIT", score: ROLE_FIT_SCORE.WEAK_FIT };
  return { fit: "ACCEPTABLE_FIT", score: ROLE_FIT_SCORE.ACCEPTABLE_FIT };
}
