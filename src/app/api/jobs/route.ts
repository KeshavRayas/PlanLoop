import { searchJobs } from "@/lib/repositories/jobs.repository";
import { logSearchEvent } from "@/lib/repositories/search.repository";
import { jobFiltersSchema } from "@/lib/validation";
import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const query = Object.fromEntries(req.nextUrl.searchParams.entries());
  const parsed = jobFiltersSchema.safeParse(query);

  if (!parsed.success) {
    return Response.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.query) {
    await logSearchEvent(parsed.data.query);
  }

  const result = await searchJobs(parsed.data);
  return Response.json(result);
}
