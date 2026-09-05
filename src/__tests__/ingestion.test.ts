import { describe, it, expect } from "vitest";
import { classifyJob } from "@/lib/ingestion/classifier";
import { isEntryLevel } from "@/lib/ingestion/experience";
import type { RawJob } from "@/lib/types";

function makeJob(overrides: Partial<RawJob> = {}): RawJob {
  return {
    externalId: "test-1",
    title: "Test Job",
    description: "Job description",
    companyName: "Test Corp",
    applyUrl: "https://example.com/apply",
    ...overrides,
  };
}

// ─── classifyJob Tests ───────────────────────────────────────────

describe("classifyJob", () => {
  it("accepts Software Engineer title (title match)", () => {
    const result = classifyJob(makeJob({ title: "Software Engineer" }));
    expect(result.accepted).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("accepts Full Stack Developer with skill keywords", () => {
    const result = classifyJob(
      makeJob({
        title: "Developer",
        description: "Python, React, AWS, Docker, PostgreSQL",
      }),
    );
    expect(result.accepted).toBe(true);
  });

  it("accepts Data Scientist with ML keywords", () => {
    const result = classifyJob(
      makeJob({
        title: "Data Scientist",
        description: "machine learning, deep learning, python, tensorflow",
      }),
    );
    expect(result.accepted).toBe(true);
  });

  it("accepts job with strong CS skill presence even with ambiguous title", () => {
    const result = classifyJob(
      makeJob({
        title: "Technical Associate",
        description: "Python, Java, React, Node.js, AWS, Docker, Kubernetes",
      }),
    );
    expect(result.accepted).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.7);
  });

  it("rejects Office Assistant", () => {
    const result = classifyJob(makeJob({ title: "Office Assistant" }));
    expect(result.accepted).toBe(false);
    expect(result.reason).toBeDefined();
  });

  it("rejects Sales Executive", () => {
    const result = classifyJob(makeJob({ title: "Sales Executive" }));
    expect(result.accepted).toBe(false);
  });

  it("rejects German Quality Rater (no CS keywords)", () => {
    const result = classifyJob(
      makeJob({
        title: "German Quality Rater",
        description: "Rate search quality for German language queries",
      }),
    );
    expect(result.accepted).toBe(false);
  });

  it("rejects Senior Accountant", () => {
    const result = classifyJob(
      makeJob({
        title: "Senior Accountant",
        description: "Manage financial accounts and reporting",
      }),
    );
    expect(result.accepted).toBe(false);
  });

  it("rejects Marketing Manager", () => {
    const result = classifyJob(makeJob({ title: "Marketing Manager" }));
    expect(result.accepted).toBe(false);
  });

  it("rejects HR Associate", () => {
    const result = classifyJob(makeJob({ title: "HR Associate" }));
    expect(result.accepted).toBe(false);
  });

  it("rejects Graphic Designer (no CS)", () => {
    const result = classifyJob(
      makeJob({
        title: "Graphic Designer",
        description: "Create visual designs using Figma and Adobe Suite",
      }),
    );
    expect(result.accepted).toBe(false);
  });

  it("rejects even if title has CS but description is non-CS dominant", () => {
    const result = classifyJob(
      makeJob({
        title: "Salesforce Administrator",
        description: "Manage Salesforce CRM, customer accounts, sales pipeline",
      }),
    );
    expect(result.accepted).toBe(false);
  });

  it("increases confidence with more skills", () => {
    const low = classifyJob(
      makeJob({
        title: "Junior Developer",
        description: "Python",
      }),
    );
    const high = classifyJob(
      makeJob({
        title: "Junior Developer",
        description:
          "Python, React, AWS, Docker, Kubernetes, PostgreSQL, Redis, Kafka, GraphQL, TypeScript, Node.js, Git, CI/CD, Terraform",
      }),
    );
    expect(high.confidence).toBeGreaterThanOrEqual(low.confidence);
    expect(high.confidence).toBeGreaterThan(0.8);
  });

  it("returns 0.20 confidence for rejected jobs", () => {
    const result = classifyJob(makeJob({ title: "Office Assistant" }));
    expect(result.confidence).toBe(0.2);
  });
});

// ─── isEntryLevel Tests ──────────────────────────────────────────

describe("isEntryLevel", () => {
  it("accepts Intern title", () => {
    const result = isEntryLevel(makeJob({ title: "Software Engineer Intern" }));
    expect(result.accepted).toBe(true);
    expect(result.experienceLevel).toBe("ENTRY");
  });

  it("accepts Graduate Engineer", () => {
    const result = isEntryLevel(
      makeJob({ title: "Graduate Software Engineer" }),
    );
    expect(result.accepted).toBe(true);
  });

  it("accepts Junior Developer", () => {
    const result = isEntryLevel(makeJob({ title: "Junior Developer" }));
    expect(result.accepted).toBe(true);
  });

  it("accepts Associate Engineer", () => {
    const result = isEntryLevel(
      makeJob({ title: "Associate Software Engineer" }),
    );
    expect(result.accepted).toBe(true);
  });

  it("accepts Trainee", () => {
    const result = isEntryLevel(makeJob({ title: "DevOps Trainee" }));
    expect(result.accepted).toBe(true);
  });

  it("accepts Fresher", () => {
    const result = isEntryLevel(
      makeJob({ title: "Fresher Software Engineer" }),
    );
    expect(result.accepted).toBe(true);
  });

  it("accepts entry from API experience field", () => {
    const result = isEntryLevel(
      makeJob({
        title: "Software Engineer",
        experience: "ENTRY",
      }),
    );
    expect(result.accepted).toBe(true);
  });

  it("accepts 0-2 years experience in description", () => {
    const result = isEntryLevel(
      makeJob({
        title: "Software Engineer",
        description: "0-2 years of experience required",
      }),
    );
    expect(result.accepted).toBe(true);
  });

  it("rejects Senior Engineer", () => {
    const result = isEntryLevel(makeJob({ title: "Senior Engineer" }));
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("Senior");
  });

  it("rejects Principal Architect", () => {
    const result = isEntryLevel(makeJob({ title: "Principal Architect" }));
    expect(result.accepted).toBe(false);
  });

  it("rejects Staff Engineer", () => {
    const result = isEntryLevel(makeJob({ title: "Staff Engineer" }));
    expect(result.accepted).toBe(false);
  });

  it("rejects Engineering Manager", () => {
    const result = isEntryLevel(makeJob({ title: "Engineering Manager" }));
    expect(result.accepted).toBe(false);
  });

  it("rejects VP of Engineering", () => {
    const result = isEntryLevel(makeJob({ title: "VP of Engineering" }));
    expect(result.accepted).toBe(false);
  });

  it("rejects Director title", () => {
    const result = isEntryLevel(makeJob({ title: "Director of Engineering" }));
    expect(result.accepted).toBe(false);
  });

  it("rejects API experience MID", () => {
    const result = isEntryLevel(
      makeJob({
        title: "Software Engineer",
        experience: "MID",
      }),
    );
    expect(result.accepted).toBe(false);
  });

  it("rejects API experience SENIOR", () => {
    const result = isEntryLevel(
      makeJob({
        title: "Software Engineer",
        experience: "SENIOR",
      }),
    );
    expect(result.accepted).toBe(false);
  });

  it("rejects 5+ years in description", () => {
    const result = isEntryLevel(
      makeJob({
        title: "Software Engineer",
        description: "5+ years of experience in backend development",
      }),
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("5+");
  });

  it("rejects 3-6 years range in description", () => {
    const result = isEntryLevel(
      makeJob({
        title: "Software Engineer",
        description: "Requires 3-6 years of experience",
      }),
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toContain("3-6");
  });

  it("rejects unknown experience level (ambiguous title, no description)", () => {
    const result = isEntryLevel(
      makeJob({
        title: "Software Engineer",
        description: "We are looking for a talented engineer to join our team",
      }),
    );
    expect(result.accepted).toBe(false);
    expect(result.reason).toBe("Unable to determine experience level");
  });

  it("rejects unknown with no clues at all", () => {
    const result = isEntryLevel(
      makeJob({
        title: "Developer",
        description: "Join our growing team",
      }),
    );
    expect(result.accepted).toBe(false);
  });
});
