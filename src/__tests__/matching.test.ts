import { describe, it, expect } from "vitest";
import {
  scoreJob,
  recencyDecay,
  sourceTrustScore,
  levelFitScore,
  salaryFitScore,
  type MatcherProfile,
  type ScorableJob,
} from "@/lib/matching/score";

const PROFILE: MatcherProfile = {
  skills: ["TypeScript", "React", "PostgreSQL", "Docker", "AWS", "Go"],
  minSalary: 1200000,
  preferredRoleFamilies: ["BACKEND", "INFRASTRUCTURE", "DEVOPS_SRE", "FULL_STACK", "ML_AI", "DATA", "FORWARD_DEPLOYED"],
  vetoedRoleFamilies: ["DATA_ANNOTATION"],
  openToRemote: true,
};

function makeJob(overrides: Partial<ScorableJob> = {}): ScorableJob {
  return {
    title: "Software Engineer",
    skills: ["TypeScript", "React", "PostgreSQL"],
    salaryMin: 1500000,
    salaryMax: 2000000,
    postedAt: new Date(),
    source: "GREENHOUSE",
    sourceScore: 3,
    experience: "ENTRY",
    location: "Remote",
    ...overrides,
  };
}

describe("scoreJob", () => {
  it("scores a perfect job at ~1.0", () => {
    const r = scoreJob(PROFILE, makeJob());
    expect(r.score).toBeCloseTo(1.0, 2);
    expect(r.matchedSkills).toEqual(["PostgreSQL", "React", "TypeScript"]);
    expect(r.missingSkills).toEqual([]);
    expect(r.skillOverlap).toBe(1);
  });

  it("is deterministic for the same input", () => {
    const now = new Date("2026-09-04T02:00:00Z");
    const a = scoreJob(PROFILE, makeJob(), now);
    const b = scoreJob(PROFILE, makeJob(), now);
    expect(a).toEqual(b);
  });

  it("normalizes skill aliases (ts -> TypeScript)", () => {
    const r = scoreJob({ skills: ["ts"] }, makeJob({ skills: ["TypeScript"] }));
    expect(r.matchedSkills).toEqual(["TypeScript"]);
    expect(r.skillOverlap).toBe(1);
  });

  it("computes partial overlap and lists gaps", () => {
    const r = scoreJob(
      PROFILE,
      makeJob({ skills: ["TypeScript", "React", "Kubernetes"] })
    );
    expect(r.matchedSkills).toEqual(["React", "TypeScript"]);
    expect(r.missingSkills).toEqual(["Kubernetes"]);
    expect(r.skillOverlap).toBeCloseTo(2 / 3, 4);
  });

  it("treats jobs with no extracted skills as neutral (0.5), not zero", () => {
    const r = scoreJob(PROFILE, makeJob({ skills: [] }));
    expect(r.skillOverlap).toBe(0.5);
    expect(r.score).toBeGreaterThan(0.4);
  });

  it("does not penalize unknown salary (UNKNOWN scores above BELOW)", () => {
    const unknown = scoreJob(PROFILE, makeJob({ salaryMin: null, salaryMax: null }));
    const below = scoreJob(PROFILE, makeJob({ salaryMin: 500000, salaryMax: 800000 }));
    expect(unknown.salaryFit).toBe("UNKNOWN");
    expect(below.salaryFit).toBe("BELOW");
    expect(unknown.score).toBeGreaterThan(below.score);
  });

  it("marks salary below profile minimum as BELOW with score 0", () => {
    const r = scoreJob(PROFILE, makeJob({ salaryMin: 500000, salaryMax: 800000 }));
    expect(r.salaryFit).toBe("BELOW");
    expect(r.salaryScore).toBe(0);
  });

  it("treats known salary as MATCH when profile has no minimum", () => {
    const r = scoreJob({ skills: [] }, makeJob({ salaryMin: 100, salaryMax: 200 }));
    expect(r.salaryFit).toBe("MATCH");
  });

  it("ranks fresher postings above stale ones", () => {
    const fresh = scoreJob(PROFILE, makeJob({ postedAt: new Date() }));
    const old = scoreJob(
      PROFILE,
      makeJob({ postedAt: new Date(Date.now() - 20 * 86400000) })
    );
    expect(fresh.recencyDecay).toBeGreaterThan(old.recencyDecay);
    expect(fresh.score).toBeGreaterThan(old.score);
  });

  it("ranks high-trust ATS sources above aggregators", () => {
    const ats = scoreJob(PROFILE, makeJob({ source: "GREENHOUSE", sourceScore: 3 }));
    const agg = scoreJob(PROFILE, makeJob({ source: "ADZUNA", sourceScore: 0 }));
    expect(ats.sourceTrust).toBeGreaterThan(agg.sourceTrust);
    expect(ats.score).toBeGreaterThan(agg.score);
  });

  it("always returns human-readable reasons", () => {
    const r = scoreJob(PROFILE, makeJob());
    expect(r.reasons.length).toBeGreaterThan(0);
    expect(r.reasons.join(" ")).toContain("3/3 skills matched");
  });
});

describe("recencyDecay", () => {
  const now = new Date("2026-09-04T02:00:00Z");
  const daysAgo = (n: number) => new Date(now.getTime() - n * 86400000);

  it("today -> 1.0, 1 day -> 0.9, 30+ days -> 0", () => {
    expect(recencyDecay(now, now)).toBe(1.0);
    expect(recencyDecay(daysAgo(1), now)).toBe(0.9);
    expect(recencyDecay(daysAgo(30), now)).toBe(0);
    expect(recencyDecay(daysAgo(60), now)).toBe(0);
  });

  it("null / invalid dates are neutral (0.5)", () => {
    expect(recencyDecay(null, now)).toBe(0.5);
    expect(recencyDecay("not-a-date", now)).toBe(0.5);
  });
});

describe("sourceTrustScore", () => {
  it("maps sourceScore 3/1/0 to 1.0/0.6/0.4", () => {
    expect(sourceTrustScore("GREENHOUSE", 3)).toBe(1.0);
    expect(sourceTrustScore("REMOTIVE", 1)).toBe(0.6);
    expect(sourceTrustScore("ADZUNA", 0)).toBe(0.4);
  });

  it("falls back to source name when score is absent", () => {
    expect(sourceTrustScore("LEVER", null)).toBe(1.0);
    expect(sourceTrustScore("REMOTIVE", null)).toBe(0.6);
    expect(sourceTrustScore("JOOBLE", null)).toBe(0.4);
    expect(sourceTrustScore(null, null)).toBe(0.4);
  });
});

describe("levelFitScore", () => {
  it("ENTRY=1, unknown=0.5, senior=0", () => {
    expect(levelFitScore("ENTRY")).toBe(1);
    expect(levelFitScore(null)).toBe(0.5);
    expect(levelFitScore("SENIOR")).toBe(0);
  });
});

describe("salaryFitScore", () => {
  it("unknown salary is UNKNOWN/0.5, never zero", () => {
    expect(salaryFitScore(null, null, 1200000)).toEqual({ fit: "UNKNOWN", score: 0.5 });
  });

  it("compares effective (max ?? min) salary against the minimum", () => {
    expect(salaryFitScore(1500000, 2000000, 1200000).fit).toBe("MATCH");
    expect(salaryFitScore(500000, 800000, 1200000).fit).toBe("BELOW");
  });
});
