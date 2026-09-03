import type { JobSource } from "./interface";
import type { RawJob } from "@/lib/types";
import { fetchWithTimeout } from "@/lib/utils";

const ADZUNA_API = "https://api.adzuna.com/v1/api/jobs/in/search/1";

export class AdzunaSource implements JobSource {
  readonly name = "adzuna";

  async fetchJobs(): Promise<RawJob[]> {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) return [];

    const url = `${ADZUNA_API}?app_id=${appId}&app_key=${appKey}&results_per_page=50&what=(software OR developer OR engineer OR data OR machine+learning OR AI OR data+science OR SDE OR full+stack OR computer+science)&where=Bangalore&content_type=application/json`;

    const res = await fetchWithTimeout(url);
    if (!res.ok) return [];

    const data = await res.json();
    const results = data.results ?? [];

    return results.map((j: Record<string, unknown>) => {
      const company = j.company as Record<string, unknown> | undefined;
      const location = j.location as Record<string, unknown> | undefined;
      return {
        externalId: String(j.id ?? ""),
        title: String(j.title ?? ""),
        description: String(j.description ?? ""),
        companyName: String(company?.display_name ?? ""),
        location: String(location?.display_name ?? ""),
        remote: false,
        salaryMin: j.salary_min ? Number(j.salary_min) : undefined,
        salaryMax: j.salary_max ? Number(j.salary_max) : undefined,
        salaryCurr: String(j.salary_currency ?? ""),
        postedAt: j.created ? new Date(String(j.created)) : undefined,
        applyUrl: String(j.redirect_url ?? ""),
      } as RawJob;
    });
  }
}
