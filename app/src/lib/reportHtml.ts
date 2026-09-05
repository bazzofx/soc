// Self-contained HTML rendering of an incident report, styled with the
// Cyber Samurai reference stylesheet (app/public/theme/globalStyle.css).
import { reportSlug, type IncidentReport } from "./report";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function field(report: IncidentReport, label: string): string {
  return (report.fields[label] ?? "").trim();
}

function docText(value: string): string {
  const v = value.trim();
  return v ? `<p class="doc-text">${esc(v)}</p>` : '<p class="missing">Not provided.</p>';
}

function row(label: string, value: string): string {
  const v = value.trim();
  return `<tr><td>${esc(label)}</td><td>${
    v ? esc(v) : '<span class="missing">Not provided.</span>'
  }</td></tr>`;
}

const EXTRA_CSS = `
  /* +20px top padding for each report section */
  .glass-card { padding: 44px 24px 24px; }
  /* section headers enlarged by 5px (base 18px -> 23px) */
  .glass-card .card-title { font-size: 23px; }
  h3.section-title { margin: 26px 0 10px; }
  p.doc-text { color: var(--text-primary); line-height: 1.75; }
  .missing { color: var(--text-muted); font-style: italic; }
  table.cert-table th {
    text-align: left; color: var(--text-muted);
    font-size: 11px; text-transform: uppercase; letter-spacing: 1px;
    padding: 8px; border-bottom: 1px solid rgba(255,255,255,0.12);
  }
  table.cert-table td { font-family: inherit; }
  .meta-chip { display:inline-block; background: var(--card-bg); border:1px solid var(--border-color);
    padding: 4px 12px; border-radius: 20px; margin: 0 8px 8px 0; color: var(--text-secondary); font-size: 13px; }
  .hero-title small { display:block; font-size: 15px; color: var(--text-secondary); font-weight: 500;
    letter-spacing: 0; margin-top: 6px; text-transform: none; }
  @media print {
    body { background: #fff !important; }
    .glass-card, .hero-section, .header-bar { box-shadow: none !important; }
    .btn-print { display: none; }
  }
`;

export function reportHtml(report: IncidentReport, css: string): string {
  const title = field(report, "Incident / Alert ID") || reportSlug(report);
  const id = field(report, "Incident / Alert ID");
  const dt = field(report, "Date / Time");
  const source = field(report, "Detection source");

  const overviewRows = [
    ["Incident / Alert ID", id],
    ["Date / Time", dt],
    ["Detection source", source],
    ["Affected entities", field(report, "Affected entities")],
    ["MITRE ATT&CK", field(report, "MITRE ATT&CK")],
  ]
    .map(([l, v]) => row(l, v))
    .join("");

  const narrative = ["Summary", "Investigation performed", "Findings"]
    .map(
      (label) =>
        `<h3 class="card-title">${esc(label)}</h3>${docText(field(report, label))}`,
    )
    .join("");

  const impact = [
    "Containment / Recovery",
    "Business / Data impact",
    "Root cause / Initial access",
    "Closure rationale",
    "Lessons / Detection improvements",
  ]
    .map(
      (label) =>
        `<h3 class="card-title">${esc(label)}</h3>${docText(field(report, label))}`,
    )
    .join("");

  // timeline
  let timelineHtml = '<p class="missing">No timeline entries recorded.</p>';
  if (report.timeline.length) {
    const body = report.timeline
      .map(
        (t) =>
          `<tr><td style="width:20%">${esc(t.when) || '<span class="missing">—</span>'}</td>` +
          `<td>${esc(t.event) || '<span class="missing">—</span>'}</td>` +
          `<td style="width:26%">${esc(t.source) || '<span class="missing">—</span>'}</td></tr>`,
      )
      .join("");
    timelineHtml = `
      <table class="cert-table">
        <thead><tr><th>When</th><th>Event / evidence</th><th>Source</th></tr></thead>
        <tbody>${body}</tbody>
      </table>`;
  }

  const extras = report.extras
    .filter((e) => e.title.trim() || e.content.trim())
    .map(
      (e) => `
      <div class="glass-card">
        <h3 class="card-title">${esc(e.title.trim() || "Additional section")}</h3>
        ${docText(e.content)}
      </div>`,
    )
    .join("");

  const generated = new Date().toLocaleString();

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(title)} — SOC Incident Report</title>
<style>
${css}
${EXTRA_CSS}
</style>
</head>
<body>
<div class="container">

  <div class="header-bar">
    <div class="brand">
      <div class="brand-logo">SOC&nbsp;<span>INCIDENT REPORT</span></div>
    </div>
    <button class="btn-print" onclick="window.print()">&#128424;&nbsp;Print</button>
  </div>

  <div class="hero-section">
    <div class="hero-overlay"></div>
    <div class="hero-content">
      <div class="hero-tagline">Incident Documentation</div>
      <h1 class="hero-title">${esc(title)}<small>Generated ${esc(generated)} · SOC Scenario Reviewer</small></h1>
      <div class="hero-meta">
        ${dt ? `<div class="meta-item"><span class="meta-label">Date / Time</span><span class="meta-val">${esc(dt)}</span></div>` : ""}
        ${source ? `<div class="meta-item"><span class="meta-label">Detection source</span><span class="meta-val">${esc(source)}</span></div>` : ""}
      </div>
    </div>
  </div>

  <div class="glass-card">
    <h3 class="card-title">Overview</h3>
    <table class="cert-table">${overviewRows}</table>
  </div>

  <div class="glass-card">
    <h3 class="card-title">Narrative</h3>
    ${narrative}
  </div>

  <div class="glass-card">
    <h3 class="card-title">Timeline</h3>
    ${timelineHtml}
  </div>

  <div class="glass-card">
    <h3 class="card-title">Impact, containment &amp; closure</h3>
    ${impact}
  </div>

  ${extras}

  <div class="footer">
    Generated ${esc(generated)} · SOC Scenario Reviewer — by Cyber Samurai ·
    SOC Investigation Scenarios, 2026 Edition
  </div>
</div>
</body>
</html>
`;
}
