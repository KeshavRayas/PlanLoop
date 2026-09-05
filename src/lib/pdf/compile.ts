import { spawn } from "node:child_process";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

// ─── LaTeX compilation (Phase 2.4) ───────────────────────────────────────────
// One pdflatex pass in an isolated temp dir. No network, no shell.

export class RenderError extends Error {
  readonly log: string;
  constructor(message: string, log: string) {
    super(message);
    this.name = "RenderError";
    this.log = log;
  }
}

function binary(): string {
  if (process.env.PDFLATEX_BIN) return process.env.PDFLATEX_BIN;
  return process.platform === "win32" ? "pdflatex.exe" : "pdflatex";
}

export async function compileLatex(
  tex: string,
  timeoutMs = 90_000,
): Promise<{ pdf: Buffer; log: string }> {
  const dir = await mkdtemp(path.join(tmpdir(), "resume-"));
  try {
    await writeFile(path.join(dir, "resume.tex"), tex, "utf8");
    const log = await runPdflatex(dir, timeoutMs);
    const pdf = await readFile(path.join(dir, "resume.pdf")).catch(() => null);
    if (!pdf || pdf.length === 0) {
      throw new RenderError("pdflatex produced no PDF", log.slice(-3000));
    }
    return { pdf, log };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

function runPdflatex(dir: string, timeoutMs: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      binary(),
      ["-interaction=nonstopmode", "-halt-on-error", "resume.tex"],
      { cwd: dir, timeout: timeoutMs, stdio: ["ignore", "pipe", "pipe"] },
    );
    let out = "";
    child.stdout?.on("data", (d: Buffer) => (out += d.toString()));
    child.stderr?.on("data", (d: Buffer) => (out += d.toString()));
    child.on("error", (err) =>
      reject(new RenderError(`cannot run pdflatex: ${String(err)}`, "")),
    );
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else
        reject(
          new RenderError(
            `pdflatex exited with code ${code}`,
            out.slice(-3000),
          ),
        );
    });
  });
}
