import type { ExperienceLevel } from "@/generated/prisma/enums";
import type { RawJob, EntryLevelResult } from "@/lib/types";
import { escapeRegex } from "@/lib/utils";

const ENTRY_TITLE_PATTERNS = [
  "intern",
  "internship",
  "graduate",
  "new grad",
  "new graduate",
  "associate",
  "junior",
  "trainee",
  "campus hire",
  "fresher",
  "entry level",
  "entry-level",
  "apprentice",
  "0-2",
  "0-3",
  "early career",
  "software engineer i",
  "sde i",
  "swe i",
  "sde1",
  "swe1",
  "university graduate",
  "campus graduate",
  "graduate engineer",
  "graduate software engineer",
  "entry software engineer",
  "associate data engineer",
  "software developer i",
].map((t) => new RegExp(`\\b${escapeRegex(t)}\\b`, "i"));

const SENIOR_TITLE_PATTERNS = [
  "senior",
  "lead",
  "principal",
  "staff",
  "manager",
  "director",
  "vp",
  "vice president",
  "architect",
  "head of",
  "chief",
  "head ",
  "managing",
  "partner",
].map((t) => new RegExp(`\\b${escapeRegex(t)}\\b`, "i"));

const RELAXED_CEILING_ROLES = [
  /\bsoftware engineer\b/i,
  /\bbackend engineer\b/i,
  /\bfrontend engineer\b/i,
  /\bdata engineer\b/i,
  /\bml engineer\b/i,
  /\bmachine learning engineer\b/i,
  /\bsoftware developer\b/i,
  /\bfull.?stack engineer\b/i,
  /\bdevops engineer\b/i,
  /\bsite reliability engineer\b/i,
  /\bsre\b/i,
  /\bplatform engineer\b/i,
];

const YOE_PATTERN = /(\d+)[\s-]*\+[\s]*years?/i;
const RANGE_PATTERN = /(\d+)[\s-]*(\d+)[\s]*years?/i;

function hasRelaxedCeiling(title: string): boolean {
  return RELAXED_CEILING_ROLES.some((p) => p.test(title));
}

export function isEntryLevel(job: RawJob): EntryLevelResult {
  if (job.experience === "ENTRY") {
    return { accepted: true, experienceLevel: "ENTRY" };
  }

  if (
    job.experience === "MID" ||
    job.experience === "SENIOR" ||
    job.experience === "LEAD"
  ) {
    return {
      accepted: false,
      reason: `API experience level: ${job.experience}`,
    };
  }

  const title = job.title.toLowerCase();

  const hasSenior = SENIOR_TITLE_PATTERNS.some((r) => r.test(title));

  if (hasSenior) {
    return { accepted: false, reason: "Senior title detected" };
  }

  const hasEntry = ENTRY_TITLE_PATTERNS.some((r) => r.test(title));

  if (hasEntry) {
    return { accepted: true, experienceLevel: "ENTRY" };
  }

  const desc = (job.description || "").toLowerCase();
  const relaxed = hasRelaxedCeiling(title);
  const ceiling = relaxed ? 4 : 3;

  const yoeMatch = desc.match(YOE_PATTERN);

  if (yoeMatch) {
    const years = parseInt(yoeMatch[1]);
    if (years >= 5)
      return { accepted: false, reason: `${years}+ years experience required` };
    if (years <= ceiling) return { accepted: true, experienceLevel: "ENTRY" };
  }

  const rangeMatch = desc.match(RANGE_PATTERN);
  if (rangeMatch) {
    const minYears = parseInt(rangeMatch[1]);
    const maxYears = parseInt(rangeMatch[2]);
    if (maxYears > ceiling || minYears > ceiling)
      return {
        accepted: false,
        reason: `${minYears}-${maxYears} years experience required`,
      };
    if (minYears <= ceiling)
      return { accepted: true, experienceLevel: "ENTRY" };
  }

  return { accepted: false, reason: "Unable to determine experience level" };
}

const ENTRY_PATTERNS = [
  /\bfresher\b/i,
  /\bentry\s*level\b/i,
  /\bjunior\b/i,
  /\bgraduate\b/i,
  /\btrainee\b/i,
  /\bapprentice\b/i,
  /\b0[\s-]?\d\s+years?\b/i,
  /\b0[\s-]?2\s+years?\b/i,
  /\bearly\s*career\b/i,
  /\bintern\b/i,
  /\bassociate\b/i,
  /\bnew\s*grad\b/i,
];

const SENIOR_PATTERNS = [
  /\bsenior\b/i,
  /\blead\b/i,
  /\bstaff\b/i,
  /\bprincipal\b/i,
  /\bmanager\b/i,
  /\bdirector\b/i,
  /\bhead\s*of\b/i,
  /\barchitect\b/i,
  /\bvp\b/i,
  /\bvice\s*president\b/i,
  /\bhead\b/i,
  /\bexperienced\b/i,
  /\b\dyears?\b/i,
  /\b\d[\s-]?\d\s+years?\b/i,
];

export function inferExperienceLevel(
  title: string,
  description?: string,
): ExperienceLevel {
  const text = `${title} ${description ?? ""}`;

  const hasEntry = ENTRY_PATTERNS.some((p) => p.test(text));
  const hasSenior = SENIOR_PATTERNS.some((p) => p.test(text));

  if (hasEntry && !hasSenior) return "ENTRY";
  if (hasSenior && !hasEntry) return "SENIOR";

  if (hasEntry && hasSenior) {
    const entryScore = ENTRY_PATTERNS.reduce(
      (s, p) => s + (p.test(text) ? 1 : 0),
      0,
    );
    const seniorScore = SENIOR_PATTERNS.reduce(
      (s, p) => s + (p.test(text) ? 1 : 0),
      0,
    );
    return entryScore >= seniorScore ? "ENTRY" : "SENIOR";
  }

  return "ENTRY";
}
