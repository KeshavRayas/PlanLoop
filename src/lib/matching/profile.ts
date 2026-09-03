import { prisma } from "@/lib/prisma";
import type { MatcherProfile } from "@/lib/matching/score";

// ─── Profile loading for the nightly matcher ───────────────────────────────
// Single "default" profile row. Created on first nightly run from the most
// recent Resume's skills (or empty when no resume exists yet). Editing UI is
// out of scope for Phase 1 — update the row directly until then.

export async function getOrCreateDefaultProfile(): Promise<MatcherProfile & { id: string }> {
  const existing = await prisma.profile.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (existing) {
    return { id: existing.id, skills: existing.skills, minSalary: existing.minSalary };
  }

  const latestResume = await prisma.resume.findFirst({
    orderBy: { updatedAt: "desc" },
    select: { skills: true },
  });

  const created = await prisma.profile.create({
    data: {
      label: "default",
      skills: latestResume?.skills ?? [],
    },
  });
  return { id: created.id, skills: created.skills, minSalary: created.minSalary };
}
