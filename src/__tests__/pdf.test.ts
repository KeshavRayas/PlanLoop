import { describe, it, expect } from "vitest";
import { execFileSync } from "node:child_process";
import { canonicalizeTailored } from "@/lib/tailor/canonical";
import { escapeLatex, renderLatex } from "@/lib/pdf/latex";
import { compileLatex } from "@/lib/pdf/compile";
import { extractPdfText, runAtsChecks } from "@/lib/pdf/ats";

function hasPdflatex(): boolean {
  try {
    execFileSync(process.platform === "win32" ? "pdflatex.exe" : "pdflatex", [
      "--version",
    ]);
    return true;
  } catch {
    return false;
  }
}

describe("escapeLatex", () => {
  it("escapes all special characters", () => {
    expect(escapeLatex("R&D 50% $100 #1 _x_ {a} ~ ^ \\")).toBe(
      "R\\&D 50\\% \\$100 \\#1 \\_x\\_ \\{a\\} \\textasciitilde{} \\textasciircumflex{} \\textbackslash{}",
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeLatex("Built backend APIs with Go.")).toBe(
      "Built backend APIs with Go.",
    );
  });
});

describe("canonicalizeTailored", () => {
  const raw = {
    sections: [
      {
        id: "s1",
        type: "summary",
        title: "Summary",
        items: [
          {
            id: "a",
            kind: "summary",
            fields: { text: "Hello." },
            provenance: { sourceIds: ["a"], change: "REWRITE" },
          },
        ],
      },
      {
        id: "s2",
        type: "experience",
        title: "Experience",
        items: [
          {
            id: "b",
            kind: "experience",
            fields: { title: "Dev", bullets: ["Did x."] },
            provenance: { sourceIds: ["b"], change: "REORDER" },
          },
        ],
      },
      {
        id: "s3",
        type: "projects",
        title: "Projects",
        items: [
          {
            id: "c",
            kind: "projects",
            fields: { name: "P", tech: ["Go"] },
            provenance: { sourceIds: ["c"], change: "UNCHANGED" },
          },
        ],
      },
    ],
  } as never;

  it("maps model field variants to canonical fields", () => {
    const out = canonicalizeTailored(raw);
    const byId = new Map(
      out.sections.flatMap((s) => s.items.map((i) => [i.id, i])),
    );
    expect((byId.get("a")!.fields as { content: string }).content).toBe(
      "Hello.",
    );
    expect(
      (byId.get("b")!.fields as { bulletPoints: string[] }).bulletPoints,
    ).toEqual(["Did x."]);
    expect(
      (byId.get("c")!.fields as { technologies: string[] }).technologies,
    ).toEqual(["Go"]);
  });

  it("preserves ids and provenance", () => {
    const out = canonicalizeTailored(raw);
    const item = out.sections[0].items[0];
    expect(item.id).toBe("a");
    expect(item.provenance).toEqual({ sourceIds: ["a"], change: "REWRITE" });
  });

  it("is idempotent", () => {
    const once = canonicalizeTailored(raw);
    const twice = canonicalizeTailored({ sections: once.sections } as never);
    expect(twice).toEqual(once);
  });
});

describe("runAtsChecks", () => {
  const text = [
    "Keshav Rayas",
    "Summary Backend engineer with Go and PostgreSQL.",
    "Experience Software Intern. Built APIs with Go. Optimized PostgreSQL queries.",
    "Education B.E. Computer Science.",
    "Skills Python, Go, TypeScript, PostgreSQL.",
    "keshav.rayas@gmail.com",
  ].join("\n");

  it("detects sections and keyword coverage", () => {
    const r = runAtsChecks(text, ["Go", "PostgreSQL", "Kubernetes"], {
      contactEmail: "keshav.rayas@gmail.com",
    });
    expect(r.textExtractable).toBe(true);
    expect(r.sections).toEqual({
      summary: true,
      experience: true,
      education: true,
      skills: true,
    });
    expect(r.requiredSkillsFound).toBe(2);
    expect(r.requiredSkillsTotal).toBe(3);
    expect(r.missingKeywords).toEqual(["Kubernetes"]);
    expect(r.keywordCoverage).toBeCloseTo(2 / 3, 4);
    expect(r.warnings.join(" ")).toContain("Kubernetes");
  });

  it("flags short/broken text layers", () => {
    const r = runAtsChecks("tiny", ["Go"]);
    expect(r.textExtractable).toBe(false);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe.skipIf(!hasPdflatex())("pdflatex round trip", () => {
  it("renders, compiles, and extracts with content intact", async () => {
    const tex = renderLatex(
      {
        sections: [
          {
            id: "s1",
            type: "summary",
            title: "Summary",
            items: [
              {
                id: "a",
                kind: "summary",
                fields: {
                  content:
                    "Backend engineer with Go and PostgreSQL. R&D focused 100%.",
                },
                provenance: { sourceIds: ["a"], change: "REWRITE" },
              },
            ],
          },
          {
            id: "s2",
            type: "experience",
            title: "Experience",
            items: [
              {
                id: "b",
                kind: "experience",
                fields: {
                  title: "Software Intern",
                  company: "Acme",
                  bulletPoints: [
                    "Zebra-striped query optimization for PostgreSQL.",
                  ],
                },
                provenance: { sourceIds: ["b"], change: "UNCHANGED" },
              },
            ],
          },
          {
            id: "s3",
            type: "skills",
            title: "Skills",
            items: [
              {
                id: "c",
                kind: "skills",
                fields: { category: "Languages", skills: ["Go", "Python"] },
                provenance: { sourceIds: ["c"], change: "UNCHANGED" },
              },
            ],
          },
        ],
      },
      {
        name: "Keshav Rayas",
        location: "Bangalore",
        email: "keshav.rayas@gmail.com",
      },
    );

    const { pdf } = await compileLatex(tex);
    expect(pdf.length).toBeGreaterThan(1000);

    const text = await extractPdfText(pdf);
    for (const needle of [
      "Keshav Rayas",
      "keshav.rayas@gmail.com",
      "Backend engineer",
      "Zebra-striped query optimization",
      "Languages",
    ]) {
      expect(text).toContain(needle);
    }
    // No duplication: unique bullet appears exactly once.
    expect(text.split("Zebra-striped query optimization").length - 1).toBe(1);
  }, 120_000);
});
