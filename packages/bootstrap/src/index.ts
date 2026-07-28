/**
 * Public API for @planloop/bootstrap.
 *
 * Re-exports only — no implementation code here.
 *
 * @module index
 */

export type {
  LogLevel,
  LogEntry,
  DetectResult,
  ToolInfo,
  WorkspaceInfo,
  ComponentStatus,
  ComponentHealth,
  DiagnosticsReport,
  SetupConfig,
  SetupResult,
  SetupStepResult,
} from "./types.js";

export {
  BootstrapError,
  DEFAULT_BRIDGE_HOST,
  DEFAULT_BRIDGE_PORT,
  EXTENSION_DIST_PATH,
  BRIDGE_STATE_PATH,
} from "./types.js";

export { createLogger } from "./logger.js";
export type { Logger } from "./logger.js";

export { detect, detectBun, detectNode, detectWorkspace } from "./detect.js";
export { runInstall, buildExtension } from "./install.js";
export { checkBridgeHealth, checkBridgeHealthWithRetry, runHealthChecks } from "./health.js";
export { isExtensionBuilt, getExtensionHealth, LOAD_UNPACKED_INSTRUCTIONS } from "./extension-loader.js";
export { runDiagnostics, formatComponentLine } from "./diagnostics.js";
export { runSetup } from "./setup.js";
export { runDoctor } from "./doctor.js";
