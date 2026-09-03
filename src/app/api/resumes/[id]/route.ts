import { prisma } from "@/lib/prisma";
import { extractSkills } from "@/lib/resume.utils";
import type { ResumeData } from "@/lib/resume.types";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }
  return Response.json(resume);
}

export async function PUT(req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const existing = await prisma.resume.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const body = await req.json();

  let skills = body.skills;
  if (body.content && !skills) {
    skills = extractSkills(body.content as ResumeData);
  }

  const updated = await prisma.resume.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.content !== undefined && { content: body.content as object }),
      ...(skills !== undefined && { skills }),
    },
  });

  return Response.json(updated);
}

export async function DELETE(_req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const existing = await prisma.resume.findUnique({ where: { id } });
  if (!existing) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.resume.delete({ where: { id } });
  return Response.json({ success: true });
}
