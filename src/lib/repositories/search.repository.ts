import { prisma } from "@/lib/prisma";

export async function logSearchEvent(query: string): Promise<void> {
  if (!query || query.trim().length === 0) return;
  await prisma.searchEvent.create({
    data: { query: query.trim().toLowerCase() },
  });
}

export async function getTrendingSearches(limit = 10) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await prisma.$queryRaw<{ query: string; count: bigint }[]>`
    SELECT query, COUNT(*)::bigint as count
    FROM "SearchEvent"
    WHERE "createdAt" > ${sevenDaysAgo}
    GROUP BY query
    ORDER BY count DESC
    LIMIT ${limit}
  `;

  return result.map((r) => ({ query: r.query, count: Number(r.count) }));
}
