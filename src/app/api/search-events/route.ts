import { logSearchEvent } from "@/lib/repositories/search.repository";

export async function POST(req: Request) {
  const { query } = await req.json();
  await logSearchEvent(query);
  return Response.json({ success: true });
}
