/**
 * Setup orchestrator for @planloop/bootstrap.
 *
 * Pipeline: Detect → Install → Build → Start → Verify.
 * Performance budget: setup < 60s.
 *
 * @module setup
 */

import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import type { SetupConfig, SetupResult, SetupStepResult } from "./types.js";
import {
  BootstrapError,
  DEFAULT_BRIDGE_HOST,
  DEFAULT_BRIDGE_PORT,
  BRIDGE_STATE_PATH,
} from "./types.js";
import { createLogger } from "./logger.js";
import type { Logger } from "./logger.js";
import { detect } from "./detect.js";
import { runInstall, buildExtension } from "./install.js";
import { checkBridgeHealthWithRetry } from "./health.js";
import { execFile } from "node:child_process";


const BRIDGE_START_TIMEOUT_MS = 10_000;

/**
 * Execute a single setup step, capturing timing and errors.
 *
 * @param name - Step name for reporting.
 * @param fn - Async function to execute.
 * @returns SetupStepResult with timing and outcome.
 */
async function runStep(
  name: string,
  fn: () => Promise<void>,
): Promise<SetupStepResult> {
  const start = performance.now();
  try {
    await fn();
    const durationMs = Math.round(performance.now() - start);
    return { name, success: true, detail: "ok", durationMs };
  } catch (err: unknown) {
    const durationMs = Math.round(performance.now() - start);
    const message = err instanceof Error ? err.message : String(err);
    return { name, success: false, detail: message, durationMs };
  }
}

/**
 * Start the bridge process as a spawned background process.
 *
 * Runs `bun run --filter @planloop/browser-transport dev` detached
 * so the bridge continues after setup exits. Writes bridge state
 * to .opencode/bridge-state.json.
 *
 * @param config - Setup configuration.
 * @param logger - Logger instance.
 */
async function startBridge(config: SetupConfig, logger: Logger): Promise<void> {
  logger.info("Starting bridge", { host: config.bridgeHost, port: config.bridgePort });

  const stateDir = join(config.workspaceRoot, ".opencode");
  mkdirSync(stateDir, { recursive: true });

  try {
    const child = execFile(
      "bun",
      ["run", "--filter", "@planloop/browser-transport", "dev"],
      {
        cwd: config.workspaceRoot,
        timeout: BRIDGE_START_TIMEOUT_MS,
        signal: AbortSignal.timeout(BRIDGE_START_TIMEOUT_MS),
      },
      (error) => {
        if (error !== null) {
          logger.warn("Bridge process exited", { error: error.message });
        }
      },
    );

    // Detach so the bridge outlives the setup process
    child.unref();

    // Give the bridge a moment to start
    await new Promise((resolve) => setTimeout(resolve, 2_000));

    const state = {
      pid: child.pid,
      host: config.bridgeHost,
      port: config.bridgePort,
      startedAt: new Date().toISOString(),
    };
    writeFileSync(join(config.workspaceRoot, BRIDGE_STATE_PATH), JSON.stringify(state, null, 2) + "\n");
    logger.info("Bridge started", { pid: child.pid, host: config.bridgeHost, port: config.bridgePort });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.error("Failed to start bridge", { error: message });
    throw new BootstrapError(
      "BRIDGE_START_FAILED",
      `Failed to start bridge process.\nDetails: ${message}`,
    );
  }
}

/**
 * Run the full setup pipeline.
 *
 * Steps: Detect → Install → Build Extension → Start Bridge → Verify.
 * Aborts with BootstrapError if any critical step fails.
 *
 * @param config - Setup configuration.
 * @returns SetupResult with all step outcomes.
 */
