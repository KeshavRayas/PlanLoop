import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { classifyJob } from "../src/lib/ingestion/classifier";
import { isEntryLevel } from "../src/lib/ingestion/experience";
import { getWorkMode } from "../src/lib/ingestion/location";
import { stripHtml } from "../src/lib/utils";
import { JobStatus, RejectionReason } from "../src/generated/prisma/enums";
import type { RawJob } from "../src/lib/types";

const databaseUrl = process.env.DATABASE_URL!;
const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

const BATCH_SIZE = 100;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

const counts = {
  NON_CS: 0,
  NON_ENTRY_LEVEL: 0,
  UNKNOWN_EXPERIENCE: 0,
  INVALID_LOCATION: 0,
  KEEP: 0,
};

async function main() {
  if (dryRun) {
    console.log("─── DRY RUN ───\n");
  }

  let cursor: string | undefined;
  let total = 0;

  while (true) {
    const jobs = await prisma.job.findMany({
      where: {
        status: JobStatus.ACTIVE,
        ...(cursor ? { id: { gt: cursor } } : {}),
      },
      take: BATCH_SIZE,
      orderBy: { id: "asc" },
      include: { company: { select: { name: true } } },
    });

    if (jobs.length === 0) break;

    for (const job of jobs) {
      total++;
      const raw: RawJob = {
        externalId: job.externalId,
        title: job.title,
        description: stripHtml(job.description),
        companyName: job.company.name,
        location: job.location ?? undefined,
        remote: job.workMode === "REMOTE",
        salaryMin: job.salaryMin ?? undefined,
        salaryMax: job.salaryMax ?? undefined,
        salaryCurr: job.salaryCurr ?? undefined,
        jobType: job.jobType ?? undefined,
        experience: job.experience ?? undefined,
        postedAt: job.postedAt ?? undefined,
        applyUrl: job.applyUrl,
      };

      const classification = classifyJob(raw);
      if (!classification.accepted) {
        counts.NON_CS++;
        if (!dryRun) {
          await prisma.job.update({
            where: { id: job.id },
            data: { status: JobStatus.REJECTED, rejectionReason: RejectionReason.NON_CS },
          });
        }
        continue;
      }

      const entryCheck = isEntryLevel(raw);
      if (!entryCheck.accepted) {
        const reason = entryCheck.reason?.includes("experience")
          ? RejectionReason.NON_ENTRY_LEVEL
          : RejectionReason.UNKNOWN_EXPERIENCE;
        counts[reason === RejectionReason.NON_ENTRY_LEVEL ? "NON_ENTRY_LEVEL" : "UNKNOWN_EXPERIENCE"]++;
        if (!dryRun) {
          await prisma.job.update({
            where: { id: job.id },
            data: { status: JobStatus.REJECTED, rejectionReason: reason },
          });
        }
        continue;
      }

      const workMode = getWorkMode(raw);
      if (!workMode) {
        counts.INVALID_LOCATION++;
        if (!dryRun) {
          await prisma.job.update({
            where: { id: job.id },
            data: { status: JobStatus.REJECTED, rejectionReason: RejectionReason.INVALID_LOCATION },
          });
        }
        continue;
      }

      counts.KEEP++;
      if (!dryRun) {
        await prisma.job.update({
          where: { id: job.id },
          data: { classificationScore: classification.confidence },
        });
      }
    }

    cursor = jobs[jobs.length - 1].id;

    if (total % 500 === 0 || total < BATCH_SIZE) {
      const scanned = dryRun ? "scanned" : "processed";
      console.log(`  ${total} jobs ${scanned}...`);
    }
  }

  const totalRejected =
    counts.NON_CS + counts.NON_ENTRY_LEVEL + counts.UNKNOWN_EXPERIENCE + counts.INVALID_LOCATION;

  console.log(`\n─── Results ───\n`);
  console.log(`  NON_CS:             ${counts.NON_CS}`);
  console.log(`  NON_ENTRY_LEVEL:    ${counts.NON_ENTRY_LEVEL}`);
  console.log(`  UNKNOWN_EXPERIENCE: ${counts.UNKNOWN_EXPERIENCE}`);
  console.log(`  INVALID_LOCATION:   ${counts.INVALID_LOCATION}`);
  console.log(`\n  Would reject: ${totalRejected}`);
  console.log(`  Would keep:   ${counts.KEEP}`);

  if (dryRun) {
    console.log(`\n─── DRY RUN — no changes made ───`);
  } else {
    console.log(`\n─── Cleanup complete ───`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
