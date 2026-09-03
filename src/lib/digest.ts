import { Resend } from "resend";
import { formatSalary } from "@/lib/utils";
import type { TopMatch } from "@/lib/repositories/matches.repository";

export interface DigestResult {
  sent: boolean;
  reason?: string;
}

function matchLine(m: TopMatch, i: number): string {
  const salary = formatSalary(
    m.job.salaryMin ?? undefined,
    m.job.salaryMax ?? undefined,
    m.job.salaryCurr ?? undefined
  );
  const skills =
    m.job.skills.length > 0
      ? `${m.matchedSkills.length}/${m.job.skills.length} skills`
      : "skills n/a";
  const missing =
    m.missingSkills.length > 0 ? `\n   Missing: ${m.missingSkills.join(", ")}` : "";
  const loc = m.job.location ?? m.job.workMode;
  return [
    `${i + 1}. [${m.score.toFixed(2)}] ${m.job.title} — ${m.company.name} (${loc})`,
    `   ${skills} · ${salary} · ${m.job.source}${m.salaryFit === "UNKNOWN" ? " · salary n/a" : ""}`,
    ...[missing],
    `   Apply: ${m.job.applyUrl}`,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Morning digest of the nightly TOP 25. Reads the same getTopMatches
 * contract the UI uses. Skips silently (no throw) when email is unconfigured
 * so a missing key can never fail the nightly run.
 */
export async function sendNightlyDigest(
  matches: TopMatch[],
  runId: string
): Promise<DigestResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.DIGEST_TO_EMAIL;

  if (!apiKey || !to) {
    console.log(
      `[digest] skipped (run ${runId}): RESEND_API_KEY or DIGEST_TO_EMAIL not set`
    );
    return { sent: false, reason: "email-unconfigured" };
  }

  const date = new Date().toISOString().slice(0, 10);
  const lines = matches.map(matchLine);
  const text = [
    `Job Search — ${matches.length} worth seeing (${date}, run ${runId})`,
    "",
    ...lines,
    "",
    "Review and decide in the app. No resume was tailored overnight —",
    "select a job to analyze it on demand.",
  ].join("\n");

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.DIGEST_FROM_EMAIL ?? "Job Search <onboarding@resend.dev>",
    to,
    subject: `Job Search: ${matches.length} matches for ${date}`,
    text,
  });

  if (error) {
    console.error(`[digest] resend error (run ${runId}):`, error);
    return { sent: false, reason: "resend-error" };
  }
  return { sent: true };
}
