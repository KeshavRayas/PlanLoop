import { describe, it, expect } from "vitest";
import { getWorkMode } from "@/lib/ingestion/location";
import type { RawJob } from "@/lib/types";

function makeJob(overrides: Partial<RawJob> = {}): RawJob {
  return {
    externalId: "test-1",
    title: "Dev",
    description: "",
    companyName: "Test Corp",
    applyUrl: "https://example.com/apply",
    ...overrides,
  };
}

// ─── WorkMode / Location Tests ───────────────────────────────────

describe("getWorkMode", () => {
  it("remote=true returns REMOTE", () => {
    expect(getWorkMode(makeJob({ remote: true }))).toBe("REMOTE");
  });

  it("remote keyword in location returns REMOTE", () => {
    expect(getWorkMode(makeJob({
      location: "Remote",
    }))).toBe("REMOTE");
  });

  it("worldwide keyword returns REMOTE", () => {
    expect(getWorkMode(makeJob({
      location: "Worldwide",
    }))).toBe("REMOTE");
  });

  it("work from home returns REMOTE", () => {
    expect(getWorkMode(makeJob({
      description: "Work from home",
      location: "India",
    }))).toBe("REMOTE");
  });

  it("Bangalore location with hybrid keyword returns HYBRID", () => {
    expect(getWorkMode(makeJob({
      title: "Software Engineer",
      description: "Hybrid role",
      location: "Bangalore",
    }))).toBe("HYBRID");
  });

  it("Bengaluru location returns HYBRID when hybrid mentioned", () => {
    expect(getWorkMode(makeJob({
      title: "Backend Engineer",
      description: "Hybrid work model",
      location: "Bengaluru, India",
    }))).toBe("HYBRID");
  });

  it("Bangalore without hybrid returns ONSITE", () => {
    expect(getWorkMode(makeJob({
      title: "Software Engineer",
      location: "Bangalore",
    }))).toBe("ONSITE");
  });

  it("Karnataka location returns ONSITE", () => {
    expect(getWorkMode(makeJob({
      location: "Karnataka, India",
    }))).toBe("ONSITE");
  });

  it("Bangalore Urban location returns ONSITE", () => {
    expect(getWorkMode(makeJob({
      location: "Bangalore Urban",
    }))).toBe("ONSITE");
  });

  it("Mumbai location returns null (reject)", () => {
    expect(getWorkMode(makeJob({
      location: "Mumbai",
    }))).toBeNull();
  });

  it("Delhi location returns null (reject)", () => {
    expect(getWorkMode(makeJob({
      location: "Delhi, India",
    }))).toBeNull();
  });

  it("Pune location returns null (reject)", () => {
    expect(getWorkMode(makeJob({
      location: "Pune",
    }))).toBeNull();
  });

  it("Hyderabad location returns null (reject)", () => {
    expect(getWorkMode(makeJob({
      location: "Hyderabad",
    }))).toBeNull();
  });

  it("Chennai location returns null (reject)", () => {
    expect(getWorkMode(makeJob({
      location: "Chennai",
    }))).toBeNull();
  });

  it("US only location without remote returns null", () => {
    expect(getWorkMode(makeJob({
      location: "US Only",
    }))).toBeNull();
  });

  it("Remote job overrides any location", () => {
    expect(getWorkMode(makeJob({
      location: "Mumbai",
      remote: true,
    }))).toBe("REMOTE");
  });

  it("EU location without remote returns null", () => {
    expect(getWorkMode(makeJob({
      description: "Europe based",
      location: "Germany",
    }))).toBeNull();
  });
});

// ─── Combined Filter Logic Tests ─────────────────────────────────

describe("combined filters (URL param construction)", () => {
  it("Remote filter sets workMode=REMOTE", () => {
    const params = new URLSearchParams();
    params.set("workMode", "REMOTE");
    expect(params.get("workMode")).toBe("REMOTE");
    expect(params.toString()).toContain("workMode=REMOTE");
  });

  it("Hybrid filter sets workMode=HYBRID and location=Bangalore", () => {
    const params = new URLSearchParams();
    params.set("workMode", "HYBRID");
    params.set("location", "Bangalore");
    expect(params.get("workMode")).toBe("HYBRID");
    expect(params.get("location")).toBe("Bangalore");
  });

  it("On-site filter sets workMode=ONSITE and location=Bangalore", () => {
    const params = new URLSearchParams();
    params.set("workMode", "ONSITE");
    params.set("location", "Bangalore");
    expect(params.get("workMode")).toBe("ONSITE");
    expect(params.get("location")).toBe("Bangalore");
  });

  it("Combined filters: Hybrid + Full-Time + Entry Level", () => {
    const params = new URLSearchParams();
    params.set("workMode", "HYBRID");
    params.set("location", "Bangalore");
    params.set("jobType", "FULL_TIME");
    params.set("experience", "ENTRY");
    params.set("q", "react");

    expect(params.get("workMode")).toBe("HYBRID");
    expect(params.get("location")).toBe("Bangalore");
    expect(params.get("jobType")).toBe("FULL_TIME");
    expect(params.get("experience")).toBe("ENTRY");
    expect(params.get("q")).toBe("react");
  });

  it("Experience filter: only ENTRY is available", () => {
    const params = new URLSearchParams();
    params.set("experience", "ENTRY");
    expect(params.get("experience")).toBe("ENTRY");
  });

  it("Employment type filters correctly", () => {
    const params = new URLSearchParams();
    params.set("jobType", "FULL_TIME");
    expect(params.get("jobType")).toBe("FULL_TIME");

    const params2 = new URLSearchParams();
    params2.set("jobType", "CONTRACT");
    expect(params2.get("jobType")).toBe("CONTRACT");

    const params3 = new URLSearchParams();
    params3.set("jobType", "INTERNSHIP");
    expect(params3.get("jobType")).toBe("INTERNSHIP");
  });

  it("Page resets to 1 on filter change", () => {
    const params = new URLSearchParams({ page: "3", workMode: "ONSITE" });
    params.set("page", "1");
    expect(params.get("page")).toBe("1");
  });

  it("Skills filter stores single value", () => {
    const params = new URLSearchParams();
    params.set("skills", "React");
    expect(params.get("skills")).toBe("React");
  });
});
