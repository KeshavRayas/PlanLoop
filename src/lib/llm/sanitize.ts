import type { LlmProvider } from "@/lib/llm/types";

// ─── Model-output sanitization (generation boundary) ─────────────────────────
// Small models emit mojibake (U+FFFD), smart punctuation, and invisible
// characters. Normalize once here — before Zod parsing — so every downstream
// consumer (validators, PDF renderer, ATS checks) sees clean text. Never in
// the renderer: by then the damage is persisted.

const REPLACEMENTS: [RegExp, string][] = [
  [/\uFFFD/g, ""],
  [/[\u200B-\u200D\uFEFF]/g, ""],
  [/[—–]/g, "-"],
  [/[‘’‚‛]/g, "'"],
  [/[“”„‟]/g, '"'],
  [/\u00A0/g, " "],
  [/[ \t]+/g, " "],
];

export function sanitizeModelText(text: string): string {
  let out = text;
  for (const [re, replacement] of REPLACEMENTS) {
    out = out.replace(re, replacement);
  }
  return out.trim();
}

export function sanitizeModelJson(value: unknown): unknown {
  if (typeof value === "string") return sanitizeModelText(value);
  if (Array.isArray(value)) return value.map(sanitizeModelJson);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value)) {
      out[key] = sanitizeModelJson(entry);
    }
    return out;
  }
  return value;
}

/** Drop-in replacement for provider.generateJson with sanitized output. */
export async function generateJsonSanitized(
  provider: LlmProvider,
  systemPrompt: string,
  userPrompt: string,
): Promise<unknown> {
  return sanitizeModelJson(
    await provider.generateJson(systemPrompt, userPrompt),
  );
}
