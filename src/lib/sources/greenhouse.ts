import type { JobSource } from "./interface";
import type { RawJob } from "@/lib/types";
import { CURATED_COMPANIES } from "@/lib/constants";
import { fetchWithTimeout, runBatched } from "@/lib/utils";

const BATCH_SIZE = 5;

export class GreenhouseSource implements JobSource {
  readonly name = "greenhouse";

  async fetchJobs(): Promise<RawJob[]> {
    const companies = CURATED_COMPANIES.filter(
      (c) => c.atsType === "greenhouse",
    );
    const results: RawJob[] = [];

    await runBatched(companies, BATCH_SIZE, async (company) => {
      const boardToken = company.atsBoard ?? company.slug;
      const url = `https://boards-api.greenhouse.io/v1/boards/${boardToken}/jobs?content=true`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) return;

      const data = await res.json();
      const jobs = data.jobs ?? [];
      for (const j of jobs) {
        results.push({
          externalId: String(j.id),
          title: String(j.title ?? ""),
          description: String(j.content ?? ""),
          companyName: company.name,
          companyType: company.companyType,
          location: j.location?.name ?? undefined,
          remote: false,
          postedAt: j.first_published ? new Date(j.first_published) : undefined,
          applyUrl: String(j.absolute_url ?? ""),
        });
      }
    });

    return results;
  }
}
