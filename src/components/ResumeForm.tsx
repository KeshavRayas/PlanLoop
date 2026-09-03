"use client";

import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from "react";
import type { ResumeData, ResumeSection, CustomSectionFormat } from "@/lib/resume.types";
import {
  createSection,
  SECTION_LABELS,
  SECTION_ORDER,
  uid,
} from "@/lib/resume.utils";
import { ResumeSectionEditor } from "./ResumeSectionEditor";
import {
  Save,
  Download,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  Loader2,
  FileText,
  X,
  Briefcase,
} from "lucide-react";
import { ResumeUploadButton } from "./ResumeUploadButton";
import Link from "next/link";

type ResumeFormProps = {
  resumeId?: string;
  initialData: ResumeData;
  initialTitle: string;
};

let _cachedRawResumes: string | null = null;
let _cachedResumes: { id: string; name: string; data: ResumeData }[] = [];

function getResumesSnapshot() {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem("uploadedResumes");
  if (raw === _cachedRawResumes) return _cachedResumes;
  _cachedRawResumes = raw;
  try {
    _cachedResumes = raw ? JSON.parse(raw) : [];
  } catch { _cachedResumes = []; }
  return _cachedResumes;
}

function ensureItemIds(data: ResumeData): ResumeData {
  return {
    ...data,
    sections: data.sections.map((s) => ({
      ...s,
      items: s.items.map((item) => (item.id ? item : { ...item, id: uid() })),
    })),
  };
}

