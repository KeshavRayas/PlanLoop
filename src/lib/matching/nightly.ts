import { prisma } from "@/lib/prisma";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";
import { scoreJob, TOP_N_DEFAULT } from "@/lib/matching/score";
import { classifyRoleFamily, roleFit } from "@/lib/matching/roleFamily";
import { locationEligibility } from "@/lib/matching/eligibility";
import { getOrCreateDefaultProfile } from "@/lib/matching/profile";
import { getTopMatches } from "@/lib/repositories/matches.repository";
import { sendNightlyDigest } from "@/lib/digest";

const CLASSIFICATION_FLOOR = 0.7;
const STALE_DAYS = 30;

export interface NightlyResult {
  runId: string;
  candidates: number;
  matched: number;
  digestSent: boolean;
}

/**
 * Score ACTIVE candidates and persist the TOP N ranked set.
 * History is retained: older JobMatch rows keep their previous nightlyRunId.
 */
export async function runMatching(
  nightlyRunId: string,
  topN: number = TOP_N_DEFAULT
): Promise<{ candidates: number; matched: number }> {
  const profile = await getOrCreateDefaultProfile();
  const cutoff = new Date(Date.now() - STALE_DAYS * 24 * 60 * 60 * 1000);

  const candidates = await prisma.job.findMany({
    where: {
      status: "ACTIVE",
      classificationScore: { gte: CLASSIFICATION_FLOOR },
      OR: [{ postedAt: { gte: cutoff } }, { postedAt: null }],
    },
    select: {
      id: true,
      title: true,
      description: true,
      skills: true,
      salaryMin: true,
      salaryMax: true,
      postedAt: true,
      scrapedAt: true,
      source: true,
      sourceScore: true,
      experience: true,
      location: true,
      workMode: true,
    },
  });

  const now = new Date();
  const goals = {
    preferred: profile.preferredRoleFamilies,
    vetoed: profile.vetoedRoleFamilies,
  };
  let vetoedRole = 0;
  let ineligibleLocation = 0;

  const scored = [];
  for (const job of candidates) {
    // Hard filters first (logged, like the ingestion cheap filters).
    const family = classifyRoleFamily(job.title, job.description);
    if (roleFit(family, goals).fit === "VETO") {
      vetoedRole++;
      continue;
    }
    const { fit: locFit } = locationEligibility(
      { location: job.location, workMode: job.workMode, description: job.description },
      { openToRemote: profile.openToRemote }
    );
    if (locFit === "INELIGIBLE") {
      ineligibleLocation++;
      continue;
    }
    scored.push({
      jobId: job.id,
      result: scoreJob(
        profile,
        {
          skills: job.skills,
          salaryMin: job.salaryMin,
          salaryMax: job.salaryMax,
          postedAt: job.postedAt,
          scrapedAt: job.scrapedAt,
          source: job.source,
          sourceScore: job.sourceScore,
          experience: job.experience,
          title: job.title,
          description: job.description,
          location: job.location,
          workMode: job.workMode,
        },
        now
      ),
    });
  }

  console.log(
    `[matching] candidates: ${candidates.length} | vetoed role: ${vetoedRole} | ineligible location: ${ineligibleLocation} | scored: ${scored.length}`
  );

  scored.sort((a, b) => b.result.score - a.result.score);
  const top = scored.slice(0, topN);

  await Promise.all(
    top.map(({ jobId, result }) => {
      const matchData = {
        score: result.score,
        matchedSkills: result.matchedSkills,
        missingSkills: result.missingSkills,
        skillOverlap: result.skillOverlap,
        salaryFit: result.salaryFit,
        salaryScore: result.salaryScore,
        recencyDecay: result.recencyDecay,
        recencySource: result.recencySource,
        sourceTrust: result.sourceTrust,
        levelFit: result.levelFit,
        roleFamily: result.roleFamily,
        roleFit: result.roleFit,
        locationFit: result.locationFit,
        reasons: result.reasons,
        nightlyRunId,
      };
      return prisma.jobMatch.upsert({
        where: { jobId },
        update: matchData,
        create: { jobId, ...matchData },
      });
    })
  );

  await prisma.nightlyRun.update({
    where: { id: nightlyRunId },
    data: { scored: candidates.length, matched: top.length },
  });

  return { candidates: candidates.length, matched: top.length };
}

/**
 * Full 02:00 pipeline: ingest → match TOP 25 → digest.
 * Model-free. Failures mark the run unsuccessful and rethrow.
 */
export async function runNightly(
  topN: number = TOP_N_DEFAULT
): Promise<NightlyResult> {
  const run = await prisma.nightlyRun.create({ data: { startedAt: new Date() } });

  try {
    await runIngestionPipeline();
    const { candidates, matched } = await runMatching(run.id, topN);

    await prisma.nightlyRun.update({
      where: { id: run.id },
      data: { fetched: candidates },
    });

    const top = await getTopMatches(topN, run.id);
    const digest = await sendNightlyDigest(top, run.id);

    await prisma.nightlyRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), success: true },
    });

    return { runId: run.id, candidates, matched, digestSent: digest.sent };
  } catch (err) {
    await prisma.nightlyRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), success: false, error: String(err) },
    });
    throw err;
  }
}
