/**
 * Bridge health checking for @planloop/bootstrap.
 *
 * Checks bridge health via TCP connection with retry and exponential backoff.
 * Performance budget: bridge health < 2s, extension reconnect < 5s (3 attempts, backoff).
 *
 * @module health
 */

import type { ComponentHealth } from "./types.js";
import type { Logger } from "./logger.js";

const HEALTH_TIMEOUT_MS = 2_000;
const RECONNECT_TIMEOUT_MS = 5_000;
const MAX_RETRIES = 3;
const BASE_BACKOFF_MS = 500;

/**
 * Check whether a TCP port is reachable within a timeout.
 *
 * Timeout enforced via AbortSignal.timeout per coding standards.
 *
 * @param host - Target host.
 * @param port - Target port.
 * @param timeoutMs - Connection timeout in milliseconds.
 * @returns true if the port accepted a connection.
 */
async function isPortReachable(host: string, port: number, timeoutMs: number): Promise<boolean> {
  try {
    const { createConnection } = await import("node:net");
    return await new Promise<boolean>((resolve) => {
      const signal = AbortSignal.timeout(timeoutMs);
      const socket = createConnection({ host, port });
      const onAbort = (): void => {
        socket.destroy();
        resolve(false);
      };
      signal.addEventListener("abort", onAbort, { once: true });
      socket.on("connect", () => {
        signal.removeEventListener("abort", onAbort);
        socket.destroy();
        resolve(true);
      });
      socket.on("error", () => {
        signal.removeEventListener("abort", onAbort);
        socket.destroy();
        resolve(false);
      });
    });
  } catch {
    return false;
  }
}

/**
 * Sleep for the given number of milliseconds.
 *
 * Uses the promisified timer; backoff scheduling is not a timeout.
 *
 * @param ms - Milliseconds to sleep.
 */
async function sleep(ms: number): Promise<void> {
  const { setTimeout: delay } = await import("node:timers/promises");
  await delay(ms);
}

/**
 * Check bridge health with a single attempt.
 *
 * @param host - Bridge host.
 * @param port - Bridge port.
 * @param logger - Logger instance.
 * @returns ComponentHealth for the bridge.
 */
export async function checkBridgeHealth(
  host: string,
  port: number,
  logger: Logger,
): Promise<ComponentHealth> {
  logger.debug("Checking bridge health", { host, port });

  const reachable = await isPortReachable(host, port, HEALTH_TIMEOUT_MS);

  if (reachable) {
    logger.info("Bridge healthy", { host, port });
    return { name: "Bridge", status: "ok", detail: `ws://${host}:${String(port)}` };
  }

  logger.warn("Bridge unhealthy", { host, port });
  return { name: "Bridge", status: "error", detail: `ws://${host}:${String(port)} unreachable` };
}

/**
 * Check bridge health with retry and exponential backoff.
 *
 * Attempts up to MAX_RETRIES times with backoff between attempts.
 * Total time budget: RECONNECT_TIMEOUT_MS (5s).
 *
 * @param host - Bridge host.
 * @param port - Bridge port.
 * @param logger - Logger instance.
 * @returns ComponentHealth for the bridge after retries.
 */
export async function checkBridgeHealthWithRetry(
  host: string,
  port: number,
  logger: Logger,
): Promise<ComponentHealth> {
  logger.info("Checking bridge health with retry", { host, port, maxRetries: MAX_RETRIES });

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const remainingMs = RECONNECT_TIMEOUT_MS - (attempt - 1) * BASE_BACKOFF_MS;
    if (remainingMs <= 0) break;

    const reachable = await isPortReachable(host, port, Math.min(HEALTH_TIMEOUT_MS, remainingMs));

    if (reachable) {
      logger.info("Bridge healthy", { host, port, attempt });
      return { name: "Bridge", status: "ok", detail: `ws://${host}:${String(port)}` };
    }

    if (attempt < MAX_RETRIES) {
      const backoffMs = BASE_BACKOFF_MS * Math.pow(2, attempt - 1);
      logger.debug("Bridge retry backoff", { attempt, backoffMs });
      await sleep(backoffMs);
    }
  }

  logger.warn("Bridge unhealthy after retries", { host, port, maxRetries: MAX_RETRIES });
  return { name: "Bridge", status: "error", detail: `ws://${host}:${String(port)} unreachable after ${String(MAX_RETRIES)} attempts` };
}

/**
 * Run all health checks.
 *
 * Currently checks bridge health. Additional component checks
 * (protocol, field guide) are added in later phases.
 *
 * @param bridgeHost - Bridge host to check.
 * @param bridgePort - Bridge port to check.
 * @param logger - Logger instance.
 * @returns Array of ComponentHealth results.
 */
export async function runHealthChecks(
  bridgeHost: string,
  bridgePort: number,
  logger: Logger,
): Promise<ComponentHealth[]> {
  logger.info("Running health checks", { bridgeHost, bridgePort });

  const bridge = await checkBridgeHealthWithRetry(bridgeHost, bridgePort, logger);

  return [bridge];
}
