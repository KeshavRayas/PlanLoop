import { prisma } from "@/lib/prisma";

export async function GET() {
  const [
    rejectionBreakdown,
    sourceBreakdown,
    sourceSyncStats,
    activeCount,
    rejectedCount,
  ] = await Promise.all([
    prisma.$queryRawUnsafe<{ reason: string; count: bigint }[]>(
      `SELECT CASE
           WHEN "rejectionReason" IS NULL THEN 'UNKNOWN'
           ELSE "rejectionReason"::text
         END as reason,
         COUNT(*)::bigint as count
         FROM "Job"
         WHERE "status" = 'REJECTED'
         GROUP BY "rejectionReason"
         ORDER BY count DESC`,
    ),
    prisma.$queryRawUnsafe<{ source: string; count: bigint }[]>(
      `SELECT "source", COUNT(*)::bigint as count
         FROM "Job"
         GROUP BY "source"
         ORDER BY count DESC`,
    ),
    prisma.$queryRawUnsafe<
      { source: string; fetched: bigint; created: bigint }[]
    >(
      `SELECT "source",
                COALESCE(SUM("jobsFetched"), 0)::bigint as fetched,
                COALESCE(SUM("jobsCreated"), 0)::bigint as created
         FROM "SourceSync"
         GROUP BY "source"
         ORDER BY "source"`,
    ),
    prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint as count FROM "Job" WHERE "status" = 'ACTIVE'`,
    ),
    prisma.$queryRawUnsafe<{ count: bigint }[]>(
      `SELECT COUNT(*)::bigint as count FROM "Job" WHERE "status" = 'REJECTED'`,
    ),
  ]);

  return Response.json({
    totalActive: Number(activeCount[0]?.count ?? 0),
    totalRejected: Number(rejectedCount[0]?.count ?? 0),
    rejectionBreakdown: Object.fromEntries(
      rejectionBreakdown.map((r) => [r.reason, Number(r.count)]),
    ),
    sourceBreakdown: Object.fromEntries(
      sourceBreakdown.map((s) => [s.source, Number(s.count)]),
    ),
    sourceSyncEfficiency: Object.fromEntries(
      sourceSyncStats.map((s) => [
        s.source,
        { fetched: Number(s.fetched), created: Number(s.created) },
      ]),
    ),
  });
}
