import { describe, it, expect } from "vitest";
import { scoreJob } from "@/lib/matching/score";

// ─── Ranking invariants (regression fixture, Matcher v2) ─────────────────────
// Class-level properties a future change must not silently destroy. These
// assert relationships between job CLASSES, never exact floating scores.

const PROFILE = {
  skills: ["Python", "Go", "PostgreSQL", "Docker"],
  minSalary: null,
  preferredRoleFamilies: [
    "BACKEND",
    "INFRASTRUCTURE",
    "DEVOPS_SRE",
    "FULL_STACK",
    "ML_AI",
    "DATA",
    "FORWARD_DEPLOYED",
  ],
  vetoedRoleFamilies: ["DATA_ANNOTATION"],
  openToRemote: true,
};

const BASE = {
  postedAt: new Date(),
  source: "GREENHOUSE",
  sourceScore: 3,
  experience: "ENTRY" as const,
  location: "Remote",
};

describe("ranking invariants", () => {
  it("data annotation with high overlap ranks below backend with lower overlap", () => {
    const annotation = scoreJob(PROFILE, {
      ...BASE,
      title: "Data Annotation Specialist, Data Science",
      description: "Label data.",
      skills: ["Python", "Go", "PostgreSQL", "Docker"],
    });
    const backend = scoreJob(PROFILE, {
      ...BASE,
      title: "Backend Engineer",
      description: "Build APIs.",
      skills: ["Python", "Go"],
    });
    expect(annotation.roleFamily).toBe("DATA_ANNOTATION");
    expect(backend.roleFamily).toBe("BACKEND");
    // 4/4 overlap loses to 1/2 overlap: direction matters more than keywords.
    expect(backend.score).toBeGreaterThan(annotation.score);
    expect(backend.score - annotation.score).toBeGreaterThan(0.1);
  });

  it("ineligible location never outranks its eligible equivalent", () => {
    const eligible = scoreJob(PROFILE, {
      ...BASE,
      title: "Software Engineer Intern",
      description: "Remote internship.",
      skills: ["Python", "Go"],
      location: "Remote",
    });
    const zurich = scoreJob(PROFILE, {
      ...BASE,
      title: "Software Engineer Intern - Zurich",
      description: "On-site internship in Zurich, office-based.",
      skills: ["Python", "Go"],
      location: "Zurich, Switzerland",
    });
    expect(zurich.locationFit).toBe("INELIGIBLE");
    expect(eligible.locationFit).toBe("ELIGIBLE");
    expect(eligible.score).toBeGreaterThan(zurich.score);
  });

  it("uncertain ranks between eligible and ineligible equivalents", () => {
    const mk = (location: string, workMode?: string, description?: string) =>
      scoreJob(PROFILE, {
        ...BASE,
        title: "Software Engineer Intern",
        description: description ?? "Role.",
        skills: ["Python", "Go"],
        location,
        workMode,
      }).score;
    const eligible = mk("Remote");
    const uncertain = mk("PL-Warsaw", "REMOTE");
    const ineligible = mk(
      "Zurich, Switzerland",
      undefined,
      "On-site in Zurich.",
    );
    expect(eligible).toBeGreaterThan(uncertain);
    expect(uncertain).toBeGreaterThan(ineligible);
  });

  it("frontend stays between backend-strong and annotation", () => {
    const mk = (title: string) =>
      scoreJob(PROFILE, {
        ...BASE,
        title,
        description: "Role.",
        skills: ["Python", "Go"],
        location: "Remote",
      });
    const backend = mk("Backend Engineer").score;
    const frontend = mk("Frontend Engineer").score;
    const annotation = mk("Data Annotation Specialist").score;
    expect(backend).toBeGreaterThan(frontend);
    expect(frontend).toBeGreaterThan(annotation);
  });
});
