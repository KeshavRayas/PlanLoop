import type { RawJob } from "@/lib/types";
import type { WorkMode } from "@/generated/prisma/enums";

const REMOTE_PATTERN = /\b(remote|worldwide|work from home|work-from-home|distributed|fully remote|100% remote|remote-first|remote first|india remote|remote india|remote apac|remote asia|apac remote|asia remote|remote - india|emea)\b/i;
const REMOTE_DASH_PATTERN = /\bremote\s*[-–]\s*(india|apac|asia)\b/i;
const REMOTE_PAREN_PATTERN = /\bremote\s*\((apac|asia|india)\)\b/i;
const BANGALORE_PATTERN = /\b(bangalore|bengaluru|bangalore urban|karnataka)\b/i;
const HYBRID_PATTERN = /\bhybrid\b/i;

export function getWorkMode(job: RawJob): WorkMode | null {
  const text = `${job.title} ${job.description || ""} ${job.location || ""}`.toLowerCase();
  const loc = (job.location || "").toLowerCase();

  if (
    job.remote ||
    REMOTE_PATTERN.test(text) ||
    REMOTE_DASH_PATTERN.test(text) ||
    REMOTE_PAREN_PATTERN.test(text)
  ) {
    return "REMOTE";
  }

  if (!BANGALORE_PATTERN.test(loc)) {
    return null;
  }

  if (HYBRID_PATTERN.test(text)) {
    return "HYBRID";
  }

  return "ONSITE";
}
