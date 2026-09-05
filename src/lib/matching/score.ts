import { SKILL_ALIASES } from "@/lib/constants";
import {
  classifyRoleFamily,
  roleFit,
  type RoleFamily,
  type RoleFit,
} from "@/lib/matching/roleFamily";
import {
  locationEligibility,
  LOCATION_FIT_SCORE,
  type LocationFit,
} from "@/lib/matching/eligibility";

// ─── Matcher v2: fully deterministic, model-free ─────────────────────────────
// Pure module: zero Prisma / API / LLM dependencies. v2 adds role-family fit
// and location eligibility alongside the v1 components; vetoed families and
// ineligible locations are filtered by the caller (nightly), not scored.

export type SalaryFit = "MATCH" | "BELOW" | "UNKNOWN";

export interface MatcherProfile {
  skills: string[];
  minSalary?: number | null;
  preferredRoleFamilies?: string[] | null;
  vetoedRoleFamilies?: string[] | null;
  openToRemote?: boolean | null;
}

export interface ScorableJob {
  skills: string[];
  salaryMin?: number | null;
  salaryMax?: number | null;
  postedAt?: Date | string | null;
  scrapedAt?: Date | string | null;
  /** Prisma JobSource enum name, e.g. "GREENHOUSE". */
  source?: string | null;
  /** 0..3, mirrors SOURCE_SCORES in the ingestion pipeline. */
  sourceScore?: number | null;
  /** Prisma ExperienceLevel enum name, e.g. "ENTRY". */
  experience?: string | null;
  title?: string;
  description?: string;
  location?: string | null;
  remote?: boolean;
  /** Prisma WorkMode enum name, e.g. "REMOTE". */
  workMode?: string | null;
}

export type RecencySource = "posted" | "scraped" | "none";

export interface MatchResult {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  skillOverlap: number;
  salaryFit: SalaryFit;
  salaryScore: number;
  recencyDecay: number;
  recencySource: RecencySource;
  sourceTrust: number;
  levelFit: number;
  roleFamily: RoleFamily;
  roleFit: RoleFit;
  roleScore: number;
  locationFit: LocationFit;
  locationScore: number;
  reasons: string[];
}

/**
 * Component weights (v2). Old components keep their relative order
 * (skills > level > recency = source > salary); role fit joins near the
 * top, location contributes a small scored term on top of its filter role.
 */
export const MATCH_WEIGHTS = {
  skills: 0.4,
  role: 0.15,
  level: 0.12,
  recency: 0.08,
  source: 0.08,
  salary: 0.07,
  location: 0.1,
} as const;

/** Nightly candidate-set size. Ranked shortlist, not a final answer. */
export const TOP_N_DEFAULT = 25;

const HIGH_TRUST_SOURCES = new Set(["GREENHOUSE", "LEVER", "ASHBY"]);

export function normalizeSkill(raw: string): string {
  const key = raw.trim().toLowerCase();
  if (!key) return "";
  return SKILL_ALIASES[key] ?? raw.trim();
}

function normalizeSkillSet(skills: string[]): Set<string> {
  const out = new Set<string>();
  for (const s of skills ?? []) {
    const n = normalizeSkill(s);
    if (n) out.add(n);
  }
  return out;
}

export function recencyDecay(
  postedAt: Date | string | null | undefined,
  now: Date = new Date(),
): number {
  if (!postedAt) return 0.5;
  const posted = postedAt instanceof Date ? postedAt : new Date(postedAt);
  if (Number.isNaN(posted.getTime())) return 0.5;
  const ageDays = (now.getTime() - posted.getTime()) / (1000 * 60 * 60 * 24);
  if (ageDays <= 5 / 1440) return 1.0; // fresh (5-min clock-skew grace)
  if (ageDays <= 1) return 0.9;
  if (ageDays <= 3) return 0.9 - ((ageDays - 1) / 2) * 0.2; // 0.9 → 0.7
  if (ageDays <= 7) return 0.7 - ((ageDays - 3) / 4) * 0.3; // 0.7 → 0.4
  if (ageDays <= 30) return 0.4 * (1 - (ageDays - 7) / 23); // 0.4 → 0
  return 0;
}

export function sourceTrustScore(
  source?: string | null,
  sourceScore?: number | null,
): number {
  if (sourceScore != null) {
    if (sourceScore >= 3) return 1.0;
    if (sourceScore === 2) return 0.8;
    if (sourceScore === 1) return 0.6;
    return 0.4;
  }
  if (source && HIGH_TRUST_SOURCES.has(source.toUpperCase())) return 1.0;
  if (source && source.toUpperCase() === "REMOTIVE") return 0.6;
  return 0.4;
}

