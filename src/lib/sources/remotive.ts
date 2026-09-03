import type { JobSource } from "./interface";
import type { RawJob } from "@/lib/types";
import { fetchWithTimeout } from "@/lib/utils";

export class RemotiveSource implements JobSource {
  readonly name = "remotive";

  async fetchJobs(): Promise<RawJob[]> {
    const res = await fetchWithTimeout("https://remotive.com/api/remote-jobs?limit=50");
    if (!res.ok) return [];

    const data = await res.json();
    const results = data.jobs ?? [];

    return results.map((j: Record<string, unknown>) => ({
      externalId: String(j.id),
      title: String(j.title ?? ""),
      description: String(j.description ?? ""),
      companyName: String(j.company_name ?? ""),
      location: String(j.candidate_required_location ?? ""),
      remote: true,
      jobType: j.job_type === "full_time" ? "FULL_TIME" : undefined,
      postedAt: j.publication_date ? new Date(String(j.publication_date)) : undefined,
      applyUrl: String(j.url ?? ""),
    })) as RawJob[];
  }
}
