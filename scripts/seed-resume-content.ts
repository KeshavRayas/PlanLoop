import { prisma } from "@/lib/prisma";
import type { ResumeData } from "@/lib/resume.types";

// Verbatim transcription of C:\Users\kesha\Downloads\ResumeLatex.tex into
// structured ResumeData. Text only — LaTeX markup stripped, words unchanged.
// Stable item IDs double as the tailor evidence set (Phase 2.2 provenance).

const CONTENT: ResumeData = {
  originalFormat: "tex",
  sections: [
    {
      id: "sec_summary",
      type: "summary",
      title: "Summary",
      items: [
        {
          id: "summary_01",
          content:
            "Computer Science undergraduate with hands-on experience building backend and infrastructure-oriented systems using TypeScript, Python, Go, PostgreSQL, Redis, Docker, and Git. Strong foundations in Data Structures & Algorithms, OOP, operating systems, databases, and problem solving. Experienced in debugging APIs, optimizing database-backed services, implementing authentication and access control, and contributing to large multi-developer codebases. Interested in software engineering, distributed systems, cloud infrastructure, SRE, and systems development.",
        },
      ],
    },
    {
      id: "sec_education",
      type: "education",
      title: "Education",
      items: [
        {
          id: "edu_bms",
          school: "B.M.S. College of Engineering",
          degree: "B.E.",
          field: "Computer Science and Engineering",
          startDate: "",
          endDate: "Expected 2026",
          gpa: "8.1/10",
          description: "",
        },
        {
          id: "edu_rv",
          school: "R.V. Pre-University College",
          degree: "Pre-University Course (PUC)",
          field: "",
          startDate: "",
          endDate: "2022",
          gpa: "92.8%",
          description: "",
        },
        {
          id: "edu_kumaran",
          school: "Sri Kumaran Children's Home (State Board)",
          degree: "High School Diploma",
          field: "",
          startDate: "",
          endDate: "2020",
          gpa: "91.8%",
          description: "",
        },
      ],
    },
    {
      id: "sec_experience",
      type: "experience",
      title: "Experience",
      items: [
        {
          id: "exp_erp",
          company: "B.M.S. College of Engineering, Bengaluru",
          title: "Software Intern — ERP System Development",
          location: "Bengaluru",
          startDate: "Feb 2026",
          endDate: "Present",
          current: true,
          description: "",
          bulletPoints: [
            "bullet_erp_01: Develop and maintain a scalable campus ERP platform using TypeScript, PostgreSQL, Prisma, Redis, and a modular monorepo architecture supporting student, faculty, academic, and administrative workflows.",
            "bullet_erp_02: Build and debug backend APIs, authentication workflows, role-based access control, attendance systems, and data-driven application modules with emphasis on reliability and maintainability.",
            "bullet_erp_03: Work extensively with Linux-based development environments, Git-based collaboration, package/workspace management, and Docker-oriented development and deployment workflows.",
            "bullet_erp_04: Diagnose production and integration issues by tracing API behavior, database queries, application logs, and cross-module dependencies across a multi-developer codebase.",
            "bullet_erp_05: Design and optimize database queries, schemas, and application logic to improve correctness, performance, and scalability of PostgreSQL-backed services.",
            "bullet_erp_06: Contribute to automated testing and engineering workflows using Playwright, ESLint, Prettier, TypeScript tooling, and CI-oriented development practices.",
          ],
        },
      ],
    },
    {
      id: "sec_projects",
      type: "projects",
      title: "Projects",
      items: [
        {
          id: "proj_rl",
          name: "RL for Energy Grid Optimization",
          url: "",
          description: "",
          bulletPoints: [
            "bullet_rl_01: Developed a deep reinforcement learning framework for renewable energy dispatch, battery control, and supply-demand balancing using real-world solar, wind, and load datasets.",
            "bullet_rl_02: Built a custom Gymnasium environment and evaluated PPO, DQN, and multi-agent approaches for decision making under dynamic system constraints.",
          ],
          technologies: ["Python", "PyTorch", "Stable-Baselines3", "Gymnasium"],
        },
        {
          id: "proj_signbridge",
          name: "SignBridge: Real-Time Sign Language Recognition",
          url: "",
          description: "",
          bulletPoints: [
            "bullet_sb_01: Developed a real-time sign language recognition system using WebSockets and a GAT + Transformer model for low-latency prediction and sentence generation.",
            "bullet_sb_02: Designed a Docker-based monorepo separating frontend, backend, training, and inference components, with reusable APIs and real-time communication between services.",
          ],
          technologies: ["Next.js", "FastAPI", "PyTorch", "MediaPipe"],
        },
        {
          id: "proj_weather",
          name: "Weather Analysis and Prediction using ML",
          url: "",
          description: "",
          bulletPoints: [
            "bullet_wx_01: Built an end-to-end time-series forecasting system using LSTM, ARIMA, and SARIMA for temperature, precipitation, daylight duration, and wind-speed prediction.",
            "bullet_wx_02: Implemented data preprocessing, model evaluation, forecasting pipelines, and comparative visualization of model performance.",
          ],
          technologies: ["Python", "TensorFlow", "Scikit-learn", "Streamlit"],
        },
      ],
    },
    {
      id: "sec_skills",
      type: "skills",
      title: "Skills",
      items: [
        {
          id: "skills_languages",
          category: "Languages",
          skills: [
            "Python",
            "Go",
            "TypeScript",
            "SQL",
            "JavaScript",
            "HTML",
            "CSS",
          ],
        },
        {
          id: "skills_core",
          category: "Core CS",
          skills: [
            "Data Structures",
            "Algorithms",
            "OOP",
            "Operating Systems",
            "Computer Networks",
            "RDBMS",
            "Database Design",
            "Distributed Systems",
          ],
        },
        {
          id: "skills_backend",
          category: "Backend",
          skills: [
            "REST",
            "Authentication",
            "RBAC",
            "PostgreSQL",
            "Prisma",
            "Redis",
            "WebSockets",
          ],
        },
        {
          id: "skills_cloud",
          category: "Cloud / Infrastructure",
          skills: [
            "AWS",
            "Linux",
            "Docker",
            "CI/CD",
            "Monitoring",
            "Debugging",
            "Infrastructure Automation",
          ],
        },
        {
          id: "skills_tools",
          category: "Developer Tools",
          skills: [
            "Git",
            "GitHub",
            "Playwright",
            "Turborepo",
            "Bun",
            "ESLint",
            "Prettier",
          ],
        },
        {
          id: "skills_libs",
          category: "Libraries / Frameworks",
          skills: [
            "FastAPI",
            "Next.js",
            "PyTorch",
            "TensorFlow",
            "Scikit-learn",
            "Pandas",
            "NumPy",
          ],
        },
      ],
    },
  ],
};

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
  const existing = await prisma.resume.findFirst({
    orderBy: { updatedAt: "desc" },
  });
  if (!existing) throw new Error("no resume row found");
  const updated = await prisma.resume.update({
    where: { id: existing.id },
    data: {
      title: "Keshav Rayas — Base Resume",
      content: CONTENT as object,
      skills: SKILLS,
    },
  });
  const sections = (updated.content as unknown as ResumeData).sections ?? [];
  console.log(
    JSON.stringify({
      id: updated.id,
      title: updated.title,
      skills: updated.skills.length,
      sections: sections.map((s) => `${s.type}:${s.items.length}`),
    }),
  );
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
