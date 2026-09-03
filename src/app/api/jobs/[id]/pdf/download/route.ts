import { readFile } from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const tailored = await prisma.tailoredResume.findFirst({
    where: { jobId: id, isCurrent: true },
    orderBy: { version: "desc" },
  });
  if (!tailored || tailored.renderStatus !== "SUCCESS" || !tailored.pdfPath) {
    return Response.json({ error: "No rendered PDF yet" }, { status: 404 });
  }
  const abs = path.join(process.cwd(), tailored.pdfPath);
  try {
    const pdf = await readFile(abs);
    const job = await prisma.job.findUnique({
      where: { id },
      include: { company: true },
    });
    const filename = `${(job?.company.name ?? "resume").replace(/\s+/g, "_")}_resume.pdf`;
    return new Response(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return Response.json({ error: "PDF file missing" }, { status: 404 });
  }
}