export function ResumeForm({
  resumeId,
  initialData,
  initialTitle,
}: ResumeFormProps) {
  const [title, setTitle] = useState(initialTitle);
  const [data, setData] = useState<ResumeData>(() => ensureItemIds(initialData));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showSectionMenu, setShowSectionMenu] = useState(false);
  const [showSwitchMenu, setShowSwitchMenu] = useState(false);

  const uploadedResumes = useSyncExternalStore(
    (cb) => { window.addEventListener("storage", cb); return () => window.removeEventListener("storage", cb); },
    getResumesSnapshot,
    () => [],
  );
  const [showCustomDialog, setShowCustomDialog] = useState(false);
  const [customSectionName, setCustomSectionName] = useState("");
  const [customSectionFormat, setCustomSectionFormat] = useState<CustomSectionFormat>("text");
  const dataRef = useRef(data);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const currentIdRef = useRef(resumeId);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      const currentData = dataRef.current;
      const skills: string[] = [];
      for (const section of currentData.sections) {
        if (section.type === "skills") {
          for (const item of section.items) {
            const sk = item as { skills: string[] };
            if (sk.skills) skills.push(...sk.skills.filter((s) => s.trim()));
          }
        }
      }

      const id = currentIdRef.current;
      if (!id) {
        const res = await fetch("/api/resumes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content: currentData, skills }),
        });
        if (res.ok) {
          const created = await res.json();
          currentIdRef.current = created.id;
          window.history.replaceState(null, "", `/resumes/${created.id}`);
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      } else {
        const res = await fetch(`/api/resumes/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content: currentData, skills }),
        });
        if (res.ok) {
          setSaved(true);
          setTimeout(() => setSaved(false), 2000);
        }
      }
    } catch {
      /* ignore */
    } finally {
      setSaving(false);
    }
  }, [title]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const scheduleSave = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => save(), 500);
  }, [save]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  function updateSection(sectionId: string, updated: ResumeSection) {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.map((s) =>
        s.id === sectionId ? updated : s
      ),
    }));
    scheduleSave();
  }

  function removeSection(sectionId: string) {
    setData((prev) => ({
      ...prev,
      sections: prev.sections.filter((s) => s.id !== sectionId),
    }));
    scheduleSave();
  }

  function addSection(type: string, customTitle?: string, customFormat?: CustomSectionFormat) {
    const newSection = createSection(type, customTitle, customFormat);
    setData((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
    setShowSectionMenu(false);
  }

  function switchResume(r: { name: string; data: ResumeData }) {
    setTitle(r.name);
    setData(ensureItemIds(r.data));
    setShowSwitchMenu(false);
  }

  function handleAddCustom() {
    if (!customSectionName.trim()) return;
    addSection("custom", customSectionName.trim(), customSectionFormat);
    setShowCustomDialog(false);
    setCustomSectionName("");
    setCustomSectionFormat("text");
  }

  function moveSection(index: number, direction: -1 | 1) {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= data.sections.length) return;
    setData((prev) => {
      const sections = [...prev.sections];
      [sections[index], sections[newIndex]] = [
        sections[newIndex],
        sections[index],
      ];
      return { ...prev, sections };
    });
  }

  async function handleDownload() {
    // If original LaTeX content exists, download as .tex (preserves original format)
    if (data.originalFormat === "tex" && data.originalContent) {
      const blob = new Blob([data.originalContent], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.tex`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    // If original PDF content exists, download the original PDF
    if (data.originalFormat === "pdf" && data.originalContent) {
      const binary = atob(data.originalContent);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/\s+/g, "_")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }
    // Fallback: generate PDF from parsed data
    const { pdf } = await import("@react-pdf/renderer");
    const { ResumePDF } = await import("./ResumePDF");
    const blob = await pdf(<ResumePDF data={data} title={title} />).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const availableTypes = SECTION_ORDER.filter(
    (t) => !data.sections.find((s) => s.type === t)
  );

  return (
    <div className="h-full flex flex-col bg-surface">
      <div className="bg-yellow border-b-4 border-black px-6 py-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="w-9 h-9 rounded-full bg-black flex items-center justify-center shrink-0 hover:opacity-90 transition-[150ms]"
          >
            <Briefcase className="w-4 h-4 text-yellow" />
          </Link>
          <Link
            href="/resumes"
            className="px-3 py-1.5 rounded-full border-2 border-black text-label font-bold hover:bg-black hover:text-white transition-[150ms] flex items-center gap-1"
          >
            <FileText className="w-3.5 h-3.5" />
            Resumes
          </Link>
          <input
            type="text"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              scheduleSave();
            }}
            className="bg-transparent text-title font-extrabold border-none outline-none w-64 placeholder:text-text-secondary"
            placeholder="Resume Title"
          />
          {uploadedResumes.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowSwitchMenu(!showSwitchMenu)}
                className="px-3 py-1.5 rounded-full border-2 border-black text-label font-bold hover:bg-black hover:text-white transition-[150ms] flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                Switch
                <ChevronDown className="w-3 h-3" />
              </button>
              {showSwitchMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSwitchMenu(false)} />
                  <div className="absolute left-0 top-full mt-2 z-20 bg-surface border-3 border-black rounded-[14px] brutal-shadow-sm overflow-hidden min-w-[200px]">
                    {uploadedResumes.map((r) => (
                      <button
                        key={r.id}
                        onClick={() => switchResume(r)}
                        className="w-full px-4 py-2.5 text-left text-body font-bold hover:bg-yellow transition-[150ms] border-b-2 border-black/10 last:border-b-0 truncate"
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
        <span className="text-label font-bold text-text-secondary">
          {data.sections.length} section{data.sections.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-4">
        {data.sections.length === 0 && (
          <div className="py-16 text-center">
            <p className="text-body font-medium text-text-secondary mb-4">
              No sections yet. Add your first section below.
            </p>
          </div>
        )}

        {data.sections.map((section, index) => (
          <SectionCard
            key={section.id}
            section={section}
            index={index}
            total={data.sections.length}
            onUpdate={(updated) => updateSection(section.id, updated)}
            onRemove={() => removeSection(section.id)}
            onMoveUp={() => moveSection(index, -1)}
            onMoveDown={() => moveSection(index, 1)}
          />
        ))}

        <div className="relative">
          <button
            onClick={() => setShowSectionMenu(!showSectionMenu)}
            disabled={availableTypes.length === 0}
            className="w-full flex items-center justify-center gap-2 border-3 border-dashed border-black rounded-full px-5 py-3 text-label font-extrabold uppercase tracking-widest hover:bg-black hover:text-white hover:border-solid transition-[150ms] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            Add Section
          </button>

          {showSectionMenu && (
            <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-surface border-3 border-black rounded-[14px] brutal-shadow-sm overflow-hidden z-20 min-w-[200px]">
              {availableTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => addSection(type)}
                  className="w-full px-4 py-2.5 text-left text-body font-bold hover:bg-yellow transition-[150ms] flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {SECTION_LABELS[type] || type}
                </button>
              ))}
              <div className="border-t-3 border-black" />
              <button
                onClick={() => { setShowSectionMenu(false); setShowCustomDialog(true); setCustomSectionName(""); setCustomSectionFormat("text"); }}
                className="w-full px-4 py-2.5 text-left text-body font-bold hover:bg-yellow transition-[150ms] flex items-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" />
                Custom Section...
              </button>
            </div>
          )}
        </div>
      </div>

      {showCustomDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-surface border-4 border-black rounded-[24px] brutal-shadow-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-title font-extrabold">New Custom Section</h3>
              <button
                onClick={() => setShowCustomDialog(false)}
                className="w-8 h-8 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-[150ms]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <label className="block mb-2">
              <span className="text-label font-bold mb-1 block">Section Name</span>
              <input
                type="text"
                value={customSectionName}
                onChange={(e) => setCustomSectionName(e.target.value)}
                placeholder="e.g. Publications, Awards, Languages"
                className="w-full border-3 border-black rounded-[12px] px-3 py-2 text-body font-medium bg-surface placeholder:text-text-secondary outline-none"
                autoFocus
              />
            </label>
            <label className="block mb-4">
              <span className="text-label font-bold mb-1 block">Format</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCustomSectionFormat("text")}
                  className={`flex-1 px-4 py-2 rounded-full border-2 text-label font-bold transition-[150ms] ${
                    customSectionFormat === "text"
                      ? "bg-black text-white border-black"
                      : "border-black text-black hover:bg-black hover:text-white"
                  }`}
                >
                  Text block
                </button>
                <button
                  onClick={() => setCustomSectionFormat("list")}
                  className={`flex-1 px-4 py-2 rounded-full border-2 text-label font-bold transition-[150ms] ${
                    customSectionFormat === "list"
                      ? "bg-black text-white border-black"
                      : "border-black text-black hover:bg-black hover:text-white"
                  }`}
                >
                  List
                </button>
              </div>
            </label>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowCustomDialog(false)}
                className="px-5 py-2.5 rounded-full border-3 border-black text-label font-extrabold uppercase tracking-widest hover:bg-black hover:text-white transition-[150ms]"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCustom}
                disabled={!customSectionName.trim()}
                className="px-5 py-2.5 rounded-full border-3 border-black bg-green text-label font-extrabold uppercase tracking-widest brutal-shadow-sm hover:opacity-90 transition-[150ms] disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Add Section
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="shrink-0 border-t-4 border-black px-6 py-4 flex items-center gap-3">
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center justify-center gap-2 bg-black text-white font-extrabold px-6 py-2.5 rounded-full border-3 border-black text-label uppercase tracking-widest hover:opacity-90 transition-[150ms] disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? "Saving..." : saved ? "Saved" : "Save"}
        </button>
        <button
          onClick={handleDownload}
          className="flex items-center justify-center gap-2 bg-green text-black font-extrabold px-6 py-2.5 rounded-full border-3 border-black brutal-shadow-sm brutal-hover text-label uppercase tracking-widest"
        >
          <Download className="w-4 h-4" />
          Download
        </button>
        <div className="ml-auto">
          <ResumeUploadButton variant="button" onUpload={(parsed) => setData(parsed)} />
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  section,
  index,
  total,
  onUpdate,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  section: ResumeSection;
  index: number;
  total: number;
  onUpdate: (section: ResumeSection) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(() => section.title);
  const isCustom = section.type === "custom";

  return (
    <div className="border-3 border-black rounded-[16px] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 bg-surface-secondary border-b-3 border-black">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-[150ms] shrink-0"
          >
            {collapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
          {editingTitle ? (
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              onBlur={() => {
                onUpdate({ ...section, title: titleDraft });
                setEditingTitle(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  onUpdate({ ...section, title: titleDraft });
                  setEditingTitle(false);
                }
                if (e.key === "Escape") {
                  setTitleDraft(section.title);
                  setEditingTitle(false);
                }
              }}
              className="text-title font-extrabold bg-transparent border-b-2 border-black outline-none min-w-[100px]"
              autoFocus
            />
          ) : (
            <span
              className="text-title font-extrabold truncate cursor-pointer"
              onDoubleClick={() => isCustom && setEditingTitle(true)}
              title={isCustom ? "Double-click to rename" : undefined}
            >
              {SECTION_LABELS[section.type] || section.title}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onMoveUp}
            disabled={index === 0}
            className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-[150ms] disabled:opacity-30 disabled:cursor-not-allowed text-label font-bold"
          >
            ↑
          </button>
          <button
            onClick={onMoveDown}
            disabled={index === total - 1}
            className="w-7 h-7 rounded-full border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-[150ms] disabled:opacity-30 disabled:cursor-not-allowed text-label font-bold"
          >
            ↓
          </button>
          <button
            onClick={onRemove}
            className="w-7 h-7 rounded-full border-2 border-red flex items-center justify-center text-red hover:bg-red hover:text-white transition-[150ms]"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      {!collapsed && (
        <div className="p-4 space-y-3">
          <ResumeSectionEditor
            section={section}
            onChange={onUpdate}
          />
        </div>
      )}
    </div>
  );
}


