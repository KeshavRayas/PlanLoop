import { describe, it, expect } from "vitest";
import {
  classifyRoleFamily,
  roleFit,
} from "@/lib/matching/roleFamily";
import { locationEligibility } from "@/lib/matching/eligibility";
import { scoreJob } from "@/lib/matching/score";

const GOALS = {
  preferred: ["BACKEND", "INFRASTRUCTURE", "DEVOPS_SRE", "FULL_STACK", "ML_AI", "DATA", "FORWARD_DEPLOYED"],
  vetoed: ["DATA_ANNOTATION"],
};

describe("classifyRoleFamily", () => {
  const cases: [string, string][] = [
    ["Software Engineer", "BACKEND"],
    ["Software Engineer Intern (AI/ML) - 2026", "BACKEND"],
    ["Backend Engineer - Studio Media Platform", "BACKEND"],
    ["Software Engineer - Snowflake Postgres", "BACKEND"],
    ["SDE I", "BACKEND"],
    ["Infrastructure Engineer, Observe", "INFRASTRUCTURE"],
    ["DevOps Engineer - Studio Platform", "DEVOPS_SRE"],
    ["Site Reliability Engineer", "DEVOPS_SRE"],
    ["Engineering — Full Stack AI Engineer", "FULL_STACK"],
    ["Frontend Engineer - Studio", "FRONTEND"],
    ["Frontend Software Engineer - Native Apps", "FRONTEND"],
    ["ML Engineer (Training Infra), Foundational Models", "ML_AI"],
    ["AI Inference Internship", "ML_AI"],
    ["Software Engineer, Cortex AI Infrastructure", "ML_AI"],
    ["Data Engineer", "DATA"],
    ["Software Engineer Metadata", "BACKEND"],
    ["Data Annotation Specialist, Data Science", "DATA_ANNOTATION"],
    ["German Quality Rater", "DATA_ANNOTATION"],
    ["Forward Deployed Software Engineer - Dubbing Platform", "FORWARD_DEPLOYED"],
    ["Product Manager", "OTHER"],
  ];
  for (const [title, expected] of cases) {
    it(`${title} -> ${expected}`, () => {
      expect(classifyRoleFamily(title)).toBe(expected);
    });
  }

  it("annotation beats data-science substring matching", () => {
    // "Data Annotation Specialist, Data Science" contains "data science"
    // yet must classify as annotation, not DATA.
    expect(classifyRoleFamily("Data Annotation Specialist, Data Science")).toBe("DATA_ANNOTATION");
  });
});

describe("roleFit", () => {
  it("vetoes annotation regardless of preferences", () => {
    expect(roleFit("DATA_ANNOTATION", GOALS)).toEqual({ fit: "VETO", score: 0 });
    expect(roleFit("DATA_ANNOTATION", {})).toEqual({ fit: "VETO", score: 0 });
  });

  it("strong for preferred, acceptable for the rest, weak for OTHER", () => {
    expect(roleFit("BACKEND", GOALS).fit).toBe("STRONG_FIT");
    expect(roleFit("INFRASTRUCTURE", GOALS).fit).toBe("STRONG_FIT");
    expect(roleFit("FRONTEND", GOALS).fit).toBe("ACCEPTABLE_FIT");
    expect(roleFit("OTHER", GOALS).fit).toBe("WEAK_FIT");
  });

  it("neutral acceptable when no goals configured", () => {
    expect(roleFit("BACKEND", {}).fit).toBe("ACCEPTABLE_FIT");
  });
});

