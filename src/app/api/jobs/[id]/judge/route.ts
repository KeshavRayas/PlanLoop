import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

const VERDICTS = ["EXCELLENT", "GOOD", "BAD"] as const;

// ─── Calibration judging (Phase 2.5.5) ───────────────────────────────────────
// Observational only: humanVerdict is stored for later correlation analysis
// and NEVER influences ranking. getTopMatches ignores these columns.

export async function POST(req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const job = await prisma.job.findUnique({ where: { id }, select: { id: true } });
  if (!job) return Response.json({ error: "Not found" }, { status: 404 });

  let body: { verdict?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (!body.verdict || !(VERDICTS as readonly string[]).includes(body.verdict)) {
    return Response.json(
      { error: `verdict must be one of ${VERDICTS.join(", ")}` },
      { status: 400 }
    );
  }

  const match = await prisma.jobMatch.findUnique({ where: { jobId: id } });
  if (!match) {
    return Response.json({ error: "No JobMatch for this job yet" }, { status: 404 });
  }
  const updated = await prisma.jobMatch.update({
    where: { jobId: id },
    data: { humanVerdict: body.verdict, judgedAt: new Date() },
  });
  return Response.json(
    { jobId: id, humanVerdict: updated.humanVerdict, judgedAt: updated.judgedAt },
    { status: 201 }
  );
}
