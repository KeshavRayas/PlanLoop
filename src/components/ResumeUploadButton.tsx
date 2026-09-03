"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, Loader2, FileText } from "lucide-react";
import type {
  ResumeData,
  ResumeSection,
  ResumeSummaryItem,
  ResumeExperienceItem,
  ResumeEducationItem,
  ResumeSkillsItem,
  ResumeProjectItem,
  ResumeCertificationItem,
  ResumeCustomItem,
} from "@/lib/resume.types";
import { uid } from "@/lib/resume.utils";

type Variant = "icon" | "button";

type ResumeUploadButtonProps = {
  variant?: Variant;
  onUpload?: (data: ResumeData) => void;
};

type ToastState = { message: string; error: boolean } | null;

interface TextItem {
  str: string;
  x: number;
  y: number;
  height: number;
}

function extractLinesFromItems(items: TextItem[]): string[] {
  const Y_TOLERANCE = 3;
  const grouped: { y: number; items: TextItem[] }[] = [];

  for (const item of items) {
    let found = false;
    for (const group of grouped) {
      if (Math.abs(group.y - item.y) <= Y_TOLERANCE) {
        group.items.push(item);
        found = true;
        break;
      }
    }
    if (!found) {
      grouped.push({ y: item.y, items: [item] });
    }
  }

  grouped.sort((a, b) => b.y - a.y);

  const lines: string[] = [];
  for (const group of grouped) {
    group.items.sort((a, b) => a.x - b.x);
    const text = group.items.map((it) => it.str).join("");
    lines.push(text);
  }

  return lines;
}

async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer.slice(0) }).promise;
  let fullText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const rawItems = content.items as { str?: string; transform?: number[]; height?: number }[];
    const items: TextItem[] = rawItems
      .filter((item) => typeof item.str === "string" && Array.isArray(item.transform))
      .map((item) => ({
        str: item.str as string,
        x: (item.transform as number[])[4],
        y: (item.transform as number[])[5],
        height: item.height || 0,
      }));
    const lines = extractLinesFromItems(items);
    fullText += lines.join("\n") + "\n";
  }
  return fullText;
}

const SECTION_PATTERNS: { type: string; patterns: RegExp[] }[] = [
  {
    type: "summary",
    patterns: [
      /^summary$/i, /^professional summary$/i, /^profile$/i,
      /^about me$/i, /^objective$/i, /^career objective$/i,
      /^personal statement$/i, /^qualifications summary$/i,
      /^professional profile$/i,
    ],
  },
  {
    type: "experience",
    patterns: [
      /^experience$/i, /^work experience$/i, /^professional experience$/i,
      /^employment$/i, /^work history$/i, /^relevant experience$/i,
      /^employment history$/i, /^career history$/i, /^work background$/i,
      /^internship experience$/i, /^internships$/i,
    ],
  },
  {
    type: "education",
    patterns: [
      /^education$/i, /^academic background$/i, /^academics$/i,
      /^educational qualification/i, /^academic qualifications$/i,
      /^education and training$/i, /^educational background$/i,
    ],
  },
  {
    type: "skills",
    patterns: [
      /^skills$/i, /^technical skills$/i, /^core skills$/i,
      /^technologies$/i, /^expertise$/i, /^tech stack/i,
      /^technical expertise$/i, /^core competencies$/i,
      /^areas of expertise$/i, /^key skills$/i, /^technical proficiency$/i,
    ],
  },
  {
    type: "projects",
    patterns: [
      /^projects$/i, /^personal projects$/i, /^academic projects$/i,
      /^key projects/i, /^project experience$/i, /^open source$/i,
      /^research$/i, /^research experience$/i,
      /^publications$/i, /^research papers$/i,
    ],
  },
  {
    type: "certifications",
    patterns: [
      /^certifications$/i, /^certificates$/i, /^licenses/i,
      /^accreditations/i, /^licenses & certifications/i,
      /^professional certifications$/i, /^professional development$/i,
      /^courses$/i, /^training$/i, /^honors$/i, /^awards$/i,
      /^honours$/i, /^achievements$/i, /^honors & awards$/i,
      /^awards & honours$/i, /^certifications & courses$/i,
      /^certifications and courses$/i,
    ],
  },
  {
    type: "custom",
    patterns: [
      /^activities$/i, /^interests$/i, /^activities & interests$/i,
      /^activities and interests$/i, /^extracurricular$/i,
      /^extracurricular activities$/i, /^leadership$/i,
      /^leadership experience$/i, /^volunteering$/i,
      /^volunteer experience$/i, /^community service$/i,
      /^relevant coursework$/i, /^coursework$/i,
      /^academic coursework$/i, /^languages$/i,
    ],
  },
];

