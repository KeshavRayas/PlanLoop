// ─── Location eligibility (Matcher v2, deterministic) ────────────────────────
// Three states, never a boolean: ELIGIBLE / INELIGIBLE / UNKNOWN.
// Unknown sponsorship or missing location stays UNKNOWN (visible
// uncertainty), never silently eligible. INELIGIBLE is a filter signal.

export type LocationFit = "ELIGIBLE" | "INELIGIBLE" | "UNKNOWN";

export const LOCATION_FIT_SCORE: Record<LocationFit, number> = {
  ELIGIBLE: 1,
  UNKNOWN: 0.5,
  INELIGIBLE: 0,
};

export interface EligibilityInput {
  location?: string | null;
  remote?: boolean;
  workMode?: string | null;
  description?: string | null;
}

export interface EligibilityProfile {
  locations?: string[] | null;
  openToRemote?: boolean | null;
}

const HOME_MARKERS = [
  "bangalore",
  "bengaluru",
  "bangalore urban",
  "karnataka",
  "india",
  "remote india",
  "india remote",
  "remote - india",
  "apac",
  "asia pacific",
  "remote apac",
  "remote asia",
];

const REMOTE_MARKERS = [
  "remote",
  "work from home",
  "work-from-home",
  "fully remote",
  "remote-first",
  "remote first",
];
// NOTE: "distributed" and "worldwide" are deliberately absent — they appear
// in boilerplate ("distributed systems", "operating worldwide") and would
// mark nearly every backend posting remote.

// Explicit work-authorization/location restrictions. Tight negative-only
// list: positive sponsorship language ("we sponsor visas") must NOT match.
const RESTRICTION_MARKERS = [
  "us only",
  "u.s. only",
  "must be based in",
  "must reside in",
  "required to be based",
  "required to reside",
  "no sponsorship",
  "without sponsorship",
  "not sponsor",
  "unable to sponsor",
  "do not sponsor",
  "does not sponsor",
  "no visa",
  "authorized to work",
  "work authorized",
  "authorization to work",
  "us citizen",
  "u.s. citizen",
  "eu citizen",
];

export function findRestriction(text: string): string | null {
  const lower = text.toLowerCase();
  return RESTRICTION_MARKERS.find((m) => lower.includes(m)) ?? null;
}

// Named Indian cities outside the home market. Remote roles based here stay
// eligible (remote India-wide hiring is common); on-site ones do not.
const INDIA_OTHER = [
  "mumbai",
  "delhi",
  "hyderabad",
  "chennai",
  "pune",
  "kolkata",
  "noida",
  "gurgaon",
  "gurugram",
  "ahmedabad",
  "kochi",
  "trivandrum",
  "coimbatore",
];

// Explicit non-India restriction.
const FOREIGN_MARKERS = [
  "zurich",
  "switzerland",
  "berlin",
  "germany",
  "munich",
  "london",
  "united kingdom",
  "europe",
  "emea",
  "united states",
  " usa",
  "usa ",
  "us only",
  "san francisco",
  "new york",
  "seattle",
  "austin",
  "canada",
  "toronto",
  "australia",
  "sydney",
  "singapore",
  "japan",
  "tokyo",
  "france",
  "paris",
  "netherlands",
  "amsterdam",
  "spain",
  "poland",
  "warsaw",
];

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((m) => haystack.includes(m));
}

/**
 * Mumbai/Delhi/etc. are named Indian cities outside the home market. They
 * are INELIGIBLE only for on-site expectations; an explicit remote signal
 * keeps them eligible (remote India-wide hiring is common).
 */
export function locationEligibility(
  job: EligibilityInput,
  profile: EligibilityProfile = {}
): { fit: LocationFit; reason: string } {
  const text = `${job.location ?? ""} ${job.description ?? ""}`.toLowerCase();
  const loc = (job.location ?? "").toLowerCase();
  const openToRemote = profile.openToRemote ?? true;

  const remoteSignal =
    job.remote === true ||
    job.workMode === "REMOTE" ||
    REMOTE_MARKERS.some((m) => text.includes(m));
  // Home eligibility must come from the LOCATION, not a passing description
  // mention ("india" buried in 5k of boilerplate must not confer it). The
  // only description-based exception is an explicit remote-India/APAC signal
  // when the location itself names no other city.
  const homeInLoc = HOME_MARKERS.some((m) => loc.includes(m));
  const cityInLoc =
    includesAny(loc, INDIA_OTHER) || includesAny(loc, FOREIGN_MARKERS);
  const homeInDesc =
    ["india", "bengaluru", "bangalore"].some((m) => text.includes(m)) && !cityInLoc;
  const homeSignal = homeInLoc || homeInDesc;

  if (remoteSignal && openToRemote) {
    // Structured or textual remote is trusted: city codes on remote
    // postings are requisition metadata, not work sites. Only an explicit
    // stated restriction disqualifies.
    const restriction = findRestriction(text);
    if (restriction) {
      return { fit: "INELIGIBLE", reason: `remote but restricted ("${restriction}")` };
    }
    if (homeSignal) return { fit: "ELIGIBLE", reason: "remote, India/APAC-inclusive" };
    return { fit: "ELIGIBLE", reason: "remote, no restriction stated" };
  }

  if (!openToRemote && remoteSignal) {
    return { fit: "UNKNOWN", reason: "remote role, remote not preferred" };
  }

  if (homeSignal) return { fit: "ELIGIBLE", reason: "home market (Bangalore/India)" };

  if (!loc.trim()) {
    return { fit: "UNKNOWN", reason: "no location information" };
  }

  // Location-only check: description mentions of other cities (e.g. an
  // "Mumbai office" aside in a Bangalore posting) must not disqualify.
  if (includesAny(loc, INDIA_OTHER) || includesAny(loc, FOREIGN_MARKERS)) {
    return { fit: "INELIGIBLE", reason: `outside home market (${job.location})` };
  }

  return { fit: "UNKNOWN", reason: "location unclear" };
}
