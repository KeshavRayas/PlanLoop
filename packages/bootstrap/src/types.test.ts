/**
 * Tests for types.ts — BootstrapError and type exports.
 */

import { describe, test, expect } from "bun:test";
import { BootstrapError, DEFAULT_BRIDGE_HOST, DEFAULT_BRIDGE_PORT, EXTENSION_DIST_PATH, BRIDGE_STATE_PATH } from "./types.js";

describe("BootstrapError", () => {
  test("has code property", () => {
    // Arrange
    const code = "TEST_ERROR";
    const message = "test message";

    // Act
    const err = new BootstrapError(code, message);

    // Assert
    expect(err.code).toBe(code);
    expect(err.message).toBe(message);
    expect(err.name).toBe("BootstrapError");
    expect(err).toBeInstanceOf(Error);
  });

  test("is throwable and catchable", () => {
    // Arrange & Act & Assert
    expect(() => {
      throw new BootstrapError("THROWN", "thrown");
    }).toThrow(BootstrapError);
  });
});

describe("constants", () => {
  test("DEFAULT_BRIDGE_HOST is 127.0.0.1", () => {
    expect(DEFAULT_BRIDGE_HOST).toBe("127.0.0.1");
  });

  test("DEFAULT_BRIDGE_PORT is 9477", () => {
    expect(DEFAULT_BRIDGE_PORT).toBe(9477);
  });

  test("EXTENSION_DIST_PATH is apps/browser-extension/dist", () => {
    expect(EXTENSION_DIST_PATH).toBe("apps/browser-extension/dist");
  });

  test("BRIDGE_STATE_PATH is .opencode/bridge-state.json", () => {
    expect(BRIDGE_STATE_PATH).toBe(".opencode/bridge-state.json");
  });
});
