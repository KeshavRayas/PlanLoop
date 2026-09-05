import { prisma } from "@/lib/prisma";

export async function getCompaniesHiringActively(limit = 20) {
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const result = await prisma.$queryRaw<
    {
      id: string;
      name: string;
      slug: string;
      logo: string | null;
      companyType: string;
      openRoles: bigint;
    }[]
  >`
    SELECT c.id, c.name, c.slug, c.logo, c."companyType", COUNT(*)::bigint as "openRoles"
    FROM "Job" j
    JOIN "Company" c ON c.id = j."companyId"
    WHERE j."scrapedAt" > ${sevenDaysAgo}
    GROUP BY c.id, c.name, c.slug, c.logo, c."companyType"
    ORDER BY "openRoles" DESC
    LIMIT ${limit}
  `;

  return result.map((r) => ({
    ...r,
    openRoles: Number(r.openRoles),
  }));
}

export async function getCompanyBySlug(slug: string) {
  return prisma.company.findUnique({ where: { slug } });
}
