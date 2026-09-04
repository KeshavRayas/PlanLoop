import { describe, it, expect } from "vitest";
import { sanitizeModelText, sanitizeModelJson } from "@/lib/llm/sanitize";

const FFFD = "�";
const ZWSP = "​";
const NBSP = " ";
const EM_DASH = "—";
const EN_DASH = "–";
const LSQUO = "‘";
const RSQUO = "’";
const LDQUO = "“";
const RDQUO = "”";

describe("sanitizeModelText", () => {
  it("strips replacement characters and zero-width text", () => {
    expect(sanitizeModelText(`a${FFFD}b${ZWSP}c`)).toBe("abc");
  });

  it("normalizes dashes, quotes, and nbsp to ASCII", () => {
    expect(
      sanitizeModelText(`${LSQUO}hello${RSQUO} ${EM_DASH} ${LDQUO}world${RDQUO}${NBSP}x`)
    ).toBe(`'hello' - "world" x`);
    expect(sanitizeModelText(`a${EN_DASH}b`)).toBe("a-b");
  });

  it("collapses repeated whitespace", () => {
    expect(sanitizeModelText("a  b\tc")).toBe("a b c");
  });

  it("leaves clean text untouched", () => {
    expect(sanitizeModelText("Built APIs with Go.")).toBe("Built APIs with Go.");
  });
});

describe("sanitizeModelJson", () => {
  it("deep-maps objects and arrays, passes through non-strings", () => {
    expect(
      sanitizeModelJson({ a: `x${EM_DASH}y`, b: [`p${FFFD}q`, 1, null, true], c: { d: `${NBSP}z` } })
    ).toEqual({ a: "x-y", b: ["pq", 1, null, true], c: { d: "z" } });
  });
});
