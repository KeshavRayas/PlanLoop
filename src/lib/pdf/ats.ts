// ─── ATS extraction + checks (Phase 2.4) ─────────────────────────────────────
// Deterministic: pdfjs-dist text layer → concrete checks. No scores that
// pretend to be universal, no model calls.

export interface AtsResult {
  textExtractable: boolean;
  charCount: number;
  sections: {
    summary: boolean;
    experience: boolean;
    education: boolean;
    skills: boolean;
  };
  requiredSkillsFound: number;
  requiredSkillsTotal: number;
  matchedKeywords: string[];
  missingKeywords: string[];
  keywordCoverage: number;
  warnings: string[];
}

export async function extractPdfText(pdf: Buffer): Promise<string> {
  // Legacy build works on Node without a bundled worker: point workerSrc at
  // the absolute file so Turbopack's chunk-relative resolution is bypassed.
  const pdfjs =
    (await import("pdfjs-dist/legacy/build/pdf.mjs")) as typeof import("pdfjs-dist/types/src/pdf");
  const { default: path } = await import("node:path");
  const { pathToFileURL } = await import("node:url");
  const { existsSync } = await import("node:fs");
  const workerSrc = path.join(
    process.cwd(),
    "node_modules",
    "pdfjs-dist",
    "legacy",
    "build",
    "pdf.worker.mjs",
  );
  if (existsSync(workerSrc)) {
    // Absolute Windows paths must be file:// URLs for the ESM loader.
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(workerSrc).href;
  }
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(pdf),
    verbosity: 0,
  }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ("str" in item ? (item.str as string) : ""))
        .join(" "),
    );
  }
  await doc.cleanup();
  return pages
    .join("\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function runAtsChecks(
  text: string,
  requiredSkills: string[],
  opts: { contactEmail?: string | null } = {},
): AtsResult {
  const lower = text.toLowerCase();
  const warnings: string[] = [];

  const textExtractable = text.length >= 200;
  if (!textExtractable) {
    warnings.push(
      `only ${text.length} extractable characters — PDF text layer may be broken`,
    );
  }

  const sections = {
    summary: lower.includes("summary"),
    experience: lower.includes("experience"),
    education: lower.includes("education"),
    skills: lower.includes("skills"),
  };
  for (const [name, found] of Object.entries(sections)) {
    if (!found) warnings.push(`section not detected in text layer: ${name}`);
  }

  const matchedKeywords: string[] = [];
  const missingKeywords: string[] = [];
  for (const skill of requiredSkills) {
    if (skill && lower.includes(skill.toLowerCase()))
      matchedKeywords.push(skill);
    else if (skill) missingKeywords.push(skill);
  }
  const keywordCoverage =
    requiredSkills.length === 0
      ? 1
      : matchedKeywords.length / requiredSkills.length;
  for (const missing of missingKeywords) {
    warnings.push(`required skill missing from text layer: ${missing}`);
  }

  if (opts.contactEmail && !lower.includes(opts.contactEmail.toLowerCase())) {
    warnings.push("contact email not found in text layer");
  }

  return {
    textExtractable,
    charCount: text.length,
    sections,
    requiredSkillsFound: matchedKeywords.length,
    requiredSkillsTotal: requiredSkills.length,
    matchedKeywords,
    missingKeywords,
    keywordCoverage: Math.round(keywordCoverage * 10000) / 10000,
    warnings,
  };
}
