import type { TailoredResumeData } from "@/lib/tailor/contract";

// ─── Canonicalization (Phase 2.4) ────────────────────────────────────────────
// Boundary rule: the renderer receives ONE canonical ResumeData shape.
// The model sometimes names fields its own way (summary `text` instead of
// `content`, `bullets` instead of `bulletPoints`, `tech` instead of
// `technologies`). This maps those variants once, here — never in the
// renderer. Idempotent: canonical input passes through unchanged.

export interface CanonicalItem {
  id: string;
  kind: string;
  fields: Record<string, unknown>;
  provenance: { sourceIds: string[]; change: string };
}

export interface CanonicalSection {
  id: string;
  type: string;
  title: string;
  items: CanonicalItem[];
}

export interface CanonicalResume {
  sections: CanonicalSection[];
}

type Fields = Record<string, unknown>;

function str(f: Fields, ...keys: string[]): string {
  for (const k of keys) {
    const v = f[k];
    if (typeof v === "string" && v.trim()) return v;
  }
  return "";
}

function strArr(f: Fields, ...keys: string[]): string[] {
  for (const k of keys) {
    const v = f[k];
    if (Array.isArray(v))
      return v.filter((x): x is string => typeof x === "string");
  }
  return [];
}

function bool(f: Fields, key: string): boolean {
  return f[key] === true;
}

function pickBase(f: Fields, keys: string[]): Fields {
  const out: Fields = {};
  for (const k of keys) {
    if (f[k] !== undefined) out[k] = f[k];
  }
  return out;
}

function canonicalFields(kind: string, f: Fields): Fields {
  switch (kind) {
    case "summary":
      return { content: str(f, "content", "text", "summary") };
    case "experience":
      return {
        ...pickBase(f, [
          "title",
          "company",
          "location",
          "startDate",
          "endDate",
          "description",
        ]),
        current: bool(f, "current"),
        bulletPoints: strArr(f, "bulletPoints", "bullets"),
      };
    case "education":
      return {
        ...pickBase(f, [
          "school",
          "degree",
          "field",
          "startDate",
          "endDate",
          "gpa",
          "description",
        ]),
      };
    case "skills":
      return {
        ...pickBase(f, ["category"]),
        skills: strArr(f, "skills"),
      };
    case "projects":
      return {
        ...pickBase(f, ["name", "url", "description"]),
        bulletPoints: strArr(f, "bulletPoints", "bullets"),
        technologies: strArr(f, "technologies", "tech"),
      };
    case "certifications":
      return { ...pickBase(f, ["name", "issuer", "date", "url"]) };
    default:
      return { content: str(f, "content", "text") };
  }
}

export function canonicalizeTailored(
  data: TailoredResumeData,
): CanonicalResume {
  return {
    sections: data.sections.map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      items: s.items.map((item) => ({
        id: item.id,
        kind: item.kind,
        fields: canonicalFields(item.kind, item.fields as Fields),
        provenance: item.provenance,
      })),
    })),
  };
}
