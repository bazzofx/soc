// Incident report model + Markdown rendering (Appendix D based form).
import type { LabeledText } from "../types";

export interface TimelineEntry {
  id: string;
  when: string; // date/time
  event: string; // event / evidence
  source: string; // evidence source
}

export interface ExtraSection {
  id: string;
  title: string;
  content: string;
}

export interface IncidentReport {
  version: number;
  /** keyed by the Appendix D field label (Timeline excluded — structured rows) */
  fields: Record<string, string>;
  timeline: TimelineEntry[];
  extras: ExtraSection[];
  updatedAt?: string;
}

export const TIMELINE_FIELD = "Timeline";

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function blankReport(fieldLabels: string[]): IncidentReport {
  const fields: Record<string, string> = {};
  for (const label of fieldLabels) {
    if (label !== TIMELINE_FIELD) fields[label] = "";
  }
  return { version: 1, fields, timeline: [], extras: [] };
}

function mdParagraph(value: string): string {
  const t = value.trim();
  return t ? t : "_Not provided._";
}

function escCell(value: string): string {
  return value
    .replace(/\|/g, "\\|")
    .replace(/\s*\n+\s*/g, " ")
    .trim();
}

/** Full Markdown report from the form state. */
export function reportToMarkdown(report: IncidentReport, fieldsMeta: LabeledText[]): string {
  const lines: string[] = [];
  lines.push("# SOC Incident Report", "");
  lines.push(
    `> Generated ${new Date().toLocaleString()} — SOC Scenario Reviewer · Appendix D template.`,
    "",
  );

  for (const meta of fieldsMeta) {
    if (meta.label === TIMELINE_FIELD) continue;
    lines.push(`## ${meta.label}`, "");
    lines.push(mdParagraph(report.fields[meta.label] ?? ""), "");
  }

  lines.push("## Timeline", "");
  if (report.timeline.length === 0) {
    lines.push("_No timeline entries recorded._", "");
  } else {
    lines.push(
      "| # | When | Event / evidence | Source |",
      "|---:|---|---|---|",
    );
    report.timeline.forEach((t, i) => {
      lines.push(
        `| ${i + 1} | ${escCell(t.when)} | ${escCell(t.event)} | ${escCell(t.source)} |`,
      );
    });
    lines.push("");
  }

  for (const extra of report.extras) {
    const title = extra.title.trim() || "Additional section";
    const content = extra.content.trim();
    lines.push(`## ${title}`, "");
    lines.push(content ? content : "_Empty._", "");
  }

  return lines.join("\n");
}

/** A file-name friendly slug from the Incident / Alert ID field. */
export function reportSlug(report: IncidentReport): string {
  const raw = (report.fields["Incident / Alert ID"] ?? "").trim().toLowerCase();
  const slug = raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return slug || "incident";
}

export function reportFileName(report: IncidentReport): string {
  return `${reportSlug(report)}-report.md`;
}
