// Scenario -> Markdown, for copying into notes / incident documentation.
import type { Category, Scenario } from "../types";
import { categoryName } from "./format";

function mdEscape(text: string): string {
  return text.replace(/([\\`*_[\]])/g, "\\$1");
}

export function scenarioToMarkdown(sc: Scenario, categories: Category[]): string {
  const lines: string[] = [];
  lines.push(`# ${sc.code}. ${sc.title}`);
  lines.push("");
  lines.push(
    `**Category:** ${categoryName(categories, sc.categoryId)} · **Severity:** ${sc.severity}`,
  );
  if (sc.primaryAlertSources.length) {
    lines.push(`**Primary alert source:** ${sc.primaryAlertSources.join(" / ")}`);
  }
  if (sc.mitreFocus.length) {
    lines.push(
      `**MITRE ATT&CK focus:** ${sc.mitreFocus
        .map((t) => `${t.id}${t.name ? " " + t.name : ""}`)
        .join("; ")}`,
    );
  }
  if (Object.keys(sc.exampleEntities).length) {
    lines.push(
      `**Example entities:** ${Object.entries(sc.exampleEntities)
        .map(([k, v]) => `${k}: ${v}`)
        .join(" | ")}`,
    );
  }
  lines.push("");
  lines.push(`**Initial alert:** ${sc.initialAlert}`);
  lines.push("");
  lines.push(`**Investigation objective:** ${sc.objective}`);
  lines.push("");
  lines.push("## Step-by-step investigation");
  sc.steps.forEach((step, i) => lines.push(`${i + 1}. ${mdEscape(step)}`));
  lines.push("");
  lines.push("## Key pivots to run");
  for (const p of sc.pivots) {
    lines.push(`- **${p.label}:** ${mdEscape(p.text)}`);
  }
  lines.push("");
  lines.push("## Decision evidence");
  lines.push("### Evidence that raises confidence");
  for (const t of sc.decisionEvidence.raisesConfidence) lines.push(`- ${mdEscape(t)}`);
  lines.push("");
  lines.push("### Evidence that may support benign/contained activity");
  for (const t of sc.decisionEvidence.benignOrContained) lines.push(`- ${mdEscape(t)}`);
  if (sc.decisionEvidence.caseSpecific) {
    lines.push("");
    lines.push(
      `> **For this case, give special weight to:** ${mdEscape(sc.decisionEvidence.caseSpecific)}`,
    );
  }
  lines.push("");
  lines.push("## Containment, escalation and closure");
  for (const [label, text] of Object.entries(sc.closure)) {
    if (text) lines.push(`**${label}:** ${mdEscape(text)}`);
  }
  lines.push("");
  lines.push(`_Source: ${sc.title} (scenario ${sc.code})._`);
  return lines.join("\n");
}

export async function copyMarkdown(sc: Scenario, categories: Category[]): Promise<boolean> {
  const md = scenarioToMarkdown(sc, categories);
  try {
    await navigator.clipboard.writeText(md);
    return true;
  } catch {
    // fallback for non-secure contexts
    const ta = document.createElement("textarea");
    ta.value = md;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

// ---------------------------------------------------------------------------
// Incident documentation template (Appendix D)
// ---------------------------------------------------------------------------

export interface DocField {
  label: string;
  text: string; // hint describing what belongs in the field
}

/** Blank fill-in Markdown built from the Appendix D field list. */
export function incidentTemplateMarkdown(fields: DocField[]): string {
  const lines = [
    "# SOC Incident Documentation",
    "",
    "> Template from *100 SOC Investigation Scenarios* — Appendix D.",
    "> Fill each section below; delete the hint lines (starting with `>`) as you go.",
    "",
  ];
  for (const f of fields) {
    lines.push(`## ${f.label}`, "");
    if (f.text) {
      lines.push(`> Hint: ${f.text}`, "");
    }
    lines.push("_Write here…_", "", "", "");
  }
  return lines.join("\n");
}

/** Download helper for text files (markdown). */
export function downloadTextFile(
  filename: string,
  text: string,
  mime = "text/markdown;charset=utf-8",
): void {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
