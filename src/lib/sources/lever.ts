import type { JobSource } from "./interface";
import type { RawJob } from "@/lib/types";
import { CURATED_COMPANIES } from "@/lib/constants";
import { fetchWithTimeout, runBatched } from "@/lib/utils";

const BATCH_SIZE = 5;

export class LeverSource implements JobSource {
  readonly name = "lever";

  async fetchJobs(): Promise<RawJob[]> {
    const companies = CURATED_COMPANIES.filter((c) => c.atsType === "lever");
    const results: RawJob[] = [];

    await runBatched(companies, BATCH_SIZE, async (company) => {
      const board = company.atsBoard ?? company.slug;
      const url = `https://api.lever.co/v0/postings/${board}?mode=json`;
      const res = await fetchWithTimeout(url);
      if (!res.ok) return;

      const jobs = await res.json();
      for (const j of jobs) {
        results.push({
          externalId: String(j.id ?? j.publicationId),
          title: String(j.text ?? j.title ?? ""),
          description: String(j.descriptionPlain ?? j.description ?? ""),
          companyName: company.name,
          companyType: company.companyType,
          location: j.categories?.location ?? j.location ?? undefined,
          remote: j.categories?.commitment
            ? String(j.categories.commitment).toLowerCase().includes("remote")
            : false,
          jobType: j.categories?.commitment === "Full-Time" ? "FULL_TIME" : undefined,
          postedAt: j.createdAt ? new Date(j.createdAt) : undefined,
          applyUrl: String(j.hostedUrl ?? `https://jobs.lever.co/${board}/${j.id}`),
        });
      }
    });

    return results;
  }
}
