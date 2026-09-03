import { prisma } from "@/lib/prisma";
import type { JobFilters, PaginatedResult, JobSearchResult } from "@/lib/types";
import { daysAgo } from "@/lib/utils";

export async function searchJobs(filters: JobFilters): Promise<PaginatedResult<JobSearchResult>> {
  const conditions: string[] = [];
  const params: unknown[] = [];
  let paramIdx = 1;

  // Always filter active jobs with valid classification
  conditions.push(`j."status" = 'ACTIVE'`);
  conditions.push(`j."classificationScore" IS NOT NULL`);
  conditions.push(`j."classificationScore" >= 0.70`);
  conditions.push(`j."postedAt" IS NOT NULL AND DATE_PART('day', NOW() - j."postedAt") <= 30`);

  if (filters.query) {
    conditions.push(`j."searchVector" @@ plainto_tsquery('english', $${paramIdx})`);
    params.push(filters.query);
    paramIdx++;
  }

  if (filters.location) {
    conditions.push(`j."location" ILIKE $${paramIdx}`);
    params.push(`%${filters.location}%`);
    paramIdx++;
  }

  if (filters.workMode) {
    conditions.push(`j."workMode" = $${paramIdx}::"WorkMode"`);
    params.push(filters.workMode);
    paramIdx++;
  }

  if (filters.companyTypes?.length) {
    conditions.push(`c."companyType" = ANY($${paramIdx}::"CompanyType"[])`);
    params.push(filters.companyTypes);
    paramIdx++;
  }

  if (filters.skills?.length) {
    conditions.push(`j."skills" && $${paramIdx}`);
    params.push(filters.skills);
    paramIdx++;
  }

  if (filters.jobType) {
    conditions.push(`j."jobType" = $${paramIdx}::"JobType"`);
    params.push(filters.jobType);
    paramIdx++;
  }

  if (filters.experience) {
    conditions.push(`j."experience" = $${paramIdx}::"ExperienceLevel"`);
    params.push(filters.experience);
    paramIdx++;
  }

  if (filters.daysOld) {
    conditions.push(`DATE_PART('day', NOW() - j."postedAt") <= $${paramIdx}`);
    params.push(filters.daysOld);
    paramIdx++;
  }

  if (filters.sources?.length) {
    conditions.push(`j."source" = ANY($${paramIdx}::"JobSource"[])`);
    params.push(filters.sources);
    paramIdx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;
  const offset = (page - 1) * pageSize;

  const countResult = await prisma.$queryRawUnsafe<{ total: bigint }[]>(
    `SELECT COUNT(*)::bigint as total
     FROM "Job" j
     JOIN "Company" c ON c.id = j."companyId"
     ${where}`,
    ...params
  );
  const total = Number(countResult[0]?.total ?? 0);

  const rows = await prisma.$queryRawUnsafe<{
    id: string;
    title: string;
    description: string;
    applyUrl: string;
    workMode: string;
    location: string | null;
    salaryMin: number | null;
    salaryMax: number | null;
    salaryCurr: string | null;
    postedAt: Date | null;
    skills: string[];
    companyId: string;
    companyName: string;
    companySlug: string;
    companyLogo: string | null;
    companyType: string;
  }[]>(
    `SELECT j.id, j.title, j.description, j."applyUrl", j."workMode",
            j.location, j."salaryMin", j."salaryMax", j."salaryCurr",
            j."postedAt", j.skills,
            c.id as "companyId", c.name as "companyName", c.slug as "companySlug",
            c.logo as "companyLogo", c."companyType"
     FROM "Job" j
     JOIN "Company" c ON c.id = j."companyId"
     ${where}
     ORDER BY j."sourceScore" DESC, j."postedAt" DESC NULLS LAST, j."scrapedAt" DESC
     LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    ...params,
    pageSize,
    offset
  );

  const data = rows.map((r) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    applyUrl: r.applyUrl,
    workMode: r.workMode as "REMOTE" | "HYBRID" | "ONSITE",
    location: r.location ?? undefined,
    salaryMin: r.salaryMin ?? undefined,
    salaryMax: r.salaryMax ?? undefined,
    salaryCurr: r.salaryCurr ?? undefined,
    postedAt: r.postedAt,
    daysOld: daysAgo(r.postedAt),
    skills: r.skills ?? [],
    company: {
      id: r.companyId,
      name: r.companyName,
      slug: r.companySlug,
      logo: r.companyLogo,
      companyType: r.companyType as "STARTUP" | "MNC",
    },
  }));

  return {
    data,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

export async function getJobById(id: string) {
  return prisma.job.findUnique({
    where: { id },
    include: { company: true },
  });
}
