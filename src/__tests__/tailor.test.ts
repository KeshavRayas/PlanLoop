import { describe, it, expect } from "vitest";
import { tailoredResumeSchema, buildTailorPrompt } from "@/lib/tailor/contract";
import { validateTailoredResume } from "@/lib/tailor/validate";
import { collectEvidence } from "@/lib/tailor/evidence";
import type { ResumeData } from "@/lib/resume.types";

const BASE: ResumeData = {
  sections: [
    {
      id: "sec_summary",
      type: "summary",
      title: "Summary",
      items: [{ id: "summary_01", content: "Backend engineer with Go." }],
    },
    {
      id: "sec_experience",
      type: "experience",
      title: "Experience",
      items: [
        {
          id: "exp_erp",
          company: "Acme",
          title: "Intern",
          location: "",
          startDate: "",
          endDate: "",
          current: false,
          description: "",
          bulletPoints: ["bullet_erp_01: Built APIs with Go."],
        },
      ],
    },
    {
      id: "sec_education",
      type: "education",
      title: "Education",
      items: [
        {
          id: "edu_x",
          school: "X",
          degree: "B.E.",
          field: "CS",
          startDate: "",
          endDate: "",
          gpa: "",
          description: "",
        },
      ],
    },
    {
      id: "sec_skills",
      type: "skills",
      title: "Skills",
      items: [{ id: "skills_all", category: "General", skills: ["Go"] }],
    },
  ],
};

interface LooseItem {
  id: string;
  kind: string;
  fields: Record<string, unknown>;
  provenance: { sourceIds: string[]; change: string };
}

interface LooseSection {
  id: string;
  type: string;
  title: string;
  items: LooseItem[];
}

function validOutput(): { sections: LooseSection[] } {
  return {
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
            fields: { title: "Intern", bullets: ["Built APIs with Go."] },
            provenance: { sourceIds: ["bullet_erp_01"], change: "REORDER" },
          },
        ],
      },
      {
        id: "sec_education",
        type: "education",
        title: "Education",
        items: [
          {
            id: "edu_x",
            kind: "education",
            fields: { school: "X" },
            provenance: { sourceIds: ["edu_x"], change: "UNCHANGED" },
          },
        ],
      },
      {
        id: "sec_skills",
        type: "skills",
        title: "Skills",
        items: [
          {
            id: "skills_all",
            kind: "skills",
            fields: { category: "General", skills: ["Go"] },
            provenance: { sourceIds: ["skills_all"], change: "UNCHANGED" },
          },
        ],
      },
    ],
  };
}

function evidenceOfBase(): Map<string, string> {
  return new Map(
    collectEvidence(BASE).map((e) => [
      e.id,
      e.text.toLowerCase().replace(/\s+/g, " ").trim(),
    ]),
  );
}

describe("tailoredResumeSchema", () => {
  it("accepts a valid tailored resume", () => {
    expect(tailoredResumeSchema.safeParse(validOutput()).success).toBe(true);
  });

  it("rejects items without provenance", () => {
    const bad = validOutput();
    // @ts-expect-error intentionally malformed
    delete bad.sections[0].items[0].provenance;
    expect(tailoredResumeSchema.safeParse(bad).success).toBe(false);
  });

  it("rejects unknown change types", () => {
    const bad = validOutput();
    bad.sections[0].items[0].provenance.change = "INVENTED";
    expect(tailoredResumeSchema.safeParse(bad).success).toBe(false);
  });
});