export function levelFitScore(experience?: string | null): number {
  if (!experience) return 0.5;
  return experience.toUpperCase() === "ENTRY" ? 1 : 0;
}

export function salaryFitScore(
  jobMin?: number | null,
  jobMax?: number | null,
  profileMin?: number | null,
): { fit: SalaryFit; score: number } {
  if (jobMin == null && jobMax == null) return { fit: "UNKNOWN", score: 0.5 };
  if (profileMin == null) return { fit: "MATCH", score: 1 };
  const effective = jobMax ?? jobMin!;
  return effective >= profileMin
    ? { fit: "MATCH", score: 1 }
    : { fit: "BELOW", score: 0 };
}

export function scoreJob(
  profile: MatcherProfile,
  job: ScorableJob,
  now: Date = new Date(),
): MatchResult {
  const profileSkills = normalizeSkillSet(profile.skills);
  const jobSkills = [...normalizeSkillSet(job.skills)];

  const matchedSkills = jobSkills.filter((s) => profileSkills.has(s)).sort();
  const missingSkills = jobSkills.filter((s) => !profileSkills.has(s)).sort();

  // Unknown !== zero: a job with no extracted skills is neutral, not bad.
  const skillOverlap =
    jobSkills.length === 0 ? 0.5 : matchedSkills.length / jobSkills.length;

  const { fit: salaryFit, score: salaryScore } = salaryFitScore(
    job.salaryMin,
    job.salaryMax,
    profile.minSalary,
  );
  // Recency fallback: posting date when present, otherwise first-seen date.
  // The source is recorded so explanations stay honest.
  const effectiveDate = job.postedAt ?? job.scrapedAt ?? null;
  const recencySource: RecencySource = job.postedAt
    ? "posted"
    : job.scrapedAt
      ? "scraped"
      : "none";
  const recency = recencyDecay(effectiveDate, now);
  const trust = sourceTrustScore(job.source, job.sourceScore);
  const level = levelFitScore(job.experience);

  const family = classifyRoleFamily(job.title ?? "");
  const { fit: roleFitResult, score: roleScore } = roleFit(family, {
    preferred: profile.preferredRoleFamilies,
    vetoed: profile.vetoedRoleFamilies,
  });
  const { fit: locationFitResult, reason: locationReason } =
    locationEligibility(
      {
        location: job.location,
        remote: job.remote,
        workMode: job.workMode,
        description: job.description,
      },
      { openToRemote: profile.openToRemote },
    );
  const locationScore = LOCATION_FIT_SCORE[locationFitResult];

  const score =
    MATCH_WEIGHTS.skills * skillOverlap +
    MATCH_WEIGHTS.role * roleScore +
    MATCH_WEIGHTS.level * level +
    MATCH_WEIGHTS.recency * recency +
    MATCH_WEIGHTS.source * trust +
    MATCH_WEIGHTS.salary * salaryScore +
    MATCH_WEIGHTS.location * locationScore;

  const reasons: string[] = [];
  if (jobSkills.length === 0) {
    reasons.push("no skills extracted — overlap neutral (0.5)");
  } else {
    reasons.push(`${matchedSkills.length}/${jobSkills.length} skills matched`);
  }
  if (missingSkills.length > 0) {
    reasons.push(`missing: ${missingSkills.join(", ")}`);
  }
  if (salaryFit === "UNKNOWN") {
    reasons.push("salary unknown — not penalized");
  } else if (salaryFit === "BELOW") {
    reasons.push("salary below profile minimum");
  } else {
    reasons.push("salary meets profile minimum");
  }
  if (job.experience) {
    reasons.push(
      level === 1 ? "entry-level fit" : "non-entry experience signal",
    );
  } else {
    reasons.push("experience unknown — neutral");
  }
  if (job.source) {
    reasons.push(
      trust >= 1 ? `${job.source} (high-trust source)` : `${job.source} source`,
    );
  }
  reasons.push(
    `role: ${family} (${roleFitResult.toLowerCase().replace("_", " ")})`,
  );
  reasons.push(`location: ${locationReason}`);
  if (recencySource === "scraped") {
    reasons.push("recency based on scraped date; posting date unavailable");
  }

  return {
    score: Math.round(score * 10000) / 10000,
    matchedSkills,
    missingSkills,
    skillOverlap: Math.round(skillOverlap * 10000) / 10000,
    salaryFit,
    salaryScore,
    recencyDecay: Math.round(recency * 10000) / 10000,
    recencySource,
    sourceTrust: trust,
    levelFit: level,
    roleFamily: family,
    roleFit: roleFitResult,
    roleScore,
    locationFit: locationFitResult,
    locationScore,
    reasons,
  };
}
