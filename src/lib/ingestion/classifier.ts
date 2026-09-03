import type { RawJob, ClassificationResult } from "@/lib/types";

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Pre-compiled regexes (built once at module load, not per job)
const CS_PATTERNS = [
  "python", "java", "javascript", "typescript", "react", "node.js",
  "nodejs", "aws", "docker", "kubernetes", "k8s", "sql", "postgresql",
  "postgres", "mongodb", "mongo", "git", "github", "devops", "ci/cd",
  "machine learning", "deep learning", "nlp", "computer vision",
  "llm", "large language model", "generative ai", "genai", "rag",
  "data science", "data engineering", "data analyst",
  "backend", "back end", "frontend", "front end", "full stack",
  "fullstack", "systems design", "system design", "distributed systems",
  "microservices", "api", "rest", "graphql", "terraform", "ansible",
  "linux", "cloud", "gcp", "google cloud", "azure", "spring boot",
  "spring", "django", "flask", "fastapi", "react native", "flutter",
  "swift", "kotlin", "c++", "rust", "go", "golang", "scala", "spark",
  "hadoop", "kafka", "redis", "rabbitmq", "sre", "site reliability",
  "platform engineering", "cybersecurity", "security engineer",
  "qa automation", "testing", "selenium", "playwright", "pytest", "jest",
  "tensorflow", "pytorch", "keras", "scikit-learn", "pandas", "numpy",
  "sde", "swe", "software engineer", "software development",
  "computer science", "algorithms", "data structures", "dsa",
  "oop", "object oriented",
].map((s) => new RegExp(`\\b${escapeRegex(s)}\\b`, "i"));

const NON_CS_PATTERNS = [
  "sales", "marketing", "finance", "accountant", "accounting",
  "hr ", "human resources", "recruiter", "talent acquisition", "payroll",
  "office assistant", "administrative", "administrative assistant",
  "customer support", "customer success", "customer service",
  "business development", "biz dev", "operations manager",
  "legal", "paralegal", "healthcare", "nurse", "doctor", "medical",
  "teacher", "professor", "lecturer", "content writer", "copywriter",
  "graphic designer", "visual designer", "ui designer", "ux designer",
  "mechanical engineer", "civil engineer", "electrical engineer",
  "supply chain", "logistics", "warehouse", "forklift",
  "receptionist", "executive assistant", "personal assistant",
  "quality assurance", "manual testing",
].map((s) => new RegExp(escapeRegex(s), "i"));

const ALLOWED_CATEGORIES = [
  "software engineer", "backend engineer", "frontend engineer",
  "full stack", "fullstack", "data engineer", "data scientist",
  "data science", "machine learning", "ml engineer", "ai engineer",
  "devops engineer", "platform engineer", "cloud engineer",
  "site reliability engineer", "sre", "cybersecurity",
  "security engineer", "qa engineer", "test engineer",
  "automation engineer", "mobile developer", "mobile engineer",
  "ios developer", "android developer", "embedded engineer",
  "embedded software", "systems engineer", "product engineer",
  "infrastructure engineer", "network engineer", "data analyst",
  "business analyst", "research engineer", "research scientist",
  "apprentice", "intern", "internship", "graduate", "trainee",
  "associate software", "associate engineer", "junior software",
  "junior engineer",
  "sde i", "swe i", "software engineer i",
  "graduate engineer", "graduate software engineer",
  "university graduate", "campus graduate",
  "entry software engineer", "entry swe", "entry sde",
  "associate data engineer", "associate data scientist",
];

function scoreText(text: string): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  const lower = text.toLowerCase();

  for (const regex of CS_PATTERNS) {
    if (regex.test(lower)) {
      score += 2;
    }
  }

  for (const regex of NON_CS_PATTERNS) {
    if (regex.test(lower)) {
      score -= 10;
    }
  }

  return { score, reasons };
}

export function classifyJob(job: RawJob): ClassificationResult {
  const text = `${job.title} ${job.description || ""}`;

  const title = job.title.toLowerCase();
  const titleMatch = ALLOWED_CATEGORIES.some((cat) => title.includes(cat));
  const { score, reasons } = scoreText(text);

  const totalScore = score + (titleMatch ? 5 : 0);

  if (totalScore >= 5) {
    let confidence: number;
    if (totalScore >= 15) confidence = 0.95;
    else if (totalScore >= 10) confidence = 0.85;
    else confidence = 0.70;

    return { accepted: true, confidence };
  }

  return {
    accepted: false,
    reason: reasons.length > 0 ? reasons[0] : "Non-CS job classification",
    confidence: 0.20,
  };
}
