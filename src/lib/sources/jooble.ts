import type { JobSource } from "./interface";
import type { RawJob } from "@/lib/types";
import { fetchWithTimeout } from "@/lib/utils";

export class JoobleSource implements JobSource {
  readonly name = "jooble";

  async fetchJobs(): Promise<RawJob[]> {
    const apiKey = process.env.JOOBLE_API_KEY;
    if (!apiKey) return [];

    const res = await fetchWithTimeout("https://jooble.org/api/" + apiKey, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        keywords:
          "(software engineer) OR (data scientist) OR (machine learning) OR (AI engineer) OR (SDE) OR (full stack) OR (data analyst) OR (computer science) OR (software developer)",
        location: "Bangalore",
        page: 1,
      }),
    });

    if (!res.ok) return [];

    const data = await res.json();
    const results = data.jobs ?? [];

    return results.map((j: Record<string, unknown>) => ({
      externalId: String(j.id),
      title: String(j.title ?? ""),
      description: String(j.snippet ?? j.description ?? ""),
      companyName: String(j.company ?? ""),
      location: String(j.location ?? ""),
      remote: false,
      salaryMin: j.salary_min ? Number(j.salary_min) : undefined,
      salaryMax: j.salary_max ? Number(j.salary_max) : undefined,
      salaryCurr: j.salary_currency ? String(j.salary_currency) : undefined,
      postedAt: j.updated ? new Date(String(j.updated)) : undefined,
      applyUrl: String(j.url ?? ""),
    })) as RawJob[];
  }
}