function detectSectionType(line: string): string | null {
  const trimmed = line.trim().replace(/[:\-–—]+$/, "").trim();
  for (const entry of SECTION_PATTERNS) {
    for (const pat of entry.patterns) {
      if (pat.test(trimmed)) return entry.type;
    }
  }
  return null;
}

function isLikelySectionHeader(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length < 2 || trimmed.length > 50) return false;
  if (trimmed === trimmed.toUpperCase() && /[A-Z]{3,}/.test(trimmed)) return true;
  if (/^(?:Education|Experience|Skills|Projects|Summary|Profile|Certifications|Publications|Leadership|Achievements|Languages|Interests|Technical Skills|Work History|Relevant Coursework|Academic Background|Extracurricular|Volunteering|Awards|Honours|Activities & Interests|Certifications & Courses)$/i.test(trimmed)) return true;
  return false;
}

function parseSections(lines: string[]): { type: string; content: string[] }[] {
  const sections: { type: string; content: string[] }[] = [];
  let currentType = "summary";
  let currentContent: string[] = [];
  let seenFirstHeader = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      currentContent.push(line);
      continue;
    }
    const detected = detectSectionType(trimmed);
    if (detected) {
      seenFirstHeader = true;
      if (currentContent.length > 0) {
        sections.push({ type: currentType, content: currentContent });
      }
      currentType = detected;
      // Include the header line in content for custom sections so buildResumeData
      // can use it as the section title
      currentContent = detected === "custom" ? [trimmed] : [];
    } else if (!seenFirstHeader && isLikelySectionHeader(trimmed)) {
      seenFirstHeader = true;
      if (currentContent.length > 0) {
        sections.push({ type: currentType, content: currentContent });
      }
      currentType = "custom";
      currentContent = [trimmed];
    } else if (seenFirstHeader && isLikelySectionHeader(trimmed)) {
      if (currentContent.length > 0) {
        sections.push({ type: currentType, content: currentContent });
      }
      currentType = "custom";
      currentContent = [trimmed];
    } else {
      currentContent.push(line);
    }
  }
  if (currentContent.length > 0) {
    sections.push({ type: currentType, content: currentContent });
  }
  return sections;
}

function parseSummaryItem(content: string[]): ResumeSummaryItem {
  return {
    id: uid(),
    content: content.map((l) => l.trim()).filter(Boolean).join(" "),
  };
}

