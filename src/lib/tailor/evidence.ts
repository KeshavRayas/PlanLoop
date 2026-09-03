import type { ResumeData } from "@/lib/resume.types";

// ─── Evidence helpers (Phase 2.2) ────────────────────────────────────────────
// Flatten structured ResumeData into citable evidence: id + kind + text.
// The same text function feeds the prompt builder and the deterministic
// validator, so "UNCHANGED means identical" is checkable.

export interface EvidenceItem {
  id: string;
  kind: string;
  text: string;
}

function renderValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.filter((v) => typeof v === "string").join(" ");
  return "";
}

/** Rendered text of a resume item (all string content, whitespace-collapsed).
 * Keys iterate in SORTED order: Postgres JSONB does not preserve object key
 * order, so both evidence and candidate text must canonicalize it, or
 * byte-identical content compares unequal after a DB round-trip. */
export function evidenceText(item: Record<string, unknown>): string {
  if (!item || typeof item !== "object") return "";
  const parts: string[] = [];
  for (const key of Object.keys(item).sort()) {
    if (key === "id") continue;
    const rendered = renderValue((item as Record<string, unknown>)[key]);
    if (rendered.trim()) parts.push(rendered.trim());
  }
  return parts.join(" ").replace(/\s+/g, " ").trim();
}

export function normalizeText(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

/** All citable evidence in a base resume, in document order. */
export function collectEvidence(data: ResumeData): EvidenceItem[] {
  const out: EvidenceItem[] = [];
  for (const section of data.sections ?? []) {
    for (const item of section.items ?? []) {
      const record = item as unknown as Record<string, unknown>;
      const id = typeof record.id === "string" ? record.id : null;
      if (!id) continue;
      // Section-level skills items cite per-category; bullets cite per-bullet.
      if (section.type === "experience" || section.type === "projects") {
        const bullets = (record.bulletPoints as string[] | undefined) ?? [];
        const header = [record.title, record.company, record.name]
          .filter((v) => typeof v === "string" && v)
          .join(" — ");
        bullets.forEach((b, i) => {
          const bulletId = /^bullet_[a-z]+_\d+$/.test(b.split(":")[0] ?? "")
            ? b.split(":")[0]
            : `${id}_b${i + 1}`;
          const text = b.replace(/^bullet_[a-z]+_\d+:\s*/, "");
          out.push({ id: bulletId, kind: section.type, text: `${header}: ${text}` });
        });
        // The item shell itself (title/company/dates) is citable too.
        out.push({ id, kind: section.type, text: header });
      } else {
        out.push({ id, kind: section.type, text: evidenceText(record) });
      }
    }
  }
  return out.filter((e) => e.text.length > 0);
}

/** id → normalized text, for validator lookups. */
export function evidenceMap(data: ResumeData): Map<string, string> {
  return new Map(collectEvidence(data).map((e) => [e.id, normalizeText(e.text)]));
}
