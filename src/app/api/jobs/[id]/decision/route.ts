import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

const STATUSES = ["QUEUED", "OPENED", "APPLIED", "SAVED", "SKIPPED"] as const;
type Status = (typeof STATUSES)[number];

// ─── Application lifecycle (Phase 2.5.3) ─────────────────────────────────────
// Opening applyUrl records OPENED — never APPLIED. Only an explicit
// "I've Applied" confirmation records APPLIED.

export async function GET(_req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const job = await prisma.job.findUnique({ where: { id }, select: { id: true } });
  if (!job) return Response.json({ error: "Not found" }, { status: 404 });
  const decision = await prisma.applicationDecision.findUnique({ where: { jobId: id } });
  return Response.json(decision ?? { jobId: id, status: "QUEUED", decided: false });
}

export async function POST(req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const job = await prisma.job.findUnique({ where: { id }, select: { id: true } });
  if (!job) return Response.json({ error: "Not found" }, { status: 404 });

  let body: { status?: string; reason?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body.status || !(STATUSES as readonly string[]).includes(body.status)) {
    return Response.json(
      { error: `status must be one of ${STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const decision = await prisma.applicationDecision.upsert({
    where: { jobId: id },
    update: {
      status: body.status as Status,
      reason: body.reason ?? null,
      decidedAt: new Date(),
    },
    create: {
      jobId: id,
      status: body.status as Status,
      reason: body.reason ?? null,
    },
  });
  return Response.json(decision, { status: 201 });
}
