import type { RawJob } from "@/lib/types";

export interface JobSource {
  readonly name: string;
  fetchJobs(): Promise<RawJob[]>;
}
