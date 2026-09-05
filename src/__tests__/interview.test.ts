import { describe, it, expect } from "vitest";
import {
  interviewPrepSchema,
  buildInterviewPrompt,
} from "@/lib/interview/contract";
import { validateInterviewPrep } from "@/lib/interview/validate";
import { relevantEvidence } from "@/lib/interview/service";

function question(overrides: Record<string, unknown> = {}) {
  return {
    question: "How did you find the bottleneck?",
    whyAsked: "Probes debugging depth.",
    evidenceIds: ["bullet_erp_04"],
    answerStructure: ["symptom", "fix"],
    followUps: ["What would you monitor?"],
    ...overrides,
  };
}

interface LooseQuestion {
  question: string;
  whyAsked: string;
  evidenceIds: string[];
  answerStructure: string[];
  followUps: string[];
  starStory?: {
    situation: string;
    task: string;
    action: string;
    result: string;
    evidenceIds: string[];
  };
}

function validOutput(): {
  technical: LooseQuestion[];
  resumeBased: LooseQuestion[];
  behavioral: LooseQuestion[];
  toAsk: string[];
  gaps: { skill: string; bridgeAnswer: string }[];
} {
  const tech = Array.from({ length: 5 }, (_, i) =>
    question({ question: `Technical Q${i}` }),
  );
  const resume = Array.from({ length: 5 }, (_, i) =>
    question({ question: `Resume Q${i}` }),
  );
  const behavioral = [
    question({
      question: "Tell me about a performance win.",
      starStory: {
        situation: "Slow queries.",
        task: "Speed them up.",
        action: "Added indexes.",
        result: "Faster.",
        evidenceIds: ["bullet_erp_05"],
      },
    }),
    question({ question: "Why this role?" }),
    question({ question: "A disagreement?" }),
    question({ question: "A failed project?" }),
  ];
  return {
    technical: tech,
    resumeBased: resume,
    behavioral,
    toAsk: ["Team size?", "On-call?", "Stack?", "Growth?"],
    gaps: [{ skill: "Kubernetes", bridgeAnswer: "No prod K8s, but Docker..." }],
  };
}

const EVIDENCE = new Map([
  ["bullet_erp_04", "diagnose issues"],
  ["bullet_erp_05", "optimize queries"],
]);

describe("interviewPrepSchema", () => {
  it("accepts a valid pack with optional starStory", () => {
    expect(interviewPrepSchema.safeParse(validOutput()).success).toBe(true);
  });

  it("accepts behavioral without starStory", () => {
    const out = validOutput();
    expect(interviewPrepSchema.safeParse(out).success).toBe(true);
  });

  it("enforces counts: 5/5/4/4", () => {
    const out = validOutput();
    expect(
      interviewPrepSchema.safeParse({
        ...out,
        technical: out.technical.slice(0, 4),
      }).success,
    ).toBe(false);
    expect(
      interviewPrepSchema.safeParse({ ...out, toAsk: [...out.toAsk, "Extra?"] })
        .success,
    ).toBe(false);
  });

  it("rejects starStory without evidence", () => {
    const out = validOutput();
    const bad = JSON.parse(JSON.stringify(out));
    bad.behavioral[0].starStory.evidenceIds = [];
    expect(interviewPrepSchema.safeParse(bad).success).toBe(false);
  });
});

describe("validateInterviewPrep", () => {
  it("passes fully-cited output", () => {
    expect(validateInterviewPrep(validOutput() as never, EVIDENCE)).toEqual([]);
  });

  it("flags unknown evidence on questions and star stories", () => {
    const bad = validOutput();
    const out = validateInterviewPrep(
      {
        ...bad,
        technical: [{ ...bad.technical[0], evidenceIds: ["bullet_nope_99"] }],
        behavioral: [
          {
            ...bad.behavioral[0],
            starStory: {
              ...(bad.behavioral[0].starStory as object),
              evidenceIds: ["bullet_nope_98"],
            },
          },
          ...bad.behavioral.slice(1),
        ],
      } as never,
      EVIDENCE,
    );
    const texts = out.map((i) => i.text).join(" | ");
    expect(out.some((i) => i.type === "UNKNOWN_SOURCE")).toBe(true);
    expect(texts).toContain("bullet_nope_99");
    expect(texts).toContain("bullet_nope_98");
  });
});

describe("relevantEvidence", () => {
  const all = [
    { id: "bullet_erp_02", kind: "experience", text: "APIs" },
    { id: "other_1", kind: "experience", text: "Unrelated" },
    { id: "skills_languages", kind: "skills", text: "Python" },
    { id: "summary_01", kind: "summary", text: "Backend" },
  ];
  const tailored = {
    sections: [{ items: [{ provenance: { sourceIds: ["bullet_erp_02"] } }] }],
  };

  it("prefers cited evidence, then skills/summary, capped", () => {
    const out = relevantEvidence(all, tailored, 2);
    expect(out.map((e) => e.id)).toEqual(["bullet_erp_02", "skills_languages"]);
  });

  it("handles missing tailored shapes defensively", () => {
    expect(relevantEvidence(all, null, 10).map((e) => e.id)).toContain(
      "skills_languages",
    );
    expect(relevantEvidence(all, {}, 10).length).toBeGreaterThan(0);
  });
});

describe("buildInterviewPrompt", () => {
  it("embeds job, gaps-as-bridges, and evidence", () => {
    const p = buildInterviewPrompt({
      jobTitle: "Backend Engineer",
      companyName: "Acme",
      location: "Remote",
      analysisSummary: "Strong fit.",
      requiredSkills: ["Go"],
      missingSkills: ["Kubernetes"],
      verdict: "STRONG",
      tailoredHighlights: ["Built APIs."],
      evidence: [
        { id: "bullet_erp_02", kind: "experience", text: "Built APIs." },
      ],
    });
    expect(p).toContain("Backend Engineer at Acme");
    expect(p).toContain("[bullet_erp_02 | experience]");
    expect(p).toContain("bridge honestly");
    expect(p).toContain("starStory");
  });
});
