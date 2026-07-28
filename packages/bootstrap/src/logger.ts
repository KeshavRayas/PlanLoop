/**
 * Structured JSON logger for @planloop/bootstrap.
 *
 * Package-local implementation. The log schema is shared across all packages
 * per observability.md; this is the bootstrap-specific implementation.
 *
 * Reads LOG_LEVEL from process.env as its configuration source (logger is
 * infrastructure, not business logic — permitted per coding-standards.md).
 *
 * @module logger
 */

import type { LogEntry, LogLevel } from "./types.js";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const VALID_LEVELS = new Set<string>(Object.keys(LEVEL_ORDER));

function resolveMinLevel(): LogLevel {
  const env = process.env["LOG_LEVEL"];
  if (env !== undefined && VALID_LEVELS.has(env)) {
    return env as LogLevel;
  }
  return "info";
}

/** Logger interface with four severity levels. */
export interface Logger {
  debug: (message: string, metadata?: Record<string, unknown>) => void;
  info: (message: string, metadata?: Record<string, unknown>) => void;
  warn: (message: string, metadata?: Record<string, unknown>) => void;
  error: (message: string, metadata?: Record<string, unknown>) => void;
}

/**
 * Create a structured JSON logger for the given component.
 *
 * @param component - Component name (e.g. "bootstrap"). Written to every entry.
 * @param runId - Unique run identifier for this session.
 * @returns Logger instance with debug/info/warn/error methods.
 */
export function createLogger(component: string, runId: string): Logger {
  const minLevel = resolveMinLevel();
  let iteration = 0;

  function log(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) return;

    iteration += 1;
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      runId,
      iteration,
      component,
      level,
      message,
      ...(metadata !== undefined ? { metadata } : {}),
    };
    process.stderr.write(JSON.stringify(entry) + "\n");
  }

  return {
    debug: (message: string, metadata?: Record<string, unknown>): void => { log("debug", message, metadata); },
    info: (message: string, metadata?: Record<string, unknown>): void => { log("info", message, metadata); },
    warn: (message: string, metadata?: Record<string, unknown>): void => { log("warn", message, metadata); },
    error: (message: string, metadata?: Record<string, unknown>): void => { log("error", message, metadata); },
  };
}
