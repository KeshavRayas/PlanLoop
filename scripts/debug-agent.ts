import { spawn } from "node:child_process";

function ask(args: string[], message: string): Promise<{ chunks: string[]; rawLen: number }> {
  return new Promise((resolve) => {
    const c = spawn(
      "C:\\nvm4w\\nodejs\\node_modules\\opencode-ai\\bin\\opencode.exe",
      args.concat([message]),
      { stdio: ["ignore", "pipe", "pipe"] }
    );
    let out = "";
    c.stdout?.on("data", (d: Buffer) => (out += d.toString()));
    c.on("close", () => {
      const chunks: string[] = [];
      for (const line of out.split("\n")) {
        const t = line.trim();
        if (!t.startsWith("{")) continue;
        try {
          const e = JSON.parse(t) as { part?: { type?: string; text?: string } };
          if (e.part?.type === "text" && e.part.text) chunks.push(e.part.text);
        } catch { /* ignore */ }
      }
      resolve({ chunks, rawLen: out.length });
    });
    c.on("error", (e) => resolve({ chunks: [`SPAWN_ERR: ${String(e)}`], rawLen: 0 }));
  });
}

async function main() {
  const secret = "PAPAYA-" + Date.now().toString(36).toUpperCase();
  const padding = Array.from({ length: 60 }, (_, i) => `Posting paragraph ${i}: we build distributed systems with Go, Postgres, and Kubernetes.`).join("\n");
  const msg = [
    "Answer DIRECTLY. Reply with ONLY a JSON object. No other text.",
    "",
    `The secret word is ${secret}.`,
    "",
    "POSTING:",
    padding,
    "",
    `Question: what is the secret word? Return ONLY {"word": "<secret>"}.`,
  ].join("\n");
  console.log("MSG_LEN:", msg.length);
  const r = await ask(["run", "--format", "json", "--agent", "json-answer"], msg);
  console.log("CHUNKS:", r.chunks.length, "RAWLEN:", r.rawLen);
  console.log("LAST:", r.chunks[r.chunks.length - 1]?.slice(0, 300));
  console.log("SECRET:", secret);
}

main();
