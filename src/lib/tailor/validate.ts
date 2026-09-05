import {
  REQUIRED_SECTION_TYPES,
  type TailoredResumeData,
} from "@/lib/tailor/contract";
import { evidenceText, normalizeText } from "@/lib/tailor/evidence";
import type { ResumeData } from "@/lib/resume.types";

// ─── Deterministic tailor validation (Phase 2.2) ─────────────────────────────
// No model involved. Checks provenance integrity against the base resume's
// evidence map (id → normalized text). Semantic claim checking (does a
// REWRITE preserve meaning?) arrives with LLM validation in Phase 2.3.

export interface ValidationIssue {
  type:
    | "MISSING_SECTION"
    | "UNKNOWN_SOURCE"
    | "EMPTY_SOURCES"
    | "DUPLICATE_ID"
    | "TEXT_MISMATCH";
  text: string;
}

/**
 * Kinds whose items are flat text (single content string / skill list).
 * Only these get verbatim TEXT_MISMATCH checks — structured kinds
 * (experience, projects, education) reorder fields by nature, and semantic
 * equality is Phase 2.3 (LLM validation) territory.
 */
const FLAT_KINDS = new Set(["summary", "skills", "custom"]);

export function validateTailoredResume(
  output: TailoredResumeData,
  evidence: Map<string, string>,
  base?: ResumeData,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  const types = new Set(output.sections.map((s) => s.type));
  for (const required of REQUIRED_SECTION_TYPES) {
    if (!types.has(required)) {
      issues.push({
        type: "MISSING_SECTION",
        text: `required section missing: ${required}`,
      });
    }
  }

  const seenIds = new Set<string>();
  for (const section of output.sections) {
    for (const item of section.items) {
      if (seenIds.has(item.id)) {
        issues.push({
          type: "DUPLICATE_ID",
          text: `duplicate item id: ${item.id}`,
        });
      }
      seenIds.add(item.id);

      const sources = item.provenance.sourceIds;
      if (sources.length === 0) {
        issues.push({
          type: "EMPTY_SOURCES",
          text: `no sources cited: ${item.id}`,
        });
        continue;
      }
      for (const src of sources) {
        if (!evidence.has(src)) {
          issues.push({
            type: "UNKNOWN_SOURCE",
            text: `${item.id} cites unknown evidence: ${src}`,
          });
        }
      }

      // UNCHANGED / REORDER on flat-text kinds must reproduce a cited
      // source verbatim — except skills lists, where reordering items
      // within the list is legitimate tailoring (set equality instead).
      const change = item.provenance.change;
      if (
        FLAT_KINDS.has(item.kind) &&
        (change === "UNCHANGED" || change === "REORDER") &&
        sources.length === 1
      ) {
        if (item.kind === "skills" && base) {
          const source = findSkillsItem(base, sources[0]);
          const got = fieldSkills(item.fields);
          if (source && !sameSet(source, got)) {
            issues.push({
              type: "TEXT_MISMATCH",
              text: `${item.id} skills differ from ${sources[0]} (reorder must preserve the set)`,
            });
          }
        } else {
          const sourceText = evidence.get(sources[0]);
          const itemText = normalizeText(
            evidenceText(item.fields as Record<string, unknown>),
          );
          if (sourceText !== undefined && itemText !== sourceText) {
            issues.push({
              type: "TEXT_MISMATCH",
              text: `${item.id} marked ${change} but text differs from ${sources[0]}`,
            });
          }
        }
      }
    }
  }

  return issues;
}

function fieldSkills(fields: Record<string, unknown>): string[] {
  const skills = (fields as { skills?: unknown }).skills;
  return Array.isArray(skills)
    ? skills.filter((s): s is string => typeof s === "string")
    : [];
}

function findSkillsItem(base: ResumeData, id: string): string[] | null {
  for (const section of base.sections ?? []) {
    for (const item of section.items ?? []) {
      if ((item as { id?: string }).id === id && section.type === "skills") {
        return fieldSkills(item as unknown as Record<string, unknown>);
      }
    }
  }
  return null;
}

function sameSet(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const counts = new Map<string, number>();
  for (const s of a) counts.set(s, (counts.get(s) ?? 0) + 1);
  for (const s of b) {
    const n = counts.get(s) ?? 0;
    if (n === 0) return false;
    counts.set(s, n - 1);
  }
  return true;
}
