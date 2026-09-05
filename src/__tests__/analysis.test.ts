import { describe, it, expect } from "vitest";
import {
  jobAnalysisSchema,
  buildAnalyzePrompt,
} from "@/lib/analysis/jobAnalysis";
import { extractJsonObject } from "@/lib/llm/opencode";

const VALID = {
  summary: "Backend Go role, strong fit.",
  responsibilities: ["Build APIs"],
  requiredSkills: ["Go", "PostgreSQL"],
  preferredSkills: ["Kubernetes"],
  matchedSkills: ["Go", "PostgreSQL"],
  missingSkills: ["Kubernetes"],
  experienceRequirements: ["0-2 years"],
  potentialConcerns: ["Salary not disclosed"],
  workAuthorization: null,
  workMode: "Remote",
  verdict: "STRONG",
  verdictReasons: ["Strong Go/Postgres overlap"],
};

describe("jobAnalysisSchema", () => {
  it("accepts a valid analysis", () => {
    expect(jobAnalysisSchema.safeParse(VALID).success).toBe(true);
  });

  it("rejects an unknown verdict", () => {
    const r = jobAnalysisSchema.safeParse({ ...VALID, verdict: "95% MATCH" });
    expect(r.success).toBe(false);
  });

  it("rejects empty verdictReasons and missing summary", () => {
    expect(
      jobAnalysisSchema.safeParse({ ...VALID, verdictReasons: [] }).success,
    ).toBe(false);
    const { summary: _dropped, ...noSummary } = VALID;
    expect(jobAnalysisSchema.safeParse(noSummary).success).toBe(false);
  });

  it("accepts null/omitted optional fields", () => {
    const { workAuthorization: _a, workMode: _b, ...rest } = VALID;
    expect(jobAnalysisSchema.safeParse(rest).success).toBe(true);
  });
});

describe("buildAnalyzePrompt", () => {
  const base = {
    title: "Backend Engineer",
    companyName: "Acme",
    description: "Build things with Go.",
    location: "Remote",
    workMode: "REMOTE",
    salaryMin: null,
    salaryMax: null,
    salaryCurr: null,
    jobSkills: ["Go"],
    profileSkills: ["Go", "TypeScript"],
    profileMinSalary: null,
  };

  it("embeds job and profile context", () => {
    const p = buildAnalyzePrompt(base);
    expect(p).toContain("Backend Engineer at Acme");
    expect(p).toContain("Go, TypeScript");
  });

  it("truncates very long descriptions with a marker", () => {
    const p = buildAnalyzePrompt({ ...base, description: "x".repeat(9000) });
    expect(p).toContain("[…truncated]");
    expect(p.length).toBeLessThan(9000);
  });
});

describe("extractJsonObject", () => {
  it("parses bare JSON", () => {
    expect(extractJsonObject('{"a":1}')).toEqual({ a: 1 });
  });

  it("strips prose prefixes and markdown fences", () => {
    const out = extractJsonObject(
      'Here is your analysis:\n```json\n{"verdict":"STRONG","n":{"x":[1,2]}}\n```',
    );
    expect(out).toEqual({ verdict: "STRONG", n: { x: [1, 2] } });
  });

  it("handles braces inside strings", () => {
    expect(extractJsonObject('{"s":"a { b } c"}')).toEqual({ s: "a { b } c" });
  });

  it("throws when no object is present", () => {
    expect(() => extractJsonObject("no json here")).toThrow();
  });
});
