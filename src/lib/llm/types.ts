// ─── LLM provider boundary (Phase 2A) ──────────────────────────────────────
// The app never calls a model directly. Everything goes through LlmProvider,
// so the free-model source can change (OpenCode CLI today, cloud API
// tomorrow) without touching analysis logic or routes.

export interface LlmProvider {
  readonly name: string;
  /** Returns the model's parsed JSON payload. Throws LlmError on failure. */
  generateJson(systemPrompt: string, userPrompt: string): Promise<unknown>;
}

export class LlmError extends Error {
  readonly provider: string;
  readonly detail?: string;

  constructor(provider: string, message: string, detail?: string) {
    super(message);
    this.name = "LlmError";
    this.provider = provider;
    this.detail = detail;
  }
}
