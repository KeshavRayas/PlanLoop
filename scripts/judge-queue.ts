import { prisma } from "@/lib/prisma";
import { getTopMatches } from "@/lib/repositories/matches.repository";

// Prints the current TOP 25 as a judging table. Paste verdicts back with:
//   npx tsx scripts/judge-queue.ts --rate <jobId> <EXCELLENT|GOOD|BAD>
// Verdicts are observational only and never affect ranking (Phase 2.5.5).

async function rate(jobId: string, verdict: string) {
  const match = await prisma.jobMatch.findUnique({ where: { jobId } });
  if (!match) throw new Error(`no JobMatch for job ${jobId}`);
  await prisma.jobMatch.update({
    where: { jobId },
    data: { humanVerdict: verdict, judgedAt: new Date() },
  });
  console.log(`rated ${jobId} -> ${verdict}`);
}

async function table() {
  const top = await getTopMatches(25);
  console.log("rank | score | human | title @ company | matched/total | id");
  top.forEach((t, i) => {
    console.log(
      `${String(i + 1).padStart(2)} | ${t.score.toFixed(2)} | ${(t.humanVerdict ?? "-").padEnd(9)} | ${t.job.title} @ ${t.company.name} | ${t.matchedSkills.length}/${t.job.skills.length} | ${t.job.id}`
    );
  });
}

async function main() {
  const [, , cmd, a, b] = process.argv;
  if (cmd === "--rate" && a && b) {
    if (!["EXCELLENT", "GOOD", "BAD"].includes(b)) throw new Error("verdict must be EXCELLENT|GOOD|BAD");
    await rate(a, b);
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
