import { prisma } from "@/lib/prisma";
import { getTopMatches } from "@/lib/repositories/matches.repository";

// Prints the current TOP 25 as a judging table. Paste verdicts back with:
//   bunx tsx scripts/judge-queue.ts --rate <jobId> <EXCELLENT|GOOD|BAD> [--blind]
// Verdicts are observational only and never affect ranking (Phase 2.5.5).
// Export judged rows with reason context for batch comparison:
//   bunx tsx scripts/judge-queue.ts --export <path.json>

async function rate(jobId: string, verdict: string, context: string) {
  const match = await prisma.jobMatch.findUnique({ where: { jobId } });
  if (!match) throw new Error(`no JobMatch for job ${jobId}`);
  await prisma.jobMatch.update({
    where: { jobId },
    data: {
      humanVerdict: verdict,
      judgedAt: new Date(),
      judgmentContext: context,
    },
  });
  console.log(`rated ${jobId} -> ${verdict} [${context}]`);
}

async function exportJudged(path: string) {
  const { writeFile, mkdir } = await import("node:fs/promises");
  const { dirname } = await import("node:path");
  await mkdir(dirname(path), { recursive: true });
  const rows = await prisma.jobMatch.findMany({
    where: { humanVerdict: { not: null } },
    include: { job: { include: { company: true } } },
    orderBy: { score: "desc" },
  });
  const out = rows.map((m) => ({
    jobId: m.jobId,
    title: m.job.title,
    company: m.job.company.name,
    verdict: m.humanVerdict,
    judgmentContext: m.judgmentContext ?? "LOCATION_VISIBLE",
    roleFamily: m.roleFamily,
    locationFit: m.locationFit,
    skillOverlap: m.skillOverlap,
    score: m.score,
  }));
  await writeFile(path, JSON.stringify(out, null, 2));
  console.log(`exported ${out.length} judgments -> ${path}`);
}

async function table() {
  const top = await getTopMatches(25);
  console.log(
    "rank | score | human | role | loc | title @ company | matched/total | id",
  );
  top.forEach((t, i) => {
    console.log(
      `${String(i + 1).padStart(2)} | ${t.score.toFixed(2)} | ${(t.humanVerdict ?? "-").padEnd(9)} | ${(t.roleFamily ?? "?").padEnd(14)} | ${(t.locationFit ?? "?").padEnd(8)} | ${(t.job.location ?? "?").slice(0, 24).padEnd(24)} | ${t.job.title} @ ${t.company.name} | ${t.matchedSkills.length}/${t.job.skills.length} | ${t.job.id}`,
    );
  });
}

async function main() {
  const [, , cmd, a, b, c] = process.argv;
  if (cmd === "--rate" && a && b) {
    if (!["EXCELLENT", "GOOD", "BAD"].includes(b))
      throw new Error("verdict must be EXCELLENT|GOOD|BAD");
    const context = c === "--blind" ? "LOCATION_HIDDEN" : "LOCATION_VISIBLE";
    await rate(a, b, context);
  } else if (cmd === "--export" && a) {
    await exportJudged(a);
  } else {
    await table();
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