function parseExperienceItems(content: string[]): ResumeExperienceItem[] {
  const items: ResumeExperienceItem[] = [];
  let current: Partial<ResumeExperienceItem> = { id: uid() };
  const bulletLines: string[] = [];

  const dateRegex = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}\s*[-–]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}|Present|Current|Now))/i;
  const yearDateRegex = /(\d{4}\s*[-–]\s*(?:\d{4}|Present|Current|Now))/i;

  for (const line of content) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("–") || /^\d+[.)]/.test(trimmed)) {
      bulletLines.push(trimmed.replace(/^[•\-*–]\s*/, "").replace(/^\d+[.)]\s*/, "").trim());
      continue;
    }

    if (dateRegex.test(trimmed) || yearDateRegex.test(trimmed)) {
      if (current.company || current.title) {
        current.bulletPoints = [...bulletLines];
        items.push(current as ResumeExperienceItem);
        bulletLines.length = 0;
      }
      current = { id: uid(), company: "", title: "", location: "", startDate: "", endDate: "", current: false, description: "", bulletPoints: [] };

      const dateMatch = trimmed.match(dateRegex) || trimmed.match(yearDateRegex);
      if (dateMatch) {
        const dates = dateMatch[1].split(/[-–]/).map((d) => d.trim());
        current.startDate = dates[0] || "";
        current.endDate = dates[1] || "";
        if (/present|current|now/i.test(current.endDate)) {
          current.current = true;
          current.endDate = "";
        }
      }
      const remaining = trimmed.replace(dateRegex, "").replace(yearDateRegex, "").replace(/[,|]\s*$/, "").trim();
      if (remaining && !current.title && !current.company) {
        current.title = remaining;
      }
    } else if (!current.title) {
      current.title = trimmed;
    } else if (!current.company) {
      current.company = trimmed;
    } else if (!current.location) {
      current.location = trimmed;
    } else {
      bulletLines.push(trimmed);
    }
  }
  if (current.company || current.title) {
    current.bulletPoints = [...bulletLines];
    items.push(current as ResumeExperienceItem);
  }
  return items.length > 0 ? items : [{
    id: uid(),
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    description: content.filter((l) => l.trim()).join("\n"),
    bulletPoints: [],
  }];
}

function parseEducationItems(content: string[]): ResumeEducationItem[] {
  const items: ResumeEducationItem[] = [];
  let current: Partial<ResumeEducationItem> = { id: uid() };

  const dateRegex = /((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}\s*[-–]\s*(?:(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s*\d{4}|Present|Current|Now|Expected\s+\d{4}))/i;
  const yearDateRegex = /(\d{4}\s*[-–]\s*(?:\d{4}|Present|Current|Now))/i;

  for (const line of content) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (dateRegex.test(trimmed) || yearDateRegex.test(trimmed)) {
      if (current.school) {
        items.push(current as ResumeEducationItem);
      }
      current = { id: uid(), school: "", degree: "", field: "", startDate: "", endDate: "", gpa: "", description: "" };
      const dateMatch = trimmed.match(dateRegex) || trimmed.match(yearDateRegex);
      if (dateMatch) {
        const dates = dateMatch[1].split(/[-–]/).map((d) => d.trim());
        current.startDate = dates[0] || "";
        current.endDate = dates[1] || "";
      }
    } else if (!current.school) {
      current.school = trimmed;
    } else if (!current.degree) {
      const degreeMatch = trimmed.match(/(Bachelor|Master|PhD|B\.\w+|M\.\w+|Ph\.D|Associate|Diploma|Bachelors|Masters)/i);
      if (degreeMatch) {
        current.degree = degreeMatch[1];
        current.field = trimmed.replace(degreeMatch[1], "").replace(/^[,\s]+|[,\s]+$/g, "");
      } else {
        current.school += " " + trimmed;
      }
    } else if (/GPA|grade|gpa/i.test(trimmed)) {
      const gpaMatch = trimmed.match(/([\d.]+)\s*\/?\s*([\d.]+)/);
      current.gpa = gpaMatch ? gpaMatch[0] : trimmed;
    }
  }
  if (current.school) {
    items.push(current as ResumeEducationItem);
  }
  return items.length > 0 ? items : [{
    id: uid(),
    school: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
    gpa: "",
    description: content.filter((l) => l.trim()).join("\n"),
  }];
}

function parseSkillsItems(content: string[]): ResumeSkillsItem[] {
  const allSkills: string[] = [];
  for (const line of content) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[,;|•\-]/).map((s) => s.trim()).filter(Boolean);
    for (const part of parts) {
      const cleaned = part.replace(/^[•\-*–]\s*/, "").trim();
      if (cleaned) allSkills.push(cleaned);
    }
  }
  return [{
    id: uid(),
    category: "General",
    skills: allSkills,
  }];
}

