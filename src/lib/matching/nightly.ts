import { prisma } from "@/lib/prisma";
import { runIngestionPipeline } from "@/lib/ingestion/pipeline";
import { scoreJob, TOP_N_DEFAULT } from "@/lib/matching/score";
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
      skills: true,
      salaryMin: true,
      salaryMax: true,
      postedAt: true,
      source: true,
      sourceScore: true,
      experience: true,
    },
  });

  const now = new Date();
  const scored = candidates.map((job) => ({
    jobId: job.id,
    result: scoreJob(
      profile,
      {
        skills: job.skills,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        postedAt: job.postedAt,
        source: job.source,
        sourceScore: job.sourceScore,
        experience: job.experience,
        title: job.title,
      },
      now
    ),
  }));

  scored.sort((a, b) => b.result.score - a.result.score);
  const top = scored.slice(0, topN);

  await Promise.all(
    top.map(({ jobId, result }) =>
      prisma.jobMatch.upsert({
        where: { jobId },
        update: {
          score: result.score,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          skillOverlap: result.skillOverlap,
          salaryFit: result.salaryFit,
          salaryScore: result.salaryScore,
          recencyDecay: result.recencyDecay,
          sourceTrust: result.sourceTrust,
          levelFit: result.levelFit,
          reasons: result.reasons,
          nightlyRunId,
        },
        create: {
          jobId,
          score: result.score,
          matchedSkills: result.matchedSkills,
          missingSkills: result.missingSkills,
          skillOverlap: result.skillOverlap,
          salaryFit: result.salaryFit,
          salaryScore: result.salaryScore,
          recencyDecay: result.recencyDecay,
          sourceTrust: result.sourceTrust,
          levelFit: result.levelFit,
          reasons: result.reasons,
          nightlyRunId,
        },
      })
    )
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
