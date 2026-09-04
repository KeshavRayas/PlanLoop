import { prisma } from "@/lib/prisma";

// Batch metrics: BAD/EXCELLENT in top 5/10, inversions, mean rank by verdict,
// role-family distribution, location errors, UNKNOWN-rate.
// Rows judged LOCATION_HIDDEN are excluded from location-specific cuts only.

const RANK_VALUE: Record<string, number> = { EXCELLENT: 2, GOOD: 1, BAD: 0 };

async function main() {
  const run = await prisma.nightlyRun.findFirst({
    where: { success: true },
    orderBy: { startedAt: "desc" },
  });
  if (!run) throw new Error("no successful run");
  const inRun = await prisma.jobMatch.findMany({
    where: { nightlyRunId: run.id, humanVerdict: { not: null } },
    include: { job: { include: { company: true } } },
    orderBy: { score: "desc" },
  });
  // Judged but filtered out of this run (vetoed role / ineligible location).
  const filtered = await prisma.jobMatch.findMany({
    where: {
      humanVerdict: { not: null },
      nightlyRunId: { not: run.id },
    },
    include: { job: { include: { company: true } } },
    orderBy: { score: "desc" },
  });
  const rows = inRun;
  console.log(`run=${run.id.slice(0, 8)} judged-in-run=${rows.length} judged-filtered=${filtered.length}`);
  for (const r of filtered) {
    console.log(
      `FILTERED | ${(r.humanVerdict ?? "-").padEnd(9)} | ${(r.roleFamily ?? "?").padEnd(14)} | ${(r as { judgmentContext?: string }).judgmentContext ?? "?"} | ${r.job.title.slice(0, 44)} @ ${r.job.company.name}`
    );
  }

  const rankOf = new Map(rows.map((r, i) => [r.jobId, i + 1]));
  const byVerdict = (v: string) => rows.filter((r) => r.humanVerdict === v);
  const inTop = (v: string, n: number) =>
    byVerdict(v).filter((r) => (rankOf.get(r.jobId) ?? 99) <= n).length;
  for (const v of ["EXCELLENT", "GOOD", "BAD"]) {
    console.log(`${v}: top5=${inTop(v, 5)} top10=${inTop(v, 10)} n=${byVerdict(v).length}`);
  }

  let inv = 0;
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (RANK_VALUE[rows[i].humanVerdict!] < RANK_VALUE[rows[j].humanVerdict!]) inv++;
    }
  }
  console.log(`inversions: ${inv} of ${(rows.length * (rows.length - 1)) / 2}`);

  for (const v of ["EXCELLENT", "GOOD", "BAD"]) {
    const ranks = byVerdict(v).map((r) => rankOf.get(r.jobId)!);
    const mean = ranks.reduce((a, b) => a + b, 0) / ranks.length;
    console.log(`mean rank ${v}: ${mean.toFixed(2)}`);
  }

  const roles: Record<string, Record<string, number>> = {};
  for (const r of rows) {
    const k = r.roleFamily ?? "?";
    roles[k] ??= { EXCELLENT: 0, GOOD: 0, BAD: 0 };
    roles[k][r.humanVerdict!]++;
  }
  console.log("role distribution (EXC/GOOD/BAD):");
  for (const [k, v] of Object.entries(roles)) {
    console.log(`  ${k}: ${v.EXCELLENT}/${v.GOOD}/${v.BAD}`);
  }

  // Location-specific cuts exclude LOCATION_HIDDEN judgments.
  const visible = rows.filter((r) => (r as { judgmentContext?: string }).judgmentContext !== "LOCATION_HIDDEN");
  const locErrors = visible.filter(
    (r) => r.humanVerdict === "EXCELLENT" && r.locationFit === "INELIGIBLE"
  );
  console.log(`location errors (EXCELLENT but INELIGIBLE, visible ctx): ${locErrors.length}`);
  for (const r of locErrors) {
    console.log(`  ${r.job.title.slice(0, 44)} @ ${r.job.company.name}`);
  }
  const unknownRate =
    visible.filter((r) => r.locationFit === "UNKNOWN").length / Math.max(1, visible.length);
  console.log(`location UNKNOWN-rate (visible ctx): ${unknownRate.toFixed(2)}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
