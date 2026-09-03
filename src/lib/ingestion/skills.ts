import { SKILL_ALIASES } from "@/lib/constants";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Single combined regex matching all skill aliases in one pass
const SKILL_REGEX = new RegExp(
  `\\b(${Object.keys(SKILL_ALIASES).sort((a, b) => b.length - a.length).map(escapeRegex).join("|")})\\b`,
  "gi"
);

const ALIAS_MAP = SKILL_ALIASES;

export function extractSkills(title: string, description: string): string[] {
  const combined = `${title} ${description}`;
  const found = new Set<string>();
  let match: RegExpExecArray | null;

  SKILL_REGEX.lastIndex = 0;
  while ((match = SKILL_REGEX.exec(combined)) !== null) {
    const key = match[1].toLowerCase();
    const normalized = ALIAS_MAP[key];
    if (normalized) found.add(normalized);
  }

  return Array.from(found).sort();
}
