/**
 * Tests for logger.ts — structured JSON logger.
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { createLogger } from "./logger.js";
import type { LogEntry } from "./types.js";

describe("createLogger", () => {
  let writeSpy: ReturnType<typeof spyOn>;

  beforeEach(() => {
    writeSpy = spyOn(process.stderr, "write").mockImplementation(() => true);
  });

  afterEach(() => {
    writeSpy.mockRestore();
  });

  function parseWrittenEntries(): LogEntry[] {
    return writeSpy.mock.calls.map((call: unknown[]) => {
      const raw = call[0] as string;
      return JSON.parse(raw.trim()) as LogEntry;
    });
  }

  test("writes structured JSON to stderr", () => {
    // Arrange
    const logger = createLogger("bootstrap", "test-run-id");

    // Act
    logger.info("test message");

    // Assert
    expect(writeSpy).toHaveBeenCalledTimes(1);
    const entries = parseWrittenEntries();
    expect(entries[0]!.component).toBe("bootstrap");
    expect(entries[0]!.runId).toBe("test-run-id");
    expect(entries[0]!.level).toBe("info");
    expect(entries[0]!.message).toBe("test message");
    expect(entries[0]!.iteration).toBe(1);
    expect(entries[0]!.timestamp).toBeDefined();
  });

  test("increments iteration counter", () => {
    // Arrange
    const logger = createLogger("bootstrap", "run-1");

    // Act
    logger.info("first");
    logger.info("second");
    logger.info("third");

    // Assert
    const entries = parseWrittenEntries();
    expect(entries[0]!.iteration).toBe(1);
    expect(entries[1]!.iteration).toBe(2);
    expect(entries[2]!.iteration).toBe(3);
  });

  test("includes metadata when provided", () => {
    // Arrange
    const logger = createLogger("bootstrap", "run-1");

    // Act
    logger.info("with metadata", { key: "value" });

    // Assert
    const entries = parseWrittenEntries();
    expect(entries[0]!.metadata).toEqual({ key: "value" });
  });

  test("omits metadata when not provided", () => {
    // Arrange
    const logger = createLogger("bootstrap", "run-1");

    // Act
    logger.info("no metadata");

    // Assert
    const entries = parseWrittenEntries();
    expect(entries[0]!.metadata).toBeUndefined();
  });

  test("respects LOG_LEVEL=debug", () => {
    // Arrange
    const original = process.env["LOG_LEVEL"];
    process.env["LOG_LEVEL"] = "debug";
    const logger = createLogger("bootstrap", "run-1");

    // Act
    logger.debug("debug msg");
    logger.info("info msg");

    // Assert
    expect(writeSpy).toHaveBeenCalledTimes(2);

    // Cleanup
    if (original !== undefined) {
      process.env["LOG_LEVEL"] = original;
    } else {
      delete process.env["LOG_LEVEL"];
    }
  });

  test("filters debug when LOG_LEVEL=info (default)", () => {
    // Arrange
    const original = process.env["LOG_LEVEL"];
    delete process.env["LOG_LEVEL"];
    const logger = createLogger("bootstrap", "run-1");

    // Act
    logger.debug("debug msg");
    logger.info("info msg");

    // Assert
    expect(writeSpy).toHaveBeenCalledTimes(1);
    const entries = parseWrittenEntries();
    expect(entries[0]!.level).toBe("info");

    // Cleanup
    if (original !== undefined) {
      process.env["LOG_LEVEL"] = original;
    }
  });

  test("filters all below error when LOG_LEVEL=error", () => {
    // Arrange
    const original = process.env["LOG_LEVEL"];
    process.env["LOG_LEVEL"] = "error";
    const logger = createLogger("bootstrap", "run-1");

    // Act
    logger.debug("debug");
    logger.info("info");
    logger.warn("warn");
    logger.error("error");

    // Assert
    expect(writeSpy).toHaveBeenCalledTimes(1);
    const entries = parseWrittenEntries();
    expect(entries[0]!.level).toBe("error");

    // Cleanup
    if (original !== undefined) {
      process.env["LOG_LEVEL"] = original;
    } else {
      delete process.env["LOG_LEVEL"];
    }
  });

  test("all four levels produce output", () => {
    // Arrange
    const original = process.env["LOG_LEVEL"];
    process.env["LOG_LEVEL"] = "debug";
    const logger = createLogger("bootstrap", "run-1");

    // Act
    logger.debug("d");
    logger.info("i");
    logger.warn("w");
    logger.error("e");

    // Assert
    expect(writeSpy).toHaveBeenCalledTimes(4);
    const levels = parseWrittenEntries().map((e) => e.level);
    expect(levels).toEqual(["debug", "info", "warn", "error"]);

    // Cleanup
    if (original !== undefined) {
      process.env["LOG_LEVEL"] = original;
    } else {
      delete process.env["LOG_LEVEL"];
    }
  });
});
