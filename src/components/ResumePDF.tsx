"use client";

import { Document, Page, View, Text, StyleSheet } from "@react-pdf/renderer";
import type { ResumeData, ResumeSection } from "@/lib/resume.types";

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.4,
    color: "#000",
  },
  title: {
    fontSize: 22,
    fontFamily: "Helvetica-Bold",
    textAlign: "center",
    marginBottom: 4,
  },
  divider: {
    borderBottomWidth: 2,
    borderBottomColor: "#000",
    marginVertical: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  sectionDivider: {
    borderBottomWidth: 1,
    borderBottomColor: "#000",
    marginBottom: 8,
  },
  itemBlock: {
    marginBottom: 10,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
  itemTitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
  },
  itemSubtitle: {
    fontSize: 11,
    fontFamily: "Helvetica-Oblique",
  },
  itemDate: {
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#444",
  },
  itemDetail: {
    fontSize: 10,
    marginTop: 2,
    color: "#333",
  },
  bulletList: {
    marginTop: 2,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 1,
  },
  bulletPoint: {
    width: 12,
    fontSize: 10,
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
  },
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 2,
  },
  skillChip: {
    fontSize: 10,
    marginRight: 8,
    marginBottom: 2,
  },
  summaryText: {
    fontSize: 10,
    color: "#333",
    lineHeight: 1.5,
  },
});

export function ResumePDF({ data, title }: { data: ResumeData; title: string }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.divider} />

        {data.sections.map((section) => (
          <View key={section.id} style={{ marginBottom: 14 }}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionDivider} />
            <RenderSection section={section} />
          </View>
        ))}
      </Page>
    </Document>
  );
}

function RenderSection({ section }: { section: ResumeSection }) {
  switch (section.type) {
    case "summary": {
      const item = section.items[0] as { content?: string } | undefined;
      if (!item?.content) return null;
      return <Text style={styles.summaryText}>{item.content}</Text>;
    }
    case "experience": {
      return (
        <>
          {section.items.map((item) => {
            const ei = item as {
              company?: string;
              title?: string;
              location?: string;
              startDate?: string;
              endDate?: string;
              description?: string;
              bulletPoints?: string[];
            };
            if (!ei.title && !ei.company) return null;
            return (
              <View key={item.id} style={styles.itemBlock}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>
                    {[ei.title, ei.company].filter(Boolean).join(" at ")}
                  </Text>
                  <Text style={styles.itemDate}>
                    {[ei.startDate, ei.endDate || "Present"].filter(Boolean).join(" — ")}
                  </Text>
                </View>
                {ei.location ? (
                  <Text style={styles.itemDetail}>{ei.location}</Text>
                ) : null}
                {ei.description ? (
                  <Text style={styles.itemDetail}>{ei.description}</Text>
                ) : null}
                {ei.bulletPoints && ei.bulletPoints.some((b) => b.trim()) && (
                  <View style={styles.bulletList}>
                    {ei.bulletPoints.filter((b) => b.trim()).map((bp, i) => (
                      <View key={i} style={styles.bulletItem}>
                        <Text style={styles.bulletPoint}>•</Text>
                        <Text style={styles.bulletText}>{bp.trim()}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </>
      );
    }
    case "education": {
      return (
        <>
          {section.items.map((item) => {
            const ei = item as {
              school?: string;
              degree?: string;
              field?: string;
              startDate?: string;
              endDate?: string;
              gpa?: string;
              description?: string;
            };
            if (!ei.school && !ei.degree) return null;
            return (
              <View key={item.id} style={styles.itemBlock}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>
                    {[ei.degree, ei.field ? `in ${ei.field}` : ""]
                      .filter(Boolean)
                      .join(" ")}
                    {ei.school ? ` — ${ei.school}` : ""}
                  </Text>
                  <Text style={styles.itemDate}>
                    {[ei.startDate, ei.endDate || "Present"]
                      .filter(Boolean)
                      .join(" — ")}
                  </Text>
                </View>
                {ei.gpa ? (
                  <Text style={styles.itemDetail}>GPA: {ei.gpa}</Text>
                ) : null}
                {ei.description ? (
                  <Text style={styles.itemDetail}>{ei.description}</Text>
                ) : null}
              </View>
            );
          })}
        </>
      );
    }
    case "skills": {
      return (
        <>
          {section.items.map((item) => {
            const si = item as { category?: string; skills?: string[] };
            if (!si.skills || si.skills.length === 0) return null;
            return (
              <View key={item.id} style={{ marginBottom: 2 }}>
                <Text style={{ fontSize: 10 }}>
                  {si.category ? `${si.category}: ` : ""}
                  {si.skills.join(", ")}
                </Text>
              </View>
            );
          })}
        </>
      );
    }
    case "projects": {
      return (
        <>
          {section.items.map((item) => {
            const pi = item as {
              name?: string;
              url?: string;
              description?: string;
              bulletPoints?: string[];
              technologies?: string[];
            };
            if (!pi.name) return null;
            return (
              <View key={item.id} style={styles.itemBlock}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>
                    {pi.name}
                    {pi.url ? ` (${pi.url})` : ""}
                  </Text>
                </View>
                {pi.description ? (
                  <Text style={styles.itemDetail}>{pi.description}</Text>
                ) : null}
                {pi.technologies && pi.technologies.length > 0 && (
                  <Text style={styles.itemDetail}>
                    Tech: {pi.technologies.join(", ")}
                  </Text>
                )}
                {pi.bulletPoints &&
                  pi.bulletPoints.some((b) => b.trim()) && (
                    <View style={styles.bulletList}>
                      {pi.bulletPoints.filter((b) => b.trim()).map((bp, i) => (
                        <View key={i} style={styles.bulletItem}>
                          <Text style={styles.bulletPoint}>•</Text>
                          <Text style={styles.bulletText}>{bp.trim()}</Text>
                        </View>
                      ))}
                    </View>
                  )}
              </View>
            );
          })}
        </>
      );
    }
    case "certifications": {
      return (
        <>
          {section.items.map((item) => {
            const ci = item as {
              name?: string;
              issuer?: string;
              date?: string;
            };
            if (!ci.name) return null;
            return (
              <View key={item.id} style={styles.itemBlock}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemTitle}>
                    {ci.name}
                    {ci.issuer ? ` — ${ci.issuer}` : ""}
                  </Text>
                  {ci.date ? (
                    <Text style={styles.itemDate}>{ci.date}</Text>
                  ) : null}
                </View>
              </View>
            );
          })}
        </>
      );
    }
    default:
      return null;
  }
}
