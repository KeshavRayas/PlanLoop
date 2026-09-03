import { z } from "zod";
import { CompanyType, ExperienceLevel, JobType, JobSource, WorkMode } from "@/generated/prisma/enums";

export const rawJobSchema = z.object({
  externalId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  companyName: z.string().min(1),
  companyType: z.nativeEnum(CompanyType).optional(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  salaryMin: z.number().int().positive().optional(),
  salaryMax: z.number().int().positive().optional(),
  salaryCurr: z.string().optional(),
  jobType: z.nativeEnum(JobType).optional(),
  experience: z.nativeEnum(ExperienceLevel).optional(),
  postedAt: z.coerce.date().optional(),
  applyUrl: z.string().min(1),
});

export const jobFiltersSchema = z.object({
  query: z.string().optional(),
  location: z.string().optional(),
  workMode: z.nativeEnum(WorkMode).optional(),
  companyTypes: z
    .union([z.nativeEnum(CompanyType), z.array(z.nativeEnum(CompanyType))])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  skills: z
    .union([z.string(), z.array(z.string())])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  jobType: z.nativeEnum(JobType).optional(),
  experience: z.nativeEnum(ExperienceLevel).optional(),
  daysOld: z.coerce.number().int().positive().optional(),
  sources: z
    .union([z.nativeEnum(JobSource), z.array(z.nativeEnum(JobSource))])
    .transform((v) => (Array.isArray(v) ? v : [v]))
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const alertSchema = z.object({
  query: z.string().optional(),
  location: z.string().optional(),
  remote: z.boolean().optional(),
  skills: z.array(z.string()).optional(),
  companyTypes: z.array(z.nativeEnum(CompanyType)).optional(),
});

export const bookmarkSchema = z.object({
  jobId: z.string().min(1),
});
