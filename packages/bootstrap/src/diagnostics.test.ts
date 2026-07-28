/**
 * Tests for diagnostics.ts — diagnostics report generation.
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { runDiagnostics, formatComponentLine } from "./diagnostics.js";
import { createLogger } from "./logger.js";
import type { ComponentHealth } from "./types.js";

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

describe("formatComponentLine", () => {
  test("formats ok component with checkmark", () => {
    // Arrange
    const health: ComponentHealth = { name: "Bun", status: "ok", detail: "(1.2.3)" };

    // Act
    const line = formatComponentLine(health);

    // Assert
    expect(line).toBe("Bun: ✓ (1.2.3)");
  });

  test("formats error component with cross", () => {
    // Arrange
    const health: ComponentHealth = { name: "Bridge", status: "error", detail: "unreachable" };

    // Act
    const line = formatComponentLine(health);

    // Assert
    expect(line).toBe("Bridge: ✗ unreachable");
  });

  test("formats warn component with warning", () => {
    // Arrange
    const health: ComponentHealth = { name: "Extension", status: "warn", detail: "not loaded" };

    // Act
    const line = formatComponentLine(health);

    // Assert
    expect(line).toBe("Extension: ⚠ not loaded");
  });
});

describe("runDiagnostics", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = join(tmpdir(), `planloop-test-${randomUUID()}`);
    mkdirSync(tmpDir, { recursive: true });
    writeFileSync(join(tmpDir, "package.json"), "{}");
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  test("returns report with all components", async () => {
    // Arrange
    const logger = makeLogger();

    // Act — use a port where nothing listens for bridge
    const report = await runDiagnostics(tmpDir, logger, "127.0.0.1", 19482);

    // Assert
    expect(report.components.length).toBeGreaterThanOrEqual(4);

    const names = report.components.map((c) => c.name);
    expect(names).toContain("Bun");
    expect(names).toContain("Node");
    expect(names).toContain("Workspace");
    expect(names).toContain("Bridge");
    expect(names).toContain("Extension");

    // Bun and Node should be ok (available in this env)
    const bun = report.components.find((c) => c.name === "Bun");
    expect(bun!.status).toBe("ok");

    const node = report.components.find((c) => c.name === "Node");
    expect(node!.status).toBe("ok");

    // Workspace should be ok (we created package.json)
    const ws = report.components.find((c) => c.name === "Workspace");
    expect(ws!.status).toBe("ok");

    // Bridge should be error (nothing listening)
    const bridge = report.components.find((c) => c.name === "Bridge");
    expect(bridge!.status).toBe("error");

    // Extension should be error (not built)
    const ext = report.components.find((c) => c.name === "Extension");
    expect(ext!.status).toBe("error");

    // allGreen should be false
    expect(report.allGreen).toBe(false);
  });

  test("allGreen is true when all components ok", async () => {
    // Arrange — create a full environment
    mkdirSync(join(tmpDir, "apps", "browser-extension", "dist"), { recursive: true });
    const logger = makeLogger();

    // Start a real server for the bridge check
    const { createServer } = await import("node:net");
    const server = createServer();
    await new Promise<void>((resolve) => server.listen(19483, "127.0.0.1", resolve));

    // Act
    const report = await runDiagnostics(tmpDir, logger, "127.0.0.1", 19483);

    // Assert — Extension will be "warn" (not loaded), so allGreen is false
    // But all non-extension components should be ok
    const bun = report.components.find((c) => c.name === "Bun");
    expect(bun!.status).toBe("ok");

    const bridge = report.components.find((c) => c.name === "Bridge");
    expect(bridge!.status).toBe("ok");

    const ext = report.components.find((c) => c.name === "Extension");
    expect(ext!.status).toBe("warn");

    expect(report.allGreen).toBe(false); // warn ≠ ok

    // Cleanup
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });
});
