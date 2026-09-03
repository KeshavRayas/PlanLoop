import { checkUrl } from "@/lib/liveness";

type Params = Promise<{ id: string }>;

export async function POST(_req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const { prisma } = await import("@/lib/prisma");
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(await checkUrl(job.applyUrl));
}
