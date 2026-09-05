import { prisma } from "@/lib/prisma";

// Skills transcribed from C:\Users\kesha\Downloads\ResumeLatex.tex (Skills
// section + project/internship evidence). Technical skills only.

const SKILLS = [
  "Python",
  "Go",
  "TypeScript",
  "SQL",
  "JavaScript",
  "HTML",
  "CSS",
  "Data Structures",
  "Algorithms",
  "OOP",
  "Operating Systems",
  "Computer Networks",
  "RDBMS",
  "Database Design",
  "Distributed Systems",
  "REST",
  "Authentication",
  "RBAC",
  "PostgreSQL",
  "Prisma",
  "Redis",
  "WebSockets",
  "AWS",
  "Linux",
  "Docker",
  "CI/CD",
  "Git",
  "GitHub",
  "Playwright",
  "Turborepo",
  "Bun",
  "ESLint",
  "Prettier",
  "FastAPI",
  "Next.js",
  "PyTorch",
  "TensorFlow",
  "Scikit-learn",
  "Pandas",
  "NumPy",
];

async function main() {
  const baseResume = await prisma.resume.findFirst({
    where: { title: "Keshav Rayas — Base Resume" },
  });
  const existing = await prisma.profile.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  const profile = existing
    ? await prisma.profile.update({
        where: { id: existing.id },
        data: {
          skills: SKILLS,
          minSalary: null,
          locations: ["Bangalore", "Bengaluru"],
          workModes: ["REMOTE", "HYBRID", "ONSITE"],
          preferredRoleFamilies: [
            "BACKEND",
            "INFRASTRUCTURE",
            "DEVOPS_SRE",
            "FULL_STACK",
            "ML_AI",
            "DATA",
            "FORWARD_DEPLOYED",
          ],
          vetoedRoleFamilies: ["DATA_ANNOTATION"],
          openToRemote: true,
          // Pin the transcribed base resume so tailoring never depends on
          // timestamp ordering between resumes.
          baseResumeId: baseResume?.id ?? null,
          // Transcribed from ResumeLatex.tex header (same provenance as skills).
          name: "Keshav Girish Rayas",
          email: "keshav.rayas@gmail.com",
          phone: "+91 99018 65220",
          linkedin: "https://www.linkedin.com/in/keshavgrayas/",
          github: "https://github.com/KeshavRayas",
        },
      })
    : await prisma.profile.create({
        data: {
          label: "default",
          skills: SKILLS,
          locations: ["Bangalore", "Bengaluru"],
          workModes: ["REMOTE", "HYBRID", "ONSITE"],
          name: "Keshav Girish Rayas",
          email: "keshav.rayas@gmail.com",
          phone: "+91 99018 65220",
          linkedin: "https://www.linkedin.com/in/keshavgrayas/",
          github: "https://github.com/KeshavRayas",
        },
      });
  console.log(
    JSON.stringify({
      id: profile.id,
      skills: profile.skills.length,
      locations: profile.locations,
      workModes: profile.workModes,
    }),
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
