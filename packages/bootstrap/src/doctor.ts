/**
 * Doctor command for @planloop/bootstrap.
 *
 * Runs diagnostics and reports component health.
 * Performance budget: doctor < 5s.
 *
 * @module doctor
 */

import { randomUUID } from "node:crypto";
import { DEFAULT_BRIDGE_HOST, DEFAULT_BRIDGE_PORT } from "./types.js";
import { createLogger } from "./logger.js";
import { runDiagnostics, formatComponentLine } from "./diagnostics.js";
import { resolveWorkspaceRoot } from "./setup.js";



/**
 * Run the doctor command.
 *
 * Executes diagnostics and prints the component health report.
 * Exits with code 1 if any component is not ok.
 *
 * @param workspaceRoot - Absolute path to the workspace root.
 */
export async function runDoctor(workspaceRoot: string): Promise<void> {
  const runId = randomUUID();
  const logger = createLogger("bootstrap", runId);

  logger.info("Doctor started", { workspaceRoot });

  const report = await runDiagnostics(
    workspaceRoot,
    logger,
    DEFAULT_BRIDGE_HOST,
    DEFAULT_BRIDGE_PORT,
  );

  for (const component of report.components) {
    process.stderr.write(formatComponentLine(component) + "\n");
  }

  const failed = report.components.filter((c) => c.status === "error");
  const warnings = report.components.filter((c) => c.status === "warn");

  if (failed.length === 0) {
    process.stderr.write("\nAll components green.\n");
    logger.info("Doctor complete — all green");
  } else {
    process.stderr.write(`\n${String(failed.length)} component(s) need attention.\n`);
    logger.warn("Doctor complete — issues found", {
      failedCount: failed.length,
      failedComponents: failed.map((c) => c.name),
    });
    process.exit(1);
  }

  if (warnings.length > 0) {
    process.stderr.write(`${String(warnings.length)} component(s) with warnings.\n`);
  }
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isMainModule = process.argv[1]?.endsWith("doctor.ts") ?? false;

if (isMainModule) {
  const workspaceRoot = resolveWorkspaceRoot(process.cwd());
  await runDoctor(workspaceRoot);
}
