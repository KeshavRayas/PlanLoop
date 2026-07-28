/**
 * Diagnostics report generation for @planloop/bootstrap.
 *
 * Composes results from detect, health, and extension-loader into a
 * structured diagnostics report used by the doctor command.
 *
 * @module diagnostics
 */

import type { ComponentHealth, DiagnosticsReport, DetectResult } from "./types.js";
import { BootstrapError, DEFAULT_BRIDGE_HOST, DEFAULT_BRIDGE_PORT } from "./types.js";
import { detect } from "./detect.js";
import { runHealthChecks } from "./health.js";
import { getExtensionHealth } from "./extension-loader.js";
import type { Logger } from "./logger.js";

/**
 * Format a single component health line for console output.
 *
 * @param health - ComponentHealth to format.
 * @returns Formatted string like "Bun: ✓ (1.2.3)".
 */
export function formatComponentLine(health: ComponentHealth): string {
  const icon = health.status === "ok" ? "✓" : health.status === "warn" ? "⚠" : "✗";
  return `${health.name}: ${icon} ${health.detail}`;
}

/**
 * Run full diagnostics and produce a report.
 *
 * Detects environment, checks bridge health, checks extension status,
 * and composes everything into a DiagnosticsReport.
 *
 * @param workspaceRoot - Absolute path to the workspace root.
 * @param logger - Logger instance.
 * @param bridgeHost - Bridge host to check.
 * @param bridgePort - Bridge port to check.
 * @returns DiagnosticsReport with all component statuses.
 */
export async function runDiagnostics(
  workspaceRoot: string,
  logger: Logger,
  bridgeHost: string = DEFAULT_BRIDGE_HOST,
  bridgePort: number = DEFAULT_BRIDGE_PORT,
): Promise<DiagnosticsReport> {
  logger.info("Running diagnostics", { workspaceRoot, bridgeHost, bridgePort });

  const components: ComponentHealth[] = [];

  // --- Environment detection ---
  let detectResult: DetectResult | null = null;
  try {
    detectResult = await detect(workspaceRoot, logger, bridgeHost, bridgePort);
  } catch (err: unknown) {
    if (err instanceof BootstrapError) {
      // Report the missing component as an error but continue checking others
      if (err.code === "BUN_MISSING") {
        components.push({ name: "Bun", status: "error", detail: "not found" });
      } else if (err.code === "NODE_MISSING") {
        components.push({ name: "Node", status: "error", detail: "not found" });
      } else {
        components.push({ name: "Environment", status: "error", detail: err.message });
      }
    } else {
      throw err;
    }
  }

  if (detectResult !== null) {
    components.push({
      name: "Bun",
      status: detectResult.bun.available ? "ok" : "error",
      detail: detectResult.bun.available ? `(${detectResult.bun.version ?? "unknown"})` : "not found",
    });
    components.push({
      name: "Node",
      status: detectResult.node.available ? "ok" : "error",
      detail: detectResult.node.available ? `(${detectResult.node.version ?? "unknown"})` : "not found",
    });
    components.push({
      name: "Workspace",
      status: detectResult.workspace.valid ? "ok" : "error",
      detail: detectResult.workspace.valid ? workspaceRoot : (detectResult.workspace.error ?? "invalid"),
    });
  }

  // --- Bridge health ---
  const healthResults = await runHealthChecks(bridgeHost, bridgePort, logger);
  components.push(...healthResults);

  // --- Extension status ---
  const extensionHealth = getExtensionHealth(workspaceRoot, logger);
  components.push(extensionHealth);

  const allGreen = components.every((c) => c.status === "ok");

  const report: DiagnosticsReport = { components, allGreen };
  logger.info("Diagnostics complete", { allGreen, componentCount: components.length });

  return report;
}
