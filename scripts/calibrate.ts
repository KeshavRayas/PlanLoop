import { prisma } from "@/lib/prisma";

const RANK_VALUE: Record<string, number> = { EXCELLENT: 2, GOOD: 1, BAD: 0 };

async function main() {
  const rows = await prisma.jobMatch.findMany({
    where: { humanVerdict: { not: null } },
    include: { job: { include: { company: true } } },
    orderBy: { score: "desc" },
  });
  console.log("n=" + rows.length);
  for (const r of rows) {
    console.log(
      [
        r.score.toFixed(2),
        r.humanVerdict,
        `sk=${r.skillOverlap.toFixed(2)}`,
        `lv=${r.levelFit}`,
        `re=${r.recencyDecay.toFixed(2)}`,
        `so=${r.sourceTrust}`,
        `sa=${r.salaryFit}`,
        `${r.job.title.slice(0, 44)} @ ${r.job.company.name}`,
      ].join(" | ")
    );
  }
  // Group means
  const groups: Record<string, number[]> = {};
  for (const r of rows) {
    (groups[r.humanVerdict!] ??= []).push(r.score);
  }
  for (const [k, v] of Object.entries(groups)) {
    console.log(`MEAN ${k}: ${(v.reduce((a, b) => a + b, 0) / v.length).toFixed(3)} (n=${v.length})`);
  }
  // Pairwise inversions: higher-scored job judged strictly worse
  let inv = 0;
  const pairs: string[] = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      if (RANK_VALUE[a.humanVerdict!] > RANK_VALUE[b.humanVerdict!]) continue;
      if (RANK_VALUE[a.humanVerdict!] < RANK_VALUE[b.humanVerdict!]) {
        inv++;
        if (pairs.length < 8) {
          pairs.push(
            `${a.score.toFixed(2)} ${a.humanVerdict} "${a.job.title.slice(0, 30)}" above ${b.score.toFixed(2)} ${b.humanVerdict} "${b.job.title.slice(0, 30)}"`
          );
        }
      }
    }
  }
  // rows sorted desc: inversions = later row judged better than earlier row
  console.log(`INVERSIONS: ${inv} of ${(rows.length * (rows.length - 1)) / 2} pairs`);
  for (const p of pairs) console.log("  INV: " + p);
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
