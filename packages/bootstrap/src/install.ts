/**
 * Workspace installation and extension build for @planloop/bootstrap.
 *
 * Runs `bun install` and builds the browser extension via spawned processes.
 * Never imports from @planloop/browser-extension.
 *
 * @module install
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { BootstrapError, EXTENSION_DIST_PATH } from "./types.js";
import type { Logger } from "./logger.js";

const execFileAsync = promisify(execFile);

const INSTALL_TIMEOUT_MS = 120_000;
const BUILD_TIMEOUT_MS = 60_000;

/**
 * Run `bun install` in the workspace root.
 *
 * @param workspaceRoot - Absolute path to the workspace root.
 * @param logger - Logger instance.
 * @throws {BootstrapError} If bun install fails.
 */
export async function runInstall(workspaceRoot: string, logger: Logger): Promise<void> {
  logger.info("Running bun install", { workspaceRoot });

  try {
    await execFileAsync("bun", ["install"], {
      cwd: workspaceRoot,
      timeout: INSTALL_TIMEOUT_MS,
      signal: AbortSignal.timeout(INSTALL_TIMEOUT_MS),
    });
    logger.info("bun install complete");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("bun install failed", { error: message });
    throw new BootstrapError(
      "INSTALL_FAILED",
      `bun install failed in ${workspaceRoot}.\nDetails: ${message}`,
    );
  }
}

/**
 * Build the browser extension.
 *
 * Runs `bun run --filter @planloop/browser-extension build` from the
 * workspace root. This is a spawned process — no code import.
 *
 * @param workspaceRoot - Absolute path to the workspace root.
 * @param logger - Logger instance.
 * @throws {BootstrapError} If the build fails.
 */
export async function buildExtension(workspaceRoot: string, logger: Logger): Promise<void> {
  const distPath = join(workspaceRoot, EXTENSION_DIST_PATH);

  if (existsSync(distPath)) {
    logger.info("Extension already built, skipping", { distPath });
    return;
  }

  logger.info("Building browser extension", { workspaceRoot });

  try {
    await execFileAsync(
      "bun",
      ["run", "--filter", "@planloop/browser-extension", "build"],
      {
        cwd: workspaceRoot,
        timeout: BUILD_TIMEOUT_MS,
        signal: AbortSignal.timeout(BUILD_TIMEOUT_MS),
      },
    );
    logger.info("Extension build complete", { distPath });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Extension build failed", { error: message });
    throw new BootstrapError(
      "EXTENSION_BUILD_FAILED",
      `Failed to build browser extension.\nDetails: ${message}`,
    );
  }
}
