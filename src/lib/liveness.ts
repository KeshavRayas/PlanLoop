import { fetchWithTimeout } from "@/lib/utils";

// ─── Apply-time liveness (Phase 2.5.4) ───────────────────────────────────────
// Deliberately boring: one HEAD, GET fallback, 5s timeout. No persistence,
// no crawling. Called on demand before applying, not on a schedule.

export const LIVENESS_TIMEOUT_MS = 5000;

const DEAD_MARKERS = [
  /job no longer available/i,
  /position (has been )?filled/i,
  /job (has )?expired/i,
  /no longer accepting/i,
  /posting (has been )?removed/i,
  /vacancy (has been )?closed/i,
];

export interface Liveness {
  alive: boolean;
  statusCode: number | null;
  method: "HEAD" | "GET";
  evidence: string | null;
  checkedAt: string;
}

export async function checkUrl(url: string): Promise<Liveness> {
  const checkedAt = new Date().toISOString();

  try {
    const head = await fetchWithTimeout(url, {
      method: "HEAD",
      timeout: LIVENESS_TIMEOUT_MS,
      redirect: "follow",
    });
    if (head.status < 400) {
      return { alive: true, statusCode: head.status, method: "HEAD", evidence: null, checkedAt };
    }
    // 4xx/5xx on HEAD is inconclusive (many ATS block HEAD) — fall to GET,
    // except 404/410 which are definitive.
    if (head.status === 404 || head.status === 410) {
      return { alive: false, statusCode: head.status, method: "HEAD", evidence: `HTTP ${head.status}`, checkedAt };
    }
  } catch {
    // Network/timeout on HEAD — fall through to GET.
  }

  try {
    const get = await fetchWithTimeout(url, {
      method: "GET",
      timeout: LIVENESS_TIMEOUT_MS,
      redirect: "follow",
      headers: { "user-agent": "Mozilla/5.0 (compatible; JobSearch-liveness/1.0)" },
    });
    if (get.status >= 400) {
      return { alive: false, statusCode: get.status, method: "GET", evidence: `HTTP ${get.status}`, checkedAt };
    }
    const text = await get.text();
    const marker = DEAD_MARKERS.find((re) => re.test(text));
    if (marker) {
      return { alive: false, statusCode: get.status, method: "GET", evidence: `page states: ${marker.source}`, checkedAt };
    }
    return { alive: true, statusCode: get.status, method: "GET", evidence: null, checkedAt };
  } catch (err) {
    return { alive: false, statusCode: null, method: "GET", evidence: `fetch failed: ${err instanceof Error ? err.message : String(err)}`, checkedAt };
  }
}