function parseProjectItems(content: string[]): ResumeProjectItem[] {
  const items: ResumeProjectItem[] = [];
  const current: Partial<ResumeProjectItem> = {};
  const bulletLines: string[] = [];
  const techs: string[] = [];

  for (const line of content) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("•") || trimmed.startsWith("-") || trimmed.startsWith("*") || trimmed.startsWith("–") || /^\d+[.)]/.test(trimmed)) {
      bulletLines.push(trimmed.replace(/^[•\-*–]\s*/, "").replace(/^\d+[.)]\s*/, "").trim());
      continue;
    }

    if (!current.name) {
      current.name = trimmed;
      current.id = uid();
      current.description = "";
      current.url = "";
      current.bulletPoints = [];
      current.technologies = [];
    } else if (/^tech/i.test(trimmed) || /^built (with|using)/i.test(trimmed)) {
      const techStr = trimmed.replace(/^tech(?:nologies)?\s*[:;]?\s*/i, "").replace(/^built (with|using)\s*/i, "");
      techs.push(...techStr.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
    } else {
      bulletLines.push(trimmed);
    }
  }
  if (current.name) {
    current.bulletPoints = [...bulletLines];
    current.technologies = [...techs];
    items.push(current as ResumeProjectItem);
  }
  return items.length > 0 ? items : [];
}

function parseCertificationItems(content: string[]): ResumeCertificationItem[] {
  const items: ResumeCertificationItem[] = [];
  for (const line of content) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const parts = trimmed.split(/[,|]/).map((s) => s.trim()).filter(Boolean);
    items.push({
      id: uid(),
      name: parts[0] || trimmed,
      issuer: parts[1] || "",
      date: parts[2] || "",
      url: "",
    });
  }
  return items;
}

function parseCustomItems(content: string[]): ResumeCustomItem[] {
  const headerLine = content[0]?.trim() || "";
  const remaining = content.slice(1).filter((l) => l.trim());
  if (remaining.length === 0) {
    return [{ id: uid(), content: headerLine }];
  }
  return [{
    id: uid(),
    content: remaining.map((l) => l.trim()).filter(Boolean).join("\n"),
  }];
}

function buildResumeData(sections: { type: string; content: string[] }[]): ResumeData {
  const resumeSections: ResumeSection[] = [];

  for (const section of sections) {
    const content = section.content.filter((l) => l.trim());
    if (content.length === 0) continue;

    switch (section.type) {
      case "summary": {
        const item = parseSummaryItem(content);
        if (item.content) {
          resumeSections.push({ id: uid(), type: "summary", title: "Summary", items: [item] });
        }
        break;
      }
      case "experience": {
        const items = parseExperienceItems(content);
        if (items.length > 0) {
          resumeSections.push({ id: uid(), type: "experience", title: "Experience", items });
        }
        break;
      }
      case "education": {
        const items = parseEducationItems(content);
        if (items.length > 0) {
          resumeSections.push({ id: uid(), type: "education", title: "Education", items });
        }
        break;
      }
      case "skills": {
        const items = parseSkillsItems(content);
        if (items.length > 0 && items[0].skills.length > 0) {
          resumeSections.push({ id: uid(), type: "skills", title: "Skills", items });
        }
        break;
      }
      case "projects": {
        const items = parseProjectItems(content);
        if (items.length > 0) {
          resumeSections.push({ id: uid(), type: "projects", title: "Projects", items });
        }
        break;
      }
      case "certifications": {
        const items = parseCertificationItems(content);
        if (items.length > 0) {
          resumeSections.push({ id: uid(), type: "certifications", title: "Certifications", items });
        }
        break;
      }
      case "custom": {
        const header = content[0]?.trim() || "Custom Section";
        const items = parseCustomItems(content);
        resumeSections.push({
          id: uid(),
          type: "custom",
          title: header,
          items,
          customFormat: items[0]?.content.includes("\n") ? "list" : "text",
        });
        break;
      }
    }
  }

  return { sections: resumeSections };
}

