import type { JobSource } from "./interface";
import type { RawJob } from "@/lib/types";
import { CURATED_COMPANIES } from "@/lib/constants";
import { fetchWithTimeout, runBatched } from "@/lib/utils";

const BATCH_SIZE = 5;

export class AshbySource implements JobSource {
  readonly name = "ashby";

  async fetchJobs(): Promise<RawJob[]> {
    const companies = CURATED_COMPANIES.filter((c) => c.atsType === "ashby");
    const results: RawJob[] = [];

    await runBatched(companies, BATCH_SIZE, async (company) => {
      const board = company.atsBoard ?? company.slug;
      const url = `https://api.ashbyhq.com/posting-api/job-board/${board}`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) return;

      const data = await res.json();
      const jobs = data.jobs ?? [];

      for (const j of jobs) {
        results.push({
          externalId: String(j.id),
          title: String(j.title ?? ""),
          description: String(j.descriptionHtml ?? j.descriptionPlain ?? ""),
          companyName: company.name,
          companyType: company.companyType,
          location: j.location ?? undefined,
          remote: j.isRemote ?? false,
          jobType: j.type === "Full-Time" ? "FULL_TIME" : undefined,
          postedAt: j.publishedDate ? new Date(j.publishedDate) : undefined,
          applyUrl: String(j.applyUrl ?? `https://jobs.ashbyhq.com/${board}/${j.id}`),
        });
      }
    });

    return results;
  }
}