export async function runSetup(config: SetupConfig): Promise<SetupResult> {
  const runId = randomUUID();
  const logger = createLogger("bootstrap", runId);

  logger.info("Setup started", {
    workspaceRoot: config.workspaceRoot,
    bridgeHost: config.bridgeHost,
    bridgePort: config.bridgePort,
  });

  const steps: SetupStepResult[] = [];

  // Step 1: Detect
  const detectStep = await runStep("Detect", async () => {
    await detect(config.workspaceRoot, logger, config.bridgeHost, config.bridgePort);
  });
  steps.push(detectStep);
  if (!detectStep.success) {
    logger.error("Setup failed at Detect step", { detail: detectStep.detail });
    return {
      success: false,
      steps,
      error: new BootstrapError("SETUP_DETECT_FAILED", `Detect failed: ${detectStep.detail}`),
    };
  }

  // Step 2: Install
  const installStep = await runStep("Install", async () => {
    await runInstall(config.workspaceRoot, logger);
  });
  steps.push(installStep);
  if (!installStep.success) {
    logger.error("Setup failed at Install step", { detail: installStep.detail });
    return {
      success: false,
      steps,
      error: new BootstrapError("SETUP_INSTALL_FAILED", `Install failed: ${installStep.detail}`),
    };
  }

  // Step 3: Build extension
  const buildStep = await runStep("Build Extension", async () => {
    await buildExtension(config.workspaceRoot, logger);
  });
  steps.push(buildStep);
  if (!buildStep.success) {
    logger.error("Setup failed at Build Extension step", { detail: buildStep.detail });
    return {
      success: false,
      steps,
      error: new BootstrapError("SETUP_BUILD_FAILED", `Build failed: ${buildStep.detail}`),
    };
  }

  // Step 4: Start bridge
  const startStep = await runStep("Start Bridge", async () => {
    await startBridge(config, logger);
  });
  steps.push(startStep);
  if (!startStep.success) {
    logger.error("Setup failed at Start Bridge step", { detail: startStep.detail });
    return {
      success: false,
      steps,
      error: new BootstrapError("SETUP_START_FAILED", `Start bridge failed: ${startStep.detail}`),
    };
  }

  // Step 5: Verify
  const verifyStep = await runStep("Verify", async () => {
    const health = await checkBridgeHealthWithRetry(config.bridgeHost, config.bridgePort, logger);
    if (health.status === "error") {
      throw new BootstrapError("VERIFY_FAILED", `Bridge health check failed: ${health.detail}`);
    }
  });
  steps.push(verifyStep);
  if (!verifyStep.success) {
    logger.error("Setup failed at Verify step", { detail: verifyStep.detail });
    return {
      success: false,
      steps,
      error: new BootstrapError("SETUP_VERIFY_FAILED", `Verify failed: ${verifyStep.detail}`),
    };
  }

  const totalMs = steps.reduce((sum, s) => sum + s.durationMs, 0);
  logger.info("Setup complete", { totalMs, stepCount: steps.length });

  return { success: true, steps };
}

// ---------------------------------------------------------------------------
// CLI entry point
// ---------------------------------------------------------------------------

const isMainModule = process.argv[1]?.endsWith("setup.ts") ?? false;

/**
 * Resolve the workspace root by walking up from the given directory
 * until a package.json with a "workspaces" field is found.
 *
 * @param startDir - Directory to start searching from.
 * @returns Absolute path to the workspace root.
 * @throws {BootstrapError} If no workspace root found.
 */
export function resolveWorkspaceRoot(startDir: string): string {
  let dir = startDir;
  for (let i = 0; i < 10; i++) {
    const pkgPath = join(dir, "package.json");
    try {
      const content = readFileSync(pkgPath, "utf-8");
      const pkg = JSON.parse(content) as Record<string, unknown>;
      if (pkg["workspaces"] !== undefined) {
        return dir;
      }
    } catch {
      // No package.json or invalid JSON — keep walking up
    }
    const parent = join(dir, "..");
    if (parent === dir) break;
    dir = parent;
  }
  throw new BootstrapError(
    "WORKSPACE_ROOT_NOT_FOUND",
    `Could not find workspace root from ${startDir}. Expected a package.json with "workspaces".`,
  );
}

if (isMainModule) {
  const workspaceRoot = resolveWorkspaceRoot(process.cwd());
  const config: SetupConfig = {
    workspaceRoot,
    bridgeHost: DEFAULT_BRIDGE_HOST,
    bridgePort: DEFAULT_BRIDGE_PORT,
  };

  const result = await runSetup(config);

  for (const step of result.steps) {
    const icon = step.success ? "✓" : "✗";
    process.stderr.write(`${icon} ${step.name} (${String(step.durationMs)}ms) — ${step.detail}\n`);
  }

  if (!result.success && result.error) {
    process.stderr.write(`\nSetup failed: ${result.error.message}\n`);
    process.exit(1);
  }

  process.stderr.write("\nSetup complete.\n");
}
