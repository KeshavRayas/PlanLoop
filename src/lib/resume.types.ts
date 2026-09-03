export type ResumeSectionType =
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "certifications"
  | "custom";

export type CustomSectionFormat = "text" | "list";

export interface ResumeSummaryItem {
  id: string;
  content: string;
}

export interface ResumeExperienceItem {
  id: string;
  company: string;
  title: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  bulletPoints: string[];
}

export interface ResumeEducationItem {
  id: string;
  school: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa: string;
  description: string;
}

export interface ResumeSkillsItem {
  id: string;
  category: string;
  skills: string[];
}

export interface ResumeProjectItem {
  id: string;
  name: string;
  url: string;
  description: string;
  bulletPoints: string[];
  technologies: string[];
}

export interface ResumeCertificationItem {
  id: string;
  name: string;
  issuer: string;
  date: string;
  url: string;
}

export interface ResumeCustomItem {
  id: string;
  content: string;
}

export type ResumeSectionItem =
  | ResumeSummaryItem
  | ResumeExperienceItem
  | ResumeEducationItem
  | ResumeSkillsItem
  | ResumeProjectItem
  | ResumeCertificationItem
  | ResumeCustomItem;

export interface ResumeSection {
  id: string;
  type: ResumeSectionType;
  title: string;
  items: ResumeSectionItem[];
  customFormat?: CustomSectionFormat;
}

export interface ResumeData {
  sections: ResumeSection[];
  originalContent?: string;
  originalFormat?: "pdf" | "tex" | "text";
}

export interface ResumeListItem {
  id: string;
  title: string;
  skills: string[];
  createdAt: string;
  updatedAt: string;
}

export type CreateResumeInput = {
  title?: string;
  content: ResumeData;
  skills?: string[];
  jobId?: string;
};

export type UpdateResumeInput = {
  title?: string;
  content?: ResumeData;
  skills?: string[];
};
