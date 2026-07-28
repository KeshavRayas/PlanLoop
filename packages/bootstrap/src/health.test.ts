/**
 * Tests for health.ts — bridge health checking.
 */

import { describe, test, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { createServer } from "node:net";
import type { Server } from "node:net";
import { checkBridgeHealth, checkBridgeHealthWithRetry, runHealthChecks } from "./health.js";
import { createLogger } from "./logger.js";
import { randomUUID } from "node:crypto";

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

function startServer(port: number): Promise<Server> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.listen(port, "127.0.0.1", () => resolve(server));
    server.on("error", reject);
  });
}

describe("checkBridgeHealth", () => {
  let server: Server;

  afterEach(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test("returns ok when bridge is reachable", async () => {
    // Arrange
    server = await startServer(19477);
    const logger = makeLogger();

    // Act
    const result = await checkBridgeHealth("127.0.0.1", 19477, logger);

    // Assert
    expect(result.name).toBe("Bridge");
    expect(result.status).toBe("ok");
    expect(result.detail).toContain("19477");
  });

  test("returns error when bridge is unreachable", async () => {
    // Arrange
    const logger = makeLogger();

    // Act
    const result = await checkBridgeHealth("127.0.0.1", 19478, logger);

    // Assert
    expect(result.name).toBe("Bridge");
    expect(result.status).toBe("error");
    expect(result.detail).toContain("unreachable");
  });
});

describe("checkBridgeHealthWithRetry", () => {
  let server: Server;

  afterEach(async () => {
    if (server?.listening) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  });

  test("returns ok when bridge becomes reachable", async () => {
    // Arrange
    server = await startServer(19479);
    const logger = makeLogger();

    // Act
    const result = await checkBridgeHealthWithRetry("127.0.0.1", 19479, logger);

    // Assert
    expect(result.status).toBe("ok");
  });

  test("returns error after all retries when unreachable", async () => {
    // Arrange
    const logger = makeLogger();

    // Act — use a port that nothing listens on
    const result = await checkBridgeHealthWithRetry("127.0.0.1", 19480, logger);

    // Assert
    expect(result.status).toBe("error");
    expect(result.detail).toContain("3 attempts");
  });
});

describe("runHealthChecks", () => {
  test("returns array with bridge health", async () => {
    // Arrange
    const logger = makeLogger();

    // Act
    const results = await runHealthChecks("127.0.0.1", 19481, logger);

    // Assert
    expect(results).toHaveLength(1);
    expect(results[0]!.name).toBe("Bridge");
  });
});
