/**
 * Shared types for @planloop/bootstrap.
 *
 * @module types
 */

/** Log severity levels. */
export type LogLevel = "debug" | "info" | "warn" | "error";

/** Structured log entry matching the PlanLoop log schema. */
export interface LogEntry {
  readonly timestamp: string;
  readonly runId: string;
  readonly iteration: number;
  readonly component: string;
  readonly level: LogLevel;
  readonly message: string;
  readonly metadata?: Record<string, unknown>;
}

/** Result of environment detection. */
export interface DetectResult {
  readonly bun: ToolInfo;
  readonly node: ToolInfo;
  readonly workspace: WorkspaceInfo;
  readonly extensionBuilt: boolean;
  readonly bridgeRunning: boolean;
}

/** Information about a detected tool (Bun or Node). */
export interface ToolInfo {
  readonly available: boolean;
  readonly version?: string;
  readonly error?: string;
}

/** Information about the workspace. */
export interface WorkspaceInfo {
  readonly root: string;
  readonly valid: boolean;
  readonly error?: string;
}

/** Overall health status for a single component. */
export type ComponentStatus = "ok" | "error" | "warn";

/** Health check result for a single component. */
export interface ComponentHealth {
  readonly name: string;
  readonly status: ComponentStatus;
  readonly detail: string;
}

/** Full diagnostics report. */
export interface DiagnosticsReport {
  readonly components: ComponentHealth[];
  readonly allGreen: boolean;
}

/** Configuration passed to the setup pipeline. */
export interface SetupConfig {
  readonly workspaceRoot: string;
  readonly bridgePort: number;
  readonly bridgeHost: string;
}

/** Result of the setup pipeline. */
export interface SetupResult {
  readonly success: boolean;
  readonly steps: SetupStepResult[];
  readonly error?: BootstrapError;
}

/** Result of a single setup pipeline step. */
export interface SetupStepResult {
  readonly name: string;
  readonly success: boolean;
  readonly detail: string;
  readonly durationMs: number;
}

/** Default bridge host. */
export const DEFAULT_BRIDGE_HOST = "127.0.0.1" as const;

/** Default bridge port. */
export const DEFAULT_BRIDGE_PORT = 9477 as const;

/** Extension dist directory relative to workspace root. */
export const EXTENSION_DIST_PATH = "apps/browser-extension/dist" as const;

/** Bridge state file path relative to workspace root. */
export const BRIDGE_STATE_PATH = ".opencode/bridge-state.json" as const;

/**
 * Error thrown by bootstrap modules.
 *
 * Every BootstrapError carries a machine-readable `code` property
 * so callers can switch on error kinds without string matching.
 */
export class BootstrapError extends Error {
  /** Machine-readable error code. */
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "BootstrapError";
    this.code = code;
  }
}