function storeUploadedResume(data: ResumeData, name: string) {
  try {
    const raw = localStorage.getItem("uploadedResumes");
    const list: { id: string; name: string; data: ResumeData; createdAt: number }[] = raw ? JSON.parse(raw) : [];
    list.unshift({ id: uid(), name, data, createdAt: Date.now() });
    localStorage.setItem("uploadedResumes", JSON.stringify(list));
  } catch { /* ignore */ }
}

export function ResumeUploadButton({ variant = "icon", onUpload }: ResumeUploadButtonProps) {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastState>(null);
  const [showTextModal, setShowTextModal] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [showNameDialog, setShowNameDialog] = useState(false);
  const [pendingData, setPendingData] = useState<ResumeData | null>(null);
  const [resumeName, setResumeName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const confirmName = useCallback(async () => {
    if (!pendingData || !resumeName.trim()) return;

    // Always save to localStorage
    storeUploadedResume(pendingData, resumeName.trim());

    if (onUpload) {
      // Editor context — just pass data, editor handles DB save
      onUpload(pendingData);
      setShowNameDialog(false);
      setPendingData(null);
      setToast({ message: "Resume loaded into editor", error: false });
      setTimeout(() => setToast(null), 3000);
      return;
    }

    // Resumes page context — save to DB so it appears on the list
    try {
      const skills: string[] = [];
      for (const section of pendingData.sections) {
        if (section.type === "skills") {
          for (const item of section.items) {
            const sk = item as { skills: string[] };
            if (sk.skills) skills.push(...sk.skills.filter((s) => s.trim()));
          }
        }
      }
      const res = await fetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: resumeName.trim(), content: pendingData, skills }),
      });
      if (res.ok) {
        const created = await res.json();
        setShowNameDialog(false);
        setPendingData(null);
        setToast({ message: "Resume saved", error: false });
        setTimeout(() => setToast(null), 3000);
        // Navigate to the edit page for the newly created resume
        window.location.href = `/resumes/${created.id}`;
      } else {
        setToast({ message: "Failed to save resume", error: true });
        setTimeout(() => setToast(null), 3000);
      }
    } catch {
      setToast({ message: "Failed to save resume", error: true });
      setTimeout(() => setToast(null), 3000);
    }
  }, [pendingData, resumeName, onUpload]);

  const processContent = useCallback((text: string, defaultName: string, originalContent?: string, originalFormat?: "pdf" | "tex" | "text") => {
    const lines = text.split("\n");
    const parsed = parseSections(lines);
    const resumeData = buildResumeData(parsed);
    if (originalContent) {
      resumeData.originalContent = originalContent;
      resumeData.originalFormat = originalFormat;
    }
    setPendingData(resumeData);
    setResumeName(defaultName);
    setShowNameDialog(true);
  }, []);

  const handleFile = useCallback(async (file: File) => {
    const isPDF = file.type.includes("pdf") || file.name.endsWith(".pdf");
    const isTeX = file.name.endsWith(".tex");

    if (!isPDF && !isTeX) {
      setToast({ message: "Please select a PDF or .tex file", error: true });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setLoading(true);
    try {
      const baseName = file.name.replace(/\.(pdf|tex)$/i, "");
      if (isTeX) {
        // LaTeX files: store raw content without parsing
        const raw = await file.text();
        const resumeData: ResumeData = {
          sections: [],
          originalContent: raw,
          originalFormat: "tex",
        };
        setPendingData(resumeData);
        setResumeName(baseName);
        setShowNameDialog(true);
      } else {
        const text = await extractTextFromPDF(file);
        // Store original PDF as base64 for round-trip download
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        let binary = "";
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        processContent(text, baseName, base64, "pdf");
      }
    } catch (err) {
      console.error("[Upload] Failed:", err);
      setToast({ message: "Failed to parse file", error: true });
      setTimeout(() => setToast(null), 3000);
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [processContent]);

  const handleClick = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handlePasteSubmit = useCallback(() => {
    if (!pasteText.trim()) {
      setToast({ message: "Paste some text first", error: true });
      setTimeout(() => setToast(null), 3000);
      return;
    }
    setShowTextModal(false);
    processContent(pasteText, "My Resume", pasteText, "text");
    setPasteText("");
  }, [pasteText, processContent]);

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.tex"
        className="hidden"
        onChange={handleChange}
      />
      {variant === "icon" ? (
        <div className="flex items-center gap-1">
          <button
            onClick={handleClick}
            disabled={loading}
            className="w-10 h-10 rounded-full border-3 border-black flex items-center justify-center hover:bg-black hover:text-white transition-[150ms] disabled:opacity-50 disabled:cursor-not-allowed"
            title="Upload PDF or .tex"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
          </button>
          <button
            onClick={() => setShowTextModal(true)}
            className="text-label font-bold text-text-secondary hover:text-black transition-[150ms] px-1"
            title="Paste resume text"
          >
            <FileText className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={handleClick}
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-green text-black font-extrabold px-6 py-2.5 rounded-full border-3 border-black brutal-shadow-sm brutal-hover text-label uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            Upload
          </button>
          <button
            onClick={() => setShowTextModal(true)}
            className="text-label font-bold text-text-secondary hover:text-black underline underline-offset-4 transition-[150ms]"
          >
            or paste text
          </button>
        </div>
      )}

      {showTextModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border-4 border-black rounded-[24px] brutal-shadow-lg p-6 w-full max-w-2xl mx-4">
            <h3 className="text-title font-extrabold mb-4">Paste Resume Text</h3>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="Paste your resume content here... (sections will be detected automatically)"
              rows={12}
              className="w-full border-3 border-black rounded-[12px] px-4 py-3 text-body font-medium bg-surface placeholder:text-text-secondary outline-none resize-y"
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowTextModal(false); setPasteText(""); }}
                className="px-5 py-2.5 rounded-full border-3 border-black text-label font-extrabold uppercase tracking-widest hover:bg-black hover:text-white transition-[150ms]"
              >
                Cancel
              </button>
              <button
                onClick={handlePasteSubmit}
                className="px-5 py-2.5 rounded-full border-3 border-black bg-green text-label font-extrabold uppercase tracking-widest brutal-shadow-sm hover:opacity-90 transition-[150ms]"
              >
                Parse
              </button>
            </div>
          </div>
        </div>
      )}

      {showNameDialog && pendingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border-4 border-black rounded-[24px] brutal-shadow-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-title font-extrabold mb-2">Name Your Resume</h3>
            <p className="text-body font-medium text-text-secondary mb-4">
              This resume will be saved and available when creating a new resume.
            </p>
            <input
              type="text"
              value={resumeName}
              onChange={(e) => setResumeName(e.target.value)}
              placeholder="Resume name"
              className="w-full border-3 border-black rounded-[12px] px-4 py-3 text-body font-medium bg-surface placeholder:text-text-secondary outline-none"
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter") confirmName(); }}
            />
            <div className="flex items-center justify-end gap-3 mt-4">
              <button
                onClick={() => { setShowNameDialog(false); setPendingData(null); }}
                className="px-5 py-2.5 rounded-full border-3 border-black text-label font-extrabold uppercase tracking-widest hover:bg-black hover:text-white transition-[150ms]"
              >
                Discard
              </button>
              <button
                onClick={confirmName}
                disabled={!resumeName.trim()}
                className="px-5 py-2.5 rounded-full border-3 border-black bg-green text-label font-extrabold uppercase tracking-widest brutal-shadow-sm hover:opacity-90 transition-[150ms] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Save Resume
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface border-3 border-black rounded-[14px] brutal-shadow-sm px-5 py-3 flex items-center gap-2 text-label font-extrabold uppercase tracking-widest animate-fade-in">
          <span className={toast.error ? "text-red" : "text-green"}>
            {toast.error ? "✗" : "✓"}
          </span>
          {toast.message}
        </div>
      )}
    </>
  );
}
