import type {
  ResumeSection,
  ResumeData,
  ResumeSectionItem,
  ResumeExperienceItem,
  ResumeEducationItem,
  ResumeProjectItem,
  ResumeCertificationItem,
  ResumeSummaryItem,
  ResumeSkillsItem,
  ResumeCustomItem,
  CustomSectionFormat,
} from "./resume.types";

let _counter = 0;
export function uid(): string {
  _counter++;
  return `rs_${_counter}_${Date.now()}`;
}

function emptyExpItem(): ResumeExperienceItem {
  return {
    id: uid(),
    company: "",
    title: "",
    location: "",
    startDate: "",
    endDate: "",
    current: false,
    description: "",
    bulletPoints: [""],
  };
}

function emptyEduItem(): ResumeEducationItem {
  return {
    id: uid(),
    school: "",
    degree: "",
    field: "",
    startDate: "",
    endDate: "",
    gpa: "",
    description: "",
  };
}

function emptyProjectItem(): ResumeProjectItem {
  return {
    id: uid(),
    name: "",
    url: "",
    description: "",
    bulletPoints: [""],
    technologies: [],
  };
}

function emptyCertItem(): ResumeCertificationItem {
  return {
    id: uid(),
    name: "",
    issuer: "",
    date: "",
    url: "",
  };
}

function emptySummaryItem(): ResumeSummaryItem {
  return { id: uid(), content: "" };
}

function emptySkillsItem(): ResumeSkillsItem {
  return { id: uid(), category: "General", skills: [] };
}

function emptyCustomItem(): ResumeCustomItem {
  return { id: uid(), content: "" };
}

const sectionBlueprints: Record<string, () => ResumeSection> = {
  summary: () => ({
    id: uid(),
    type: "summary",
    title: "Summary",
    items: [emptySummaryItem()],
  }),
  experience: () => ({
    id: uid(),
    type: "experience",
    title: "Experience",
    items: [emptyExpItem()],
  }),
  education: () => ({
    id: uid(),
    type: "education",
    title: "Education",
    items: [emptyEduItem()],
  }),
  skills: () => ({
    id: uid(),
    type: "skills",
    title: "Skills",
    items: [emptySkillsItem()],
  }),
  projects: () => ({
    id: uid(),
    type: "projects",
    title: "Projects",
    items: [emptyProjectItem()],
  }),
  certifications: () => ({
    id: uid(),
    type: "certifications",
    title: "Certifications",
    items: [emptyCertItem()],
  }),
  "custom-text": () => ({
    id: uid(),
    type: "custom",
    title: "Custom Section",
    items: [emptyCustomItem()],
    customFormat: "text",
  }),
  "custom-list": () => ({
    id: uid(),
    type: "custom",
    title: "Custom Section",
    items: [emptyCustomItem()],
    customFormat: "list",
  }),
};

export function createSection(
  type: string,
  customTitle?: string,
  customFormat?: CustomSectionFormat,
): ResumeSection {
  if (type === "custom") {
    const key = customFormat === "list" ? "custom-list" : "custom-text";
    const section = sectionBlueprints[key]();
    if (customTitle) section.title = customTitle;
    return section;
  }
  const blueprint = sectionBlueprints[type];
  if (blueprint) return blueprint();
  return sectionBlueprints.summary();
}

export function addItemToSection(section: ResumeSection): ResumeSection {
  const itemMap: Record<string, () => ResumeSectionItem> = {
    summary: emptySummaryItem,
    experience: emptyExpItem,
    education: emptyEduItem,
    skills: emptySkillsItem,
    projects: emptyProjectItem,
    certifications: emptyCertItem,
    custom: emptyCustomItem,
  };
  const factory = itemMap[section.type];
  if (!factory) return section;
  return { ...section, items: [...section.items, factory()] };
}

export function removeItemFromSection(
  section: ResumeSection,
  itemId: string,
): ResumeSection {
  return {
    ...section,
    items: section.items.filter((i) => i.id !== itemId),
  };
}

export function updateItemInSection<T extends ResumeSection>(
  section: T,
  itemId: string,
  patch: Partial<ResumeSectionItem>,
): T {
  return {
    ...section,
    items: section.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)),
  } as T;
}

export const SECTION_LABELS: Record<string, string> = {
  summary: "Summary",
  experience: "Experience",
  education: "Education",
  skills: "Skills",
  projects: "Projects",
  certifications: "Certifications",
  custom: "Custom",
};

export const SECTION_ORDER = [
  "summary",
  "experience",
  "education",
  "skills",
  "projects",
  "certifications",
];

export function defaultResumeData(): ResumeData {
  return { sections: [] };
}

/** True when the resume has at least one item in any section. */
export function hasResumeContent(data: ResumeData | null | undefined): boolean {
  if (!data) return false;
  return (data.sections ?? []).some((s) => (s.items ?? []).length > 0);
}

export function extractSkills(data: ResumeData): string[] {
  const skillSet = new Set<string>();
  for (const section of data.sections) {
    if (section.type === "skills") {
      for (const item of section.items) {
        const skillsItem = item as ResumeSkillsItem;
        for (const skill of skillsItem.skills) {
          if (skill.trim()) skillSet.add(skill.trim());
        }
      }
    }
  }
  return Array.from(skillSet);
}
