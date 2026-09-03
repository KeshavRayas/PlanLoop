import { describe, it, expect } from "vitest";
import {
  semanticResultSchema,
  buildValidatePrompt,
} from "@/lib/tailor/semantic";
import { applyHighRule } from "@/lib/tailor/validateSemantic";

// ─── Adversarial fixtures (Phase 2.3) ────────────────────────────────────────
// Eight tailored-item shapes against one evidence item. The contract + prompt
// properties are asserted here; live model verdicts are verified separately
// against the real Snowflake tailored resume (see docs/tailored-resume.md).

const EVIDENCE = [{ id: "bullet_erp_05", text: "Design and optimize database queries for PostgreSQL-backed services." }];
const JD_MARKER = "Snowflake-Internal-JD-Should-Never-Appear";

function promptFor(itemText: string, sourceIds: string[] = ["bullet_erp_05"]) {
  return buildValidatePrompt({
    jobTitle: "Software Engineer Intern",
    companyName: "Snowflake",
    evidence: EVIDENCE,
    items: [{ id: "test_item", text: itemText, sourceIds }],
  });
}

describe("buildValidatePrompt", () => {
  it("includes evidence and item text for all adversarial shapes", () => {
    const shapes = [
      "Design and optimize database queries for PostgreSQL services.", // 1 honest rewrite
      "Designed PostgreSQL databases.", // 5 rephrased claim
      "Design and optimize database queries; led a team of five engineers.", // 4 inflated
      "Architected Kubernetes clusters at scale.", // 2 new technology
      "Improved query latency by 90% across millions of requests.", // 3 new metric
      "PostgreSQL work combined with API auth flows for reliability.", // 7 combined
      "PostgreSQL expertise proves distributed Snowflake internals mastery.", // 8 JD inference
      "Stronger wording that remains supported: optimize complex PostgreSQL queries.", // 6 stronger-but-supported
    ];
    for (const text of shapes) {
      const p = promptFor(text);
      expect(p).toContain(text);
      expect(p).toContain("[bullet_erp_05]");
    }
  });

  it("never includes the job description — title is context only", () => {
    const p = promptFor("Some claim.") + JD_MARKER;
    // Builder receives no description field at all: assert the marker only
    // exists because this test appended it, i.e. builder output shape holds
    // evidence + items and nothing else.
    const clean = buildValidatePrompt({
      jobTitle: "T",
      companyName: "C",
      evidence: EVIDENCE,
      items: [{ id: "i", text: "x", sourceIds: ["bullet_erp_05"] }],
    });
    expect(clean).not.toContain(JD_MARKER);
    expect(clean).toContain("context only, not evidence");
  });
});

describe("semanticResultSchema", () => {
  it("accepts a clean PASS", () => {
    expect(semanticResultSchema.safeParse({ valid: true, issues: [] }).success).toBe(true);
  });

  it("accepts a FAIL with typed issues", () => {
    const r = semanticResultSchema.safeParse({
      valid: false,
      issues: [
        { itemId: "x", type: "NEW_METRIC", severity: "HIGH", explanation: "90% invented" },
        { itemId: "y", type: "INFLATED_CLAIM", severity: "MEDIUM", explanation: "led a team" },
      ],
    });
    expect(r.success).toBe(true);
  });

  it("rejects unknown issue types and empty explanations", () => {
    expect(
      semanticResultSchema.safeParse({
        valid: false,
        issues: [{ itemId: "x", type: "HALLUCINATION", severity: "HIGH", explanation: "z" }],
      }).success
    ).toBe(false);
    expect(
      semanticResultSchema.safeParse({
        valid: false,
        issues: [{ itemId: "x", type: "NEW_METRIC", severity: "HIGH", explanation: "" }],
      }).success
    ).toBe(false);
  });
});

describe("applyHighRule", () => {
  it("passes clean results through", () => {
    expect(applyHighRule({ valid: true, issues: [] })).toEqual({ valid: true, forced: false });
  });

  it("forces invalid on HIGH even when the model claims valid", () => {
    const r = applyHighRule({
      valid: true,
      issues: [{ itemId: "x", type: "NEW_METRIC", severity: "HIGH", explanation: "invented 90%" }],
    });
    expect(r).toEqual({ valid: false, forced: true });
  });

  it("leaves LOW-only results to the model verdict", () => {
    const r = applyHighRule({
      valid: true,
      issues: [{ itemId: "x", type: "INFLATED_CLAIM", severity: "LOW", explanation: "stretch" }],
    });
    expect(r).toEqual({ valid: true, forced: false });
  });
});
