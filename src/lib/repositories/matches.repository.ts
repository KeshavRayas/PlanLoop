import { prisma } from "@/lib/prisma";

export interface TopMatch {
  matchId: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  skillOverlap: number;
  salaryFit: string;
  recencyDecay: number;
  recencySource: string | null;
  sourceTrust: number;
  levelFit: number;
  roleFamily: string | null;
  roleFit: string | null;
  locationFit: string | null;
  reasons: string[];
  nightlyRunId: string | null;
  humanVerdict: string | null;
  judgedAt: Date | null;
  judgmentContext: string | null;
  job: {
    id: string;
    title: string;
    description: string;
    applyUrl: string;
    location: string | null;
    workMode: string;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurr: string | null;
    postedAt: Date | null;
    skills: string[];
    source: string;
  };
  company: {
    id: string;
    name: string;
    slug: string;
  };
}

/**
 * Ranked nightly candidate set. Defaults to the latest run's TOP 25 so the
 * morning UI and the digest read the same contract.
 */
export async function getTopMatches(
  limit = 25,
  nightlyRunId?: string
): Promise<TopMatch[]> {
  const runId =
    nightlyRunId ??
    (
      await prisma.nightlyRun.findFirst({
        where: { success: true },
        orderBy: { startedAt: "desc" },
        select: { id: true },
      })
    )?.id;

  if (!runId) return [];

  const rows = await prisma.jobMatch.findMany({
    where: { nightlyRunId: runId },
    orderBy: { score: "desc" },
    take: limit,
    include: {
      job: { include: { company: true } },
    },
  });

  return rows.map((m) => ({
    matchId: m.id,
    score: m.score,
    matchedSkills: m.matchedSkills,
    missingSkills: m.missingSkills,
    skillOverlap: m.skillOverlap,
    salaryFit: m.salaryFit,
    recencyDecay: m.recencyDecay,
    recencySource: m.recencySource,
    sourceTrust: m.sourceTrust,
    levelFit: m.levelFit,
    roleFamily: m.roleFamily,
    roleFit: m.roleFit,
    locationFit: m.locationFit,
    reasons: m.reasons,
    nightlyRunId: m.nightlyRunId,
    humanVerdict: m.humanVerdict,
    judgedAt: m.judgedAt,
    judgmentContext: m.judgmentContext,
    job: {
      id: m.job.id,
      title: m.job.title,
      description: m.job.description,
      applyUrl: m.job.applyUrl,
      location: m.job.location,
      workMode: m.job.workMode,
      salaryMin: m.job.salaryMin,
      salaryMax: m.job.salaryMax,
      salaryCurr: m.job.salaryCurr,
      postedAt: m.job.postedAt,
      skills: m.job.skills,
      source: m.job.source,
    },
    company: {
      id: m.job.company.id,
      name: m.job.company.name,
      slug: m.job.company.slug,
    },
  }));
}