describe("locationEligibility", () => {
  it("remote without restriction is ELIGIBLE", () => {
    expect(locationEligibility({ location: "Remote" }).fit).toBe("ELIGIBLE");
    expect(
      locationEligibility({ location: "India", description: "Work from home" }).fit
    ).toBe("ELIGIBLE");
  });

  it("Bangalore / Bengaluru is ELIGIBLE", () => {
    expect(locationEligibility({ location: "Bangalore" }).fit).toBe("ELIGIBLE");
    expect(locationEligibility({ location: "Bengaluru, Karnataka" }).fit).toBe("ELIGIBLE");
  });

  it("Zurich / Berlin on-site postings are INELIGIBLE", () => {
    expect(
      locationEligibility({ location: "Zurich, Switzerland", description: "Join our Zurich team, on-site." }).fit
    ).toBe("INELIGIBLE");
    expect(
      locationEligibility({ location: "Berlin, Germany", description: "Onsite internship in Berlin." }).fit
    ).toBe("INELIGIBLE");
  });

  it("Mumbai on-site is INELIGIBLE but remote Mumbai stays ELIGIBLE", () => {
    expect(locationEligibility({ location: "Mumbai" }).fit).toBe("INELIGIBLE");
    expect(locationEligibility({ location: "Mumbai", remote: true }).fit).toBe("ELIGIBLE");
  });

  it("missing location is UNKNOWN, never silently eligible", () => {
    expect(locationEligibility({}).fit).toBe("UNKNOWN");
    expect(locationEligibility({ location: "" }).fit).toBe("UNKNOWN");
  });

  it("description mentions of other cities do not disqualify a home posting", () => {
    expect(
      locationEligibility({
        location: "Bangalore",
        description: "Our Mumbai office collaborates closely. Hybrid role.",
      }).fit
    ).toBe("ELIGIBLE");
  });

  it("description mentions of India do not rescue a foreign-city location", () => {
    // Regression: "india" buried in boilerplate once granted eligibility.
    expect(
      locationEligibility({
        location: "CH-Zurich-Observe",
        description: "Snowflake is growing fast in India and worldwide. Join our Zurich team.",
      }).fit
    ).toBe("INELIGIBLE");
  });

  it("structured-remote city codes are eligible without explicit restriction", () => {
    expect(
      locationEligibility({ location: "PL-Warsaw", workMode: "REMOTE" }).fit
    ).toBe("ELIGIBLE");
    expect(
      locationEligibility({ location: "DE-Berlin-Trion Building", workMode: "REMOTE" }).fit
    ).toBe("ELIGIBLE");
  });

  it("explicit restrictions disqualify remote postings", () => {
    expect(
      locationEligibility({ location: "Remote", description: "US Only candidates." }).fit
    ).toBe("INELIGIBLE");
    expect(
      locationEligibility({
        location: "Remote",
        description: "Candidates must be authorized to work in the US.",
      }).fit
    ).toBe("INELIGIBLE");
    expect(
      locationEligibility({ location: "Remote", description: "No sponsorship available." }).fit
    ).toBe("INELIGIBLE");
  });

  it("positive sponsorship language is not a restriction", () => {
    expect(
      locationEligibility({ location: "Remote", description: "We sponsor visas for the right candidate." }).fit
    ).toBe("ELIGIBLE");
  });

  it("distributed-systems boilerplate does not force a remote signal", () => {
    expect(
      locationEligibility({
        location: "Berlin, Germany",
        description: "Distributed systems role, on-site in Berlin.",
      }).fit
    ).toBe("INELIGIBLE");
  });

  it("remote role with remote closed is UNKNOWN", () => {
    expect(
      locationEligibility({ location: "Remote" }, { openToRemote: false }).fit
    ).toBe("UNKNOWN");
  });
});

describe("scoreJob v2", () => {
  const profile = {
    skills: ["Python", "Go", "PostgreSQL"],
    minSalary: null,
    preferredRoleFamilies: ["BACKEND", "INFRASTRUCTURE"],
    vetoedRoleFamilies: ["DATA_ANNOTATION"],
    openToRemote: true,
  };

  it("scores vetoed families at role 0 with VETO fit", () => {
    const r = scoreJob(profile, {
      title: "Data Annotation Specialist",
      description: "Label training data.",
      skills: ["Python"],
      location: "Remote",
      postedAt: new Date(),
      source: "GREENHOUSE",
      sourceScore: 3,
      experience: "ENTRY",
    });
    expect(r.roleFamily).toBe("DATA_ANNOTATION");
    expect(r.roleFit).toBe("VETO");
    expect(r.roleScore).toBe(0);
  });

  it("uses scrapedAt when postedAt is missing and records the source", () => {
    const scraped = new Date();
    const r = scoreJob(profile, {
      title: "Backend Engineer",
      skills: ["Go"],
      postedAt: null,
      scrapedAt: scraped,
      location: "Remote",
      source: "GREENHOUSE",
      sourceScore: 3,
      experience: "ENTRY",
    });
    expect(r.recencySource).toBe("scraped");
    expect(r.recencyDecay).toBe(1);
    expect(r.reasons.join(" ")).toContain("scraped date");
  });

  it("records posted source and full recency when postedAt exists", () => {
    const r = scoreJob(profile, {
      title: "Backend Engineer",
      skills: ["Go"],
      postedAt: new Date(),
      scrapedAt: new Date(Date.now() - 86400000),
      location: "Remote",
      source: "GREENHOUSE",
      sourceScore: 3,
      experience: "ENTRY",
    });
    expect(r.recencySource).toBe("posted");
  });

  it("scores location ELIGIBLE/UNKNOWN and prefers eligible", () => {
    const base = {
      title: "Backend Engineer",
      skills: ["Go"],
      postedAt: new Date(),
      source: "GREENHOUSE",
      sourceScore: 3,
      experience: "ENTRY" as const,
    };
    const remote = scoreJob(profile, { ...base, location: "Remote" });
    const zurich = scoreJob(profile, {
      ...base,
      location: "Zurich, Switzerland",
      description: "On-site in Zurich.",
    });
    expect(remote.locationFit).toBe("ELIGIBLE");
    expect(zurich.locationFit).toBe("INELIGIBLE");
    expect(remote.score).toBeGreaterThan(zurich.score);
  });

  it("ranks a vetoed annotation role below a backend role on equal skills", () => {
    const backend = scoreJob(profile, {
      title: "Backend Engineer",
      skills: ["Python"],
      postedAt: new Date(),
      location: "Remote",
      source: "GREENHOUSE",
      sourceScore: 3,
      experience: "ENTRY",
    });
    const annotation = scoreJob(profile, {
      title: "Data Annotation Specialist",
      skills: ["Python"],
      postedAt: new Date(),
      location: "Remote",
      source: "GREENHOUSE",
      sourceScore: 3,
      experience: "ENTRY",
    });
    expect(backend.score).toBeGreaterThan(annotation.score);
    expect(backend.score - annotation.score).toBeGreaterThan(0.1);
  });
});
