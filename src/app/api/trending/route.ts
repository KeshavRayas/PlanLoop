import { getTrendingSearches } from "@/lib/repositories/search.repository";

export async function GET() {
  const trending = await getTrendingSearches();
  return Response.json(trending);
}
