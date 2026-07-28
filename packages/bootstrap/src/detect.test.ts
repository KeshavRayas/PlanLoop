/**
 * Tests for detect.ts — environment detection.
 */

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { detect, detectBun, detectNode, detectWorkspace, detectExtensionBuilt } from "./detect.js";
import { BootstrapError } from "./types.js";
import { createLogger } from "./logger.js";
import { spyOn } from "bun:test";

// Suppress logger output during tests
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

describe("detectBun", () => {
  test("detects bun availability", async () => {
    // Arrange
    const logger = makeLogger();

    // Act
    const result = await detectBun(logger);

    // Assert — bun should be available in this environment
    expect(result.available).toBe(true);
    expect(result.version).toBeDefined();
  });
});

describe("detectNode", () => {
  test("detects node availability", async () => {
    // Arrange
    const logger = makeLogger();

    // Act
    const result = await detectNode(logger);

    // Assert — node should be available
    expect(result.available).toBe(true);
    expect(result.version).toBeDefined();
  });
});

describe("detectWorkspace", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `planloop-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns valid when package.json exists", () => {
    // Arrange
    writeFileSync(join(tmpDir, "package.json"), "{}");
    const logger = makeLogger();

    // Act
    const result = detectWorkspace(tmpDir, logger);

    // Assert
    expect(result.valid).toBe(true);
    expect(result.root).toBe(tmpDir);
    expect(result.error).toBeUndefined();
  });

  test("returns invalid when package.json missing", () => {
    // Arrange
    const logger = makeLogger();

    // Act
    const result = detectWorkspace(tmpDir, logger);

    // Assert
    expect(result.valid).toBe(false);
    expect(result.error).toBeDefined();
  });
});

describe("detectExtensionBuilt", () => {
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
    const result = detectExtensionBuilt(tmpDir, logger);

    // Assert
    expect(result).toBe(false);
  });

  test("returns true when dist exists", () => {
    // Arrange
    mkdirSync(join(tmpDir, "apps", "browser-extension", "dist"), { recursive: true });
    const logger = makeLogger();

    // Act
    const result = detectExtensionBuilt(tmpDir, logger);

    // Assert
    expect(result).toBe(true);
  });
});

describe("detect", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `planloop-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "package.json"), "{}");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns full DetectResult on valid environment", async () => {
    // Arrange
    const logger = makeLogger();

    // Act
    const result = await detect(tmpDir, logger);

    // Assert
    expect(result.bun.available).toBe(true);
    expect(result.node.available).toBe(true);
    expect(result.workspace.valid).toBe(true);
    expect(result.extensionBuilt).toBe(false);
    expect(result.bridgeRunning).toBe(false);
  });

  test("throws BootstrapError with WORKSPACE_INVALID for bad root", async () => {
    // Arrange
    const badDir = join(tmpdir(), `planloop-test-${randomUUID()}`);
    mkdirSync(badDir, { recursive: true });
    const logger = makeLogger();

    // Act & Assert
    try {
      await detect(badDir, logger);
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(BootstrapError);
      expect((err as BootstrapError).code).toBe("WORKSPACE_INVALID");
    } finally {
      rmSync(badDir, { recursive: true, force: true });
    }
  });
});
