/**
 * Environment detection for @planloop/bootstrap.
 *
 * Detects Bun, Node, workspace validity, and existing component state.
 * All detection is performed via spawned processes — never code imports.
 *
 * @module detect
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { DetectResult, ToolInfo, WorkspaceInfo } from "./types.js";
import { BootstrapError, EXTENSION_DIST_PATH, DEFAULT_BRIDGE_PORT, DEFAULT_BRIDGE_HOST } from "./types.js";
import type { Logger } from "./logger.js";

const execFileAsync = promisify(execFile);

const TOOL_TIMEOUT_MS = 10_000;

/**
 * Detect whether a CLI tool is available and get its version.
 *
 * @param command - The binary to probe (e.g. "bun", "node").
 * @param args - Arguments to pass (e.g. ["--version"]).
 * @param logger - Logger instance.
 * @returns ToolInfo with availability and version or error.
 */
export async function detectTool(
  command: string,
  args: string[],
  logger: Logger,
): Promise<ToolInfo> {
  logger.debug("Detecting tool", { command, args });

  try {
    const { stdout } = await execFileAsync(command, args, {
      timeout: TOOL_TIMEOUT_MS,
      signal: AbortSignal.timeout(TOOL_TIMEOUT_MS),
    });
    const version = stdout.trim();
    logger.debug("Tool detected", { command, version });
    return { available: true, version };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("Tool not available", { command, error: message });
    return { available: false, error: message };
  }
}

/**
 * Detect whether Bun is installed.
 *
 * @param logger - Logger instance.
 * @returns ToolInfo for Bun.
 */
export async function detectBun(logger: Logger): Promise<ToolInfo> {
  return detectTool("bun", ["--version"], logger);
}

/**
 * Detect whether Node.js is installed.
 *
 * @param logger - Logger instance.
 * @returns ToolInfo for Node.
 */
export async function detectNode(logger: Logger): Promise<ToolInfo> {
  return detectTool("node", ["--version"], logger);
}

/**
 * Validate the workspace root directory.
 *
 * Checks that the root contains a package.json — the minimum requirement
 * for a valid Bun/npm workspace.
 *
 * @param root - Absolute path to the workspace root.
 * @param logger - Logger instance.
 * @returns WorkspaceInfo.
 */
export function detectWorkspace(root: string, logger: Logger): WorkspaceInfo {
  logger.debug("Detecting workspace", { root });

  const pkgPath = join(root, "package.json");
  if (!existsSync(pkgPath)) {
    const error = `No package.json found at ${pkgPath}`;
    logger.warn("Workspace invalid", { root, error });
    return { root, valid: false, error };
  }

  logger.debug("Workspace valid", { root });
  return { root, valid: true };
}

/**
 * Check whether the browser extension has been built.
 *
 * @param workspaceRoot - Absolute path to the workspace root.
 * @param logger - Logger instance.
 * @returns true if apps/browser-extension/dist exists.
 */
export function detectExtensionBuilt(workspaceRoot: string, logger: Logger): boolean {
  const distPath = join(workspaceRoot, EXTENSION_DIST_PATH);
  const built = existsSync(distPath);
  logger.debug("Extension build status", { distPath, built });
  return built;
}

/**
 * Check whether the bridge process appears to be running.
 *
 * Attempts a TCP connection to the bridge host:port. If the bridge
 * is listening, the port will accept connections.
 *
 * @param host - Bridge host (default 127.0.0.1).
 * @param port - Bridge port (default 9477).
 * @param logger - Logger instance.
 * @returns true if bridge port is reachable.
 */
export async function detectBridgeRunning(
  host: string,
  port: number,
  logger: Logger,
): Promise<boolean> {
  logger.debug("Checking bridge", { host, port });

  try {
    const { createConnection } = await import("node:net");
    return await new Promise<boolean>((resolve) => {
      const socket = createConnection({ host, port, timeout: 2000 });
      socket.on("connect", () => {
        socket.destroy();
        logger.debug("Bridge reachable", { host, port });
        resolve(true);
      });
      socket.on("error", () => {
        socket.destroy();
        logger.debug("Bridge unreachable", { host, port });
        resolve(false);
      });
      socket.on("timeout", () => {
        socket.destroy();
        logger.debug("Bridge connection timeout", { host, port });
        resolve(false);
      });
    });
  } catch {
    logger.debug("Bridge check failed", { host, port });
    return false;
  }
}

/**
 * Run full environment detection.
 *
 * Detects Bun, Node, workspace validity, extension build status,
 * and bridge running status. Throws BootstrapError if required
 * prerequisites are missing.
 *
 * @param workspaceRoot - Absolute path to the workspace root.
 * @param logger - Logger instance.
 * @param bridgeHost - Bridge host to check.
 * @param bridgePort - Bridge port to check.
 * @returns DetectResult with all detection outcomes.
 * @throws {BootstrapError} If Bun or Node is missing.
 */
export async function detect(
  workspaceRoot: string,
  logger: Logger,
  bridgeHost: string = DEFAULT_BRIDGE_HOST,
  bridgePort: number = DEFAULT_BRIDGE_PORT,
): Promise<DetectResult> {
  logger.info("Starting environment detection", { workspaceRoot });

  const [bun, node] = await Promise.all([
    detectBun(logger),
    detectNode(logger),
  ]);

  if (!bun.available) {
    throw new BootstrapError(
      "BUN_MISSING",
      `Bun is not installed or not in PATH. Install Bun from https://bun.sh and retry.\nDetails: ${bun.error ?? "unknown"}`,
    );
  }

  if (!node.available) {
    throw new BootstrapError(
      "NODE_MISSING",
      `Node.js is not installed or not in PATH. Install Node.js and retry.\nDetails: ${node.error ?? "unknown"}`,
    );
  }

  const workspace = detectWorkspace(workspaceRoot, logger);
  if (!workspace.valid) {
    throw new BootstrapError(
      "WORKSPACE_INVALID",
      `Invalid workspace at ${workspaceRoot}.\nDetails: ${workspace.error ?? "unknown"}`,
    );
  }

  const extensionBuilt = detectExtensionBuilt(workspaceRoot, logger);
  const bridgeRunning = await detectBridgeRunning(bridgeHost, bridgePort, logger);

  const result: DetectResult = { bun, node, workspace, extensionBuilt, bridgeRunning };
  logger.info("Environment detection complete", {
    bun: bun.version,
    node: node.version,
    extensionBuilt,
    bridgeRunning,
  });

  return result;
}
