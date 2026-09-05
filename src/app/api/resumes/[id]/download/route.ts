import { prisma } from "@/lib/prisma";
import type { ResumeData } from "@/lib/resume.types";

type Params = Promise<{ id: string }>;

export async function GET(_req: Request, ctx: { params: Params }) {
  const { id } = await ctx.params;
  const resume = await prisma.resume.findUnique({ where: { id } });
  if (!resume) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const content = resume.content as unknown as ResumeData;
  const sections = content.sections ?? [];

  // Serve original file if available
  if (content.originalContent) {
    if (content.originalFormat === "tex") {
      return new Response(content.originalContent, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Content-Disposition": `attachment; filename="${resume.title.replace(/\s+/g, "_")}.tex"`,
        },
      });
    }
    if (content.originalFormat === "pdf") {
      const binary = atob(content.originalContent);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Response(bytes, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${resume.title.replace(/\s+/g, "_")}.pdf"`,
        },
      });
    }
  }

  // Fallback: build plain text from parsed sections
  const lines: string[] = [
    `${resume.title}\n${"=".repeat(resume.title.length)}\n`,
  ];
  for (const section of sections) {
    lines.push(`\n${section.title}\n${"-".repeat(section.title.length)}\n`);
    for (const item of section.items) {
      switch (section.type) {
        case "summary": {
          const si = item as { content?: string };
          if (si.content) lines.push(`${si.content}\n`);
          break;
        }
        case "experience": {
          const ei = item as {
            title?: string;
            company?: string;
            location?: string;
            startDate?: string;
            endDate?: string;
            description?: string;
            bulletPoints?: string[];
          };
          if (ei.title || ei.company) {
            lines.push(
              `${[ei.title, ei.company].filter(Boolean).join(" at ")}`,
            );
            if (ei.location) lines.push(`  ${ei.location}`);
            lines.push(`  ${ei.startDate || ""} — ${ei.endDate || "Present"}`);
            if (ei.description) lines.push(`  ${ei.description}`);
            if (ei.bulletPoints) {
              for (const bp of ei.bulletPoints) {
                if (bp.trim()) lines.push(`  • ${bp}`);
              }
            }
          }
          break;
        }
        case "education": {
          const ei = item as {
            school?: string;
            degree?: string;
            field?: string;
            startDate?: string;
            endDate?: string;
            gpa?: string;
            description?: string;
          };
          if (ei.school || ei.degree) {
            lines.push(
              `${[ei.degree, ei.field ? `in ${ei.field}` : ""].filter(Boolean).join(" ")} — ${ei.school}`,
            );
            lines.push(`  ${ei.startDate || ""} — ${ei.endDate || "Present"}`);
            if (ei.gpa) lines.push(`  GPA: ${ei.gpa}`);
            if (ei.description) lines.push(`  ${ei.description}`);
          }
          break;
        }
        case "skills": {
          const si = item as { category?: string; skills?: string[] };
          if (si.skills && si.skills.length > 0) {
            lines.push(
              `${si.category ? si.category + ": " : ""}${si.skills.join(", ")}`,
            );
          }
          break;
        }
        case "projects": {
          const pi = item as {
            name?: string;
            url?: string;
            description?: string;
            bulletPoints?: string[];
            technologies?: string[];
          };
          if (pi.name) {
            lines.push(`${pi.name}${pi.url ? ` (${pi.url})` : ""}`);
            if (pi.description) lines.push(`  ${pi.description}`);
            if (pi.bulletPoints) {
              for (const bp of pi.bulletPoints) {
                if (bp.trim()) lines.push(`  • ${bp}`);
              }
            }
            if (pi.technologies && pi.technologies.length > 0) {
              lines.push(`  Tech: ${pi.technologies.join(", ")}`);
            }
          }
          break;
        }
        case "certifications": {
          const ci = item as { name?: string; issuer?: string; date?: string };
          if (ci.name) {
            lines.push(
              `${ci.name}${ci.issuer ? ` — ${ci.issuer}` : ""}${ci.date ? ` (${ci.date})` : ""}`,
            );
          }
          break;
        }
      }
    }
  }

  const text = lines.join("\n");
  const filename = `${resume.title.replace(/\s+/g, "_")}.txt`;

  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
