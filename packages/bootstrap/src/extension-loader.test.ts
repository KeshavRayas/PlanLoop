/**
 * Tests for extension-loader.ts — extension build status detection.
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { isExtensionBuilt, getExtensionHealth, LOAD_UNPACKED_INSTRUCTIONS } from "./extension-loader.js";
import { createLogger } from "./logger.js";

let writeSpy: ReturnType<typeof spyOn>;

beforeEach(() => {
  writeSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  writeSpy.mockRestore();
});

function makeLogger(): ReturnType<typeof createLogger> {
  return createLogger("test", randomUUID());
}

describe("isExtensionBuilt", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `planloop-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns false when dist does not exist", () => {
    // Arrange
    const logger = makeLogger();

    // Act
    const result = isExtensionBuilt(tmpDir, logger);

    // Assert
    expect(result).toBe(false);
  });

  test("returns true when dist exists", () => {
    // Arrange
    mkdirSync(join(tmpDir, "apps", "browser-extension", "dist"), { recursive: true });
    const logger = makeLogger();

    // Act
    const result = isExtensionBuilt(tmpDir, logger);

    // Assert
    expect(result).toBe(true);
  });
});

describe("getExtensionHealth", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `planloop-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns error when extension not built", () => {
    // Arrange
    const logger = makeLogger();

    // Act
    const result = getExtensionHealth(tmpDir, logger);

    // Assert
    expect(result.name).toBe("Extension");
    expect(result.status).toBe("error");
    expect(result.detail).toContain("not built");
    expect(result.detail).toContain("bun run setup");
  });

  test("returns warn with load instructions when built", () => {
    // Arrange
    mkdirSync(join(tmpDir, "apps", "browser-extension", "dist"), { recursive: true });
    const logger = makeLogger();

    // Act
    const result = getExtensionHealth(tmpDir, logger);

    // Assert
    expect(result.name).toBe("Extension");
    expect(result.status).toBe("warn");
    expect(result.detail).toContain("not loaded");
    expect(result.detail).toContain(LOAD_UNPACKED_INSTRUCTIONS);
  });
});

describe("LOAD_UNPACKED_INSTRUCTIONS", () => {
  test("contains the dist path", () => {
    expect(LOAD_UNPACKED_INSTRUCTIONS).toContain("apps/browser-extension/dist");
  });
});
