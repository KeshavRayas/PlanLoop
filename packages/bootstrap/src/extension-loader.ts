/**
 * Extension load status detection for @planloop/bootstrap.
 *
 * Phase -1 detects only whether the extension is *built* (dist/ exists).
 * Runtime detection (whether the extension is actually loaded in Chrome)
 * requires the bridge and is deferred to later phases.
 *
 * @module extension-loader
 */

import { existsSync } from "node:fs";
import { join } from "node:path";
import type { ComponentHealth } from "./types.js";
import { EXTENSION_DIST_PATH } from "./types.js";
import type { Logger } from "./logger.js";

/** Instructions shown when the extension is not loaded. */
export const LOAD_UNPACKED_INSTRUCTIONS =
  `Load unpacked from ${EXTENSION_DIST_PATH}`;

/**
 * Check whether the browser extension is built.
 *
 * @param workspaceRoot - Absolute path to the workspace root.
 * @param logger - Logger instance.
 * @returns true if the extension dist directory exists.
 */
export function isExtensionBuilt(workspaceRoot: string, logger: Logger): boolean {
  const distPath = join(workspaceRoot, EXTENSION_DIST_PATH);
  const built = existsSync(distPath);
  logger.debug("Extension build check", { distPath, built });
  return built;
}

/**
 * Get extension component health for the doctor report.
 *
 * Phase -1 behavior:
 * - If built: report "Extension: not loaded. Load unpacked from apps/browser-extension/dist."
 * - If not built: report error with build instructions.
 *
 * @param workspaceRoot - Absolute path to the workspace root.
 * @param logger - Logger instance.
 * @returns ComponentHealth for the extension.
 */
export function getExtensionHealth(workspaceRoot: string, logger: Logger): ComponentHealth {
  const built = isExtensionBuilt(workspaceRoot, logger);

  if (!built) {
    logger.warn("Extension not built", { workspaceRoot });
    return {
      name: "Extension",
      status: "error",
      detail: `not built. Run "bun run setup" to build.`,
    };
  }

  // Phase -1: runtime detection unavailable (no bridge yet).
  // Per user decision A2: report "not loaded" with instructions.
  logger.info("Extension built, runtime detection unavailable", { workspaceRoot });
  return {
    name: "Extension",
    status: "warn",
    detail: `not loaded. ${LOAD_UNPACKED_INSTRUCTIONS}.`,
  };
}