describe("validateTailoredResume", () => {
  it("passes valid output", () => {
    expect(
      validateTailoredResume(validOutput() as never, evidenceOfBase()),
    ).toEqual([]);
  });

  it("flags unknown evidence IDs", () => {
    const bad = validOutput();
    const out = validateTailoredResume(
      {
        sections: bad.sections.map((s) => ({
          ...s,
          items: s.items.map((i) => ({
            ...i,
            provenance: { sourceIds: ["bullet_fake_99"], change: "REWRITE" },
          })),
        })),
      } as never,
      evidenceOfBase(),
    );
    expect(out.some((i) => i.type === "UNKNOWN_SOURCE")).toBe(true);
  });

  it("flags missing required sections", () => {
    const bad = validOutput();
    const out = validateTailoredResume(
      { sections: bad.sections.filter((s) => s.type !== "skills") } as never,
      evidenceOfBase(),
    );
    expect(out.some((i) => i.type === "MISSING_SECTION")).toBe(true);
  });

  it("flags duplicate item ids", () => {
    const bad = validOutput();
    const out = validateTailoredResume(
      {
        sections: [
          {
            ...bad.sections[0],
            items: [bad.sections[0].items[0], bad.sections[0].items[0]],
          },
          ...bad.sections.slice(1),
        ],
      } as never,
      evidenceOfBase(),
    );
    expect(out.some((i) => i.type === "DUPLICATE_ID")).toBe(true);
  });

  it("allows skills REORDER that preserves the set, rejects dropped skills", () => {
    const reordered = {
      id: "skills_all",
      kind: "skills",
      fields: { category: "General", skills: ["Go", "Python"] },
      provenance: { sourceIds: ["skills_all"], change: "REORDER" },
    };
    const dropped = {
      id: "skills_all",
      kind: "skills",
      fields: { category: "General", skills: ["Go"] },
      provenance: { sourceIds: ["skills_all"], change: "REORDER" },
    };
    const baseWithSkills = {
      sections: [
        ...BASE.sections.filter((s) => s.type !== "skills"),
        {
          id: "sec_skills",
          type: "skills",
          title: "Skills",
          items: [
            { id: "skills_all", category: "General", skills: ["Python", "Go"] },
          ],
        },
      ],
    } as unknown as ResumeData;
    const ev = new Map(
      collectEvidence(baseWithSkills).map((e) => [
        e.id,
        e.text.toLowerCase().replace(/\s+/g, " ").trim(),
      ]),
    );
    const okOut = {
      sections: [
        {
          id: "sec_summary",
          type: "summary",
          title: "S",
          items: [
            {
              id: "summary_01",
              kind: "summary",
              fields: { content: "x" },
              provenance: { sourceIds: ["summary_01"], change: "REWRITE" },
            },
          ],
        },
        {
          id: "sec_experience",
          type: "experience",
          title: "E",
          items: [
            {
              id: "exp_1",
              kind: "experience",
              fields: { title: "T" },
              provenance: { sourceIds: ["summary_01"], change: "REWRITE" },
            },
          ],
        },
        {
          id: "sec_education",
          type: "education",
          title: "Ed",
          items: [
            {
              id: "edu_1",
              kind: "education",
              fields: { school: "S" },
              provenance: { sourceIds: ["summary_01"], change: "REWRITE" },
            },
          ],
        },
        { id: "sec_skills", type: "skills", title: "Sk", items: [reordered] },
      ],
    };
    expect(validateTailoredResume(okOut as never, ev, baseWithSkills)).toEqual(
      [],
    );
    const badOut = {
      sections: okOut.sections.map((s, i) =>
        i === 3 ? { ...s, items: [dropped] } : s,
      ),
    };
    const issues = validateTailoredResume(badOut as never, ev, baseWithSkills);
    expect(issues.some((i) => i.type === "TEXT_MISMATCH")).toBe(true);
  });

  it("is immune to object key order (JSONB regression)", async () => {
    // Postgres JSONB reorders object keys; evidenceText must canonicalize
    // key order so a DB round-trip never breaks UNCHANGED comparison.
    const { evidenceText } = await import("@/lib/tailor/evidence");
    const codeOrder = evidenceText({ category: "L", skills: ["Go"] });
    const dbOrder = evidenceText(
      JSON.parse('{"skills": ["Go"], "category": "L"}'),
    );
    expect(codeOrder).toBe(dbOrder);
  });

  it("flags UNCHANGED flat-text items whose text differs from source", () => {
    const bad = validOutput();
    const out = validateTailoredResume(
      {
        sections: bad.sections.map((s) =>
          s.type === "summary"
            ? {
                ...s,
                items: [
                  {
                    ...s.items[0],
                    fields: { content: "Invented history here." },
                    provenance: {
                      sourceIds: ["summary_01"],
                      change: "UNCHANGED",
                    },
                  },
                ],
              }
            : s,
        ),
      } as never,
      evidenceOfBase(),
    );
    expect(out.some((i) => i.type === "TEXT_MISMATCH")).toBe(true);
  });
});

describe("buildTailorPrompt", () => {
  it("embeds job, analysis, and evidence with honest-gap framing", () => {
    const p = buildTailorPrompt({
      jobTitle: "Backend Engineer",
      companyName: "Acme",
      location: "Remote",
      analysisSummary: "Strong Go fit.",
      requiredSkills: ["Go"],
      missingSkills: ["Kubernetes"],
      verdict: "POSSIBLE",
      evidence: [
        { id: "summary_01", kind: "summary", text: "Backend engineer." },
      ],
    });
    expect(p).toContain("Backend Engineer at Acme");
    expect(p).toContain("[summary_01 | summary]");
    expect(p).toContain("leave visible");
  });
});
