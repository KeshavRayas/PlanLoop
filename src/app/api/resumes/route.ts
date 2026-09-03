import { prisma } from "@/lib/prisma";
import { extractSkills } from "@/lib/resume.utils";
import type { ResumeData } from "@/lib/resume.types";

export async function GET() {
  const resumes = await prisma.resume.findMany({
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      title: true,
      skills: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  return Response.json(resumes);
}

export async function POST(req: Request) {
  const body = await req.json();
  const content: ResumeData = body.content ?? { sections: [] };
  const skills = body.skills ?? extractSkills(content);

  const resume = await prisma.resume.create({
    data: {
      title: body.title || "My Resume",
      content: content as object,
      skills,
    },
  });

  return Response.json(resume);
}
