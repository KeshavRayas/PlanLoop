import { describe, it, expect } from "vitest";
import {
  coverLetterSchema,
  buildCoverPrompt,
  COVER_SYSTEM_PROMPT,
} from "@/lib/cover/contract";
import { validateCoverLetter } from "@/lib/cover/validate";
import { extractTailoredHighlights } from "@/lib/cover/service";

function validOutput() {
  return {
    subject: "Application for Backend Engineer",
    greeting: "Dear Hiring Manager,",
    paragraphs: [
      "I am excited to apply for the Backend Engineer role at Acme.",
      "At Acme I built backend APIs with PostgreSQL serving 10k requests a day.",
      "Thank you for your consideration — I would welcome the chance to discuss the role.",
    ],
    closing: "Sincerely, Jane",
    evidenceIds: ["bullet_erp_02"],
  };
}

const EVIDENCE = new Map([
  ["summary_01", "backend engineer with go"],
  ["bullet_erp_02", "acme: built backend apis with postgresql"],
]);

describe("coverLetterSchema", () => {
  it("accepts a valid cover letter", () => {
    expect(coverLetterSchema.safeParse(validOutput()).success).toBe(true);
  });

  it("accepts a letter without optional subject", () => {
    const out = validOutput();
    // @ts-expect-error intentionally malformed
    delete out.subject;
    expect(coverLetterSchema.safeParse(out).success).toBe(true);
  });

  it("rejects fewer than 3 paragraphs", () => {
    expect(
      coverLetterSchema.safeParse({
        ...validOutput(),
        paragraphs: ["one", "two"],
      }).success,
    ).toBe(false);
  });

  it("rejects missing evidenceIds", () => {
    const out = { ...validOutput(), evidenceIds: [] as string[] };
    expect(coverLetterSchema.safeParse(out).success).toBe(false);
  });

  it("rejects missing greeting/closing", () => {
    expect(
      coverLetterSchema.safeParse({ ...validOutput(), greeting: "" }).success,
    ).toBe(false);
    expect(
      coverLetterSchema.safeParse({ ...validOutput(), closing: "" }).success,
    ).toBe(false);
  });
});

describe("validateCoverLetter", () => {
  it("passes valid output", () => {
    expect(validateCoverLetter(validOutput(), EVIDENCE)).toEqual([]);
  });

  it("rejects invented achievements (unknown evidence IDs)", () => {
    // Adversarial: model cites an ID it was never given to back an
    // invented claim — the deterministic gate must refuse to persist it.
    const adversarial = {
      ...validOutput(),
      paragraphs: [
        "I am excited to apply for the Backend Engineer role at Acme.",
        "I led a 50-person Kubernetes migration that cut costs by 90%.",
        "Thank you for your consideration.",
      ],
      evidenceIds: ["bullet_k8s_99"],
    };
    const issues = validateCoverLetter(adversarial, EVIDENCE);
    expect(issues.some((i) => i.type === "UNKNOWN_SOURCE")).toBe(true);
  });

  it("rejects duplicate evidence IDs", () => {
    const out = {
      ...validOutput(),
      evidenceIds: ["bullet_erp_02", "bullet_erp_02"],
    };
    expect(
      validateCoverLetter(out, EVIDENCE).some(
        (i) => i.type === "DUPLICATE_EVIDENCE",
      ),
    ).toBe(true);
  });
});

describe("cover prompt", () => {
  it("embeds job, analysis, highlights, and evidence with no-invent framing", () => {
    const p = buildCoverPrompt({
      jobTitle: "Backend Engineer",
      companyName: "Acme",
      location: "Remote",
      analysisSummary: "Strong Go fit.",
      requiredSkills: ["Go"],
      missingSkills: ["Kubernetes"],
      verdict: "POSSIBLE",
      tailoredHighlights: ["Built backend APIs with PostgreSQL."],
      evidence: [
        {
          id: "bullet_erp_02",
          kind: "experience",
          text: "Built backend APIs.",
        },
      ],
    });
    expect(p).toContain("Backend Engineer at Acme");
    expect(p).toContain("[bullet_erp_02 | experience]");
    expect(p).toContain("leave out");
    expect(p).toContain("Built backend APIs with PostgreSQL.");
  });

  it("system prompt forbids invention", () => {
    expect(COVER_SYSTEM_PROMPT).toContain("never invent");
  });
});

describe("extractTailoredHighlights", () => {
  const canonical = {
    sections: [
      {
        id: "sec_summary",
        type: "summary",
        title: "Summary",
        items: [
          {
            id: "summary_01",
            kind: "summary",
            fields: { content: "Backend engineer with Go and PostgreSQL." },
            provenance: { sourceIds: ["summary_01"], change: "REWRITE" },
          },
        ],
      },
      {
        id: "sec_experience",
        type: "experience",
        title: "Experience",
        items: [
          {
            id: "exp_erp",
            kind: "experience",
            fields: {
              title: "Intern",
              bullets: ["Built APIs with Go.", "Cut latency 20%."],
            },
            provenance: { sourceIds: ["bullet_erp_01"], change: "REORDER" },
          },
        ],
      },
    ],
  };

  it("flattens canonical tailored content into highlight strings", () => {
    const highlights = extractTailoredHighlights(canonical);
    expect(highlights).toHaveLength(2);
    expect(highlights[0]).toContain("Backend engineer with Go");
    expect(highlights[1]).toContain("Built APIs with Go.");
  });

  it("respects the limit", () => {
    expect(extractTailoredHighlights(canonical, 1)).toHaveLength(1);
  });

  it("returns [] for unknown shapes instead of throwing", () => {
    expect(extractTailoredHighlights(null)).toEqual([]);
    expect(extractTailoredHighlights({})).toEqual([]);
    expect(extractTailoredHighlights({ sections: "nope" })).toEqual([]);
  });
});
