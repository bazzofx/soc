import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBox, Loading } from "../components/ui";
import { useReferences } from "../lib/data";
import { downloadTextFile } from "../lib/markdown";
import { reportHtml } from "../lib/reportHtml";
import {
  blankReport,
  makeId,
  reportSlug,
  reportToMarkdown,
  type ExtraSection,
  type IncidentReport,
  type TimelineEntry,
} from "../lib/report";
// Cyber Samurai stylesheet, embedded at build time (sync with ../reference/globalStyle.css)
import globalStyleCss from "../theme/globalStyle.css?raw";

const DRAFT_KEY = "soc-incident-report-v1";

/** Degrade gracefully only if the embedded stylesheet is somehow empty. */
const THEME_CSS = globalStyleCss && globalStyleCss.trim() ? globalStyleCss : null;

// fields rendered as wide text areas
const LONG_FIELDS = new Set([
  "Summary",
  "Investigation performed",
  "Findings",
  "Affected entities",
  "Containment / Recovery",
  "Business / Data impact",
  "Root cause / Initial access",
  "Closure rationale",
  "Lessons / Detection improvements",
]);

function loadDraft(labels: string[]): IncidentReport {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as IncidentReport;
      if (parsed && parsed.fields) {
        const base = blankReport(labels);
        return {
          ...base,
          fields: { ...base.fields, ...parsed.fields },
          timeline: Array.isArray(parsed.timeline) ? parsed.timeline : [],
          extras: Array.isArray(parsed.extras) ? parsed.extras : [],
        };
      }
    }
  } catch {
    /* ignore */
  }
  return blankReport(labels);
}

export function ReportPage() {
  const refs = useReferences();
  const labels = useMemo(
    () => refs.data?.appendixD.map((f) => f.label) ?? [],
    [refs.data],
  );
  const [report, setReport] = useState<IncidentReport>(() =>
    loadDraft(refs.data?.appendixD.map((f) => f.label) ?? []),
  );
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [htmlBusy, setHtmlBusy] = useState(false);

  // keep draft labels in sync once data loads (first draft may predate it)
  useEffect(() => {
    if (labels.length) {
      setReport((prev) => {
        const base = blankReport(labels);
        return {
          ...prev,
          fields: { ...base.fields, ...prev.fields },
        };
      });
    }
  }, [labels]);

  // autosave
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...report, updatedAt: new Date().toISOString() }));
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      /* storage unavailable */
    }
  }, [report]);

  if (refs.error) return <ErrorBox error={refs.error} />;
  if (!refs.data) return <Loading label="Loading report template…" />;

  const meta = refs.data.appendixD;
  const reportMd = reportToMarkdown(report, meta);
  const hasContent = Object.values(report.fields).some((v) => v.trim()) ||
    report.timeline.length > 0 || report.extras.some((e) => e.title || e.content);

  const setField = (label: string, value: string) =>
    setReport((p) => ({ ...p, fields: { ...p.fields, [label]: value } }));

  const addTimeline = () =>
    setReport((p) => ({
      ...p,
      timeline: [...p.timeline, { id: makeId(), when: "", event: "", source: "" }],
    }));
  const patchTimeline = (id: string, patch: Partial<TimelineEntry>) =>
    setReport((p) => ({
      ...p,
      timeline: p.timeline.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    }));
  const removeTimeline = (id: string) =>
    setReport((p) => ({ ...p, timeline: p.timeline.filter((t) => t.id !== id) }));
  const moveTimeline = (idx: number, dir: -1 | 1) =>
    setReport((p) => {
      const t = [...p.timeline];
      const j = idx + dir;
      if (j < 0 || j >= t.length) return p;
      [t[idx], t[j]] = [t[j], t[idx]];
      return { ...p, timeline: t };
    });

  const addExtra = () =>
    setReport((p) => ({
      ...p,
      extras: [...p.extras, { id: makeId(), title: "", content: "" }],
    }));
  const patchExtra = (id: string, patch: Partial<ExtraSection>) =>
    setReport((p) => ({
      ...p,
      extras: p.extras.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    }));
  const removeExtra = (id: string) =>
    setReport((p) => ({ ...p, extras: p.extras.filter((e) => e.id !== id) }));

  const downloadHtml = async () => {
    try {
      setHtmlBusy(true);
      const css =
        THEME_CSS ??
        `:root{--bg-primary:#070709;--bg-secondary:#0f0f13;--text-primary:#fff;--text-secondary:#9ea2b0;--text-muted:#5f6377;--border-color:rgba(255,255,255,.1);--card-bg:rgba(15,15,19,.8);--accent-red:#ff2e3b;--accent-red-dim:rgba(255,46,59,.1)}body{background:var(--bg-primary);color:var(--text-primary);font-family:Inter,system-ui,sans-serif}.container{max-width:900px;margin:0 auto;padding:32px 20px}.header-bar{display:flex;justify-content:space-between;align-items:center;background:var(--card-bg);border:1px solid var(--border-color);padding:14px 20px;border-radius:10px;margin-bottom:20px}.brand-logo{font-weight:800}.brand-logo span{color:var(--accent-red)}.glass-card{background:var(--card-bg);border:1px solid var(--border-color);border-radius:12px;padding:22px;margin-bottom:18px}.card-title{font-weight:700}.card-title::before{content:"";display:inline-block;width:4px;height:16px;background:var(--accent-red);margin-right:8px}.cert-table{width:100%;border-collapse:collapse;margin-top:10px}.cert-table td{padding:10px 8px;font-size:14px;vertical-align:top;border-bottom:1px solid rgba(255,255,255,.05)}.cert-table td:first-child{color:var(--text-secondary);font-weight:600;width:32%}.footer{text-align:center;color:var(--text-muted);font-size:12px;margin-top:30px}`;
      const html = reportHtml(report, css);
      downloadTextFile(`${reportSlug(report)}-report.html`, html, "text/html;charset=utf-8");
    } finally {
      setHtmlBusy(false);
    }
  };

  const resetAll = () => {
    if (window.confirm("Clear the whole incident report? This cannot be undone.")) {
      setReport(blankReport(meta.map((f) => f.label)));
    }
  };

  const input = (key: string) => ({
    value: report.fields[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setField(key, e.target.value),
  });

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--tx3)" }}>
            <Link className="link" to="/references">References</Link> / D · Documentation template
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">Incident report form</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tx2)" }}>
            Fill in the fields, build a chronological timeline, add any extra sections —
            then download a styled HTML report. Auto-saved in this browser.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn--accent" onClick={downloadHtml} disabled={htmlBusy}>
            {htmlBusy ? "Preparing…" : "⬇ Download HTML report"}
          </button>
          <button className="btn" onClick={() => downloadTextFile(`${reportSlug(report)}-report.json`, JSON.stringify(report, null, 2), "application/json")}>
            ⬇ Backup (.json)
          </button>
          <button className="btn" onClick={() => window.print()}>🖨 Print</button>
          <button className="btn btn--ghost" onClick={resetAll}>Clear</button>
        </div>
      </header>

      <p className="mb-4 text-xs" style={{ color: "var(--tx3)" }}>
        {savedAt ? `Draft auto-saved at ${savedAt}.` : "Your draft is saved as you type."}{" "}
        {!hasContent && "Fill in any field to get started — leave blank sections out of the download if you prefer."}
      </p>

      {/* 1 · metadata */}
      <section className="card mb-4 p-5">
        <h2 className="h2 mb-1">1 · Incident metadata</h2>
        <p className="mb-4 text-xs" style={{ color: "var(--tx3)" }}>Identification and detection context.</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {meta
            .filter((f) => ["Incident / Alert ID", "Date / Time", "Detection source"].includes(f.label))
            .map((f) => (
              <Field key={f.label} meta={f} input={input(f.label)} />
            ))}
        </div>
      </section>

      {/* 2 · narrative */}
      <section className="card mb-4 p-5">
        <h2 className="h2 mb-1">2 · Investigation narrative</h2>
        <p className="mb-4 text-xs" style={{ color: "var(--tx3)" }}>
          Entities, summary, performed work and findings.
        </p>
        <div className="flex flex-col gap-4">
          {meta
            .filter((f) => ["Affected entities", "Summary", "Investigation performed", "Findings"].includes(f.label))
            .map((f) => (
              <Field key={f.label} meta={f} input={input(f.label)} big />
            ))}
        </div>
      </section>

      {/* 3 · timeline */}
      <section className="card mb-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="h2">3 · Timeline</h2>
            <p className="text-xs" style={{ color: "var(--tx3)" }}>
              Chronological evidence — add one row per event.
            </p>
          </div>
          <button className="btn" onClick={addTimeline}>+ Add event</button>
        </div>

        {report.timeline.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed px-4 py-8 text-center text-sm" style={{ borderColor: "var(--line2)", color: "var(--tx3)" }}>
            No events yet — click “+ Add event” to start the timeline.
          </p>
        ) : (
          <ol className="mt-4 flex flex-col gap-3">
            {report.timeline.map((t, idx) => (
              <li key={t.id} className="rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-2">
                  <span className="step-num">{idx + 1}</span>
                  <input
                    className="field flex-1 py-1.5 text-sm"
                    placeholder="When — e.g. 2026-05-01 14:02 UTC"
                    value={t.when}
                    onChange={(e) => patchTimeline(t.id, { when: e.target.value })}
                    aria-label="Timeline date/time"
                  />
                  <span className="flex gap-1">
                    <button className="btn btn--ghost px-2 py-1 text-xs" title="Move up" disabled={idx === 0} onClick={() => moveTimeline(idx, -1)}>↑</button>
                    <button className="btn btn--ghost px-2 py-1 text-xs" title="Move down" disabled={idx === report.timeline.length - 1} onClick={() => moveTimeline(idx, 1)}>↓</button>
                    <button className="btn btn--ghost px-2 py-1 text-xs" title="Remove" onClick={() => removeTimeline(t.id)}>✕</button>
                  </span>
                </div>
                <input
                  className="field mt-2 py-1.5 text-sm"
                  placeholder="Event / evidence — e.g. Failed logons from 198.51.100.73; account locked"
                  value={t.event}
                  onChange={(e) => patchTimeline(t.id, { event: e.target.value })}
                  aria-label="Timeline event"
                />
                <input
                  className="field mt-2 py-1.5 text-sm"
                  placeholder="Source — e.g. SIEM sign-in logs / EDR / email trace"
                  value={t.source}
                  onChange={(e) => patchTimeline(t.id, { source: e.target.value })}
                  aria-label="Timeline source"
                />
              </li>
            ))}
          </ol>
        )}
      </section>

      {/* 4 · impact & response */}
      <section className="card mb-4 p-5">
        <h2 className="h2 mb-1">4 · Impact, containment &amp; closure</h2>
        <p className="mb-4 text-xs" style={{ color: "var(--tx3)" }}>
          ATT&amp;CK mapping, response actions, impact and lessons.
        </p>
        <div className="flex flex-col gap-4">
          {meta
            .filter((f) =>
              [
                "MITRE ATT&CK",
                "Containment / Recovery",
                "Business / Data impact",
                "Root cause / Initial access",
                "Closure rationale",
                "Lessons / Detection improvements",
              ].includes(f.label),
            )
            .map((f) => (
              <Field key={f.label} meta={f} input={input(f.label)} big />
            ))}
        </div>
      </section>

      {/* 5 · extras */}
      <section className="card mb-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="h2">5 · Additional information</h2>
            <p className="text-xs" style={{ color: "var(--tx3)" }}>
              Anything else for the report — indicators, communications, decisions…
            </p>
          </div>
          <button className="btn" onClick={addExtra}>+ Add section</button>
        </div>
        {report.extras.length === 0 ? (
          <p className="mt-4 rounded-lg border border-dashed px-4 py-8 text-center text-sm" style={{ borderColor: "var(--line2)", color: "var(--tx3)" }}>
            No extra sections yet.
          </p>
        ) : (
          <div className="mt-4 flex flex-col gap-3">
            {report.extras.map((x) => (
              <div key={x.id} className="rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
                <div className="flex items-center gap-2">
                  <input
                    className="field flex-1 py-1.5 text-sm font-semibold"
                    placeholder="Section title — e.g. Indicators of compromise"
                    value={x.title}
                    onChange={(e) => patchExtra(x.id, { title: e.target.value })}
                    aria-label="Extra section title"
                  />
                  <button className="btn btn--ghost px-2 py-1 text-xs" title="Remove section" onClick={() => removeExtra(x.id)}>✕</button>
                </div>
                <textarea
                  className="field mt-2 min-h-20 text-sm"
                  placeholder="Content (Markdown allowed)…"
                  value={x.content}
                  onChange={(e) => patchExtra(x.id, { content: e.target.value })}
                  aria-label="Extra section content"
                />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* preview + download */}
      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="h2">Generated report</h2>
          <div className="flex flex-wrap gap-2">
            <button className="btn btn--accent" onClick={downloadHtml} disabled={htmlBusy}>
              {htmlBusy ? "Preparing…" : "⬇ Download HTML report"}
            </button>
            <button className="btn" onClick={() => downloadTextFile(`${reportSlug(report)}-report.json`, JSON.stringify(report, null, 2), "application/json")}>
              ⬇ Backup (.json)
            </button>
          </div>
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--tx3)" }}>
          The HTML download is a single self-contained file with the full Cyber Samurai
          report theme — open it in any browser and use its <b>Print</b> button for PDF.
          The JSON backup keeps the form state for later editing or archiving.
        </p>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold" style={{ color: "var(--tx2)" }}>
            Preview content
          </summary>
          <pre
            className="mt-3 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg border p-3 font-mono text-xs leading-relaxed scrollbar-thin"
            style={{ borderColor: "var(--line)", background: "rgba(7,7,9,0.55)", color: "var(--tx2)" }}
          >
            {reportMd}
          </pre>
        </details>
      </section>
    </div>
  );
}

function Field({
  meta,
  input,
  big,
}: {
  meta: { label: string; text: string };
  input: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  };
  big?: boolean;
}) {
  const isLong = big || LONG_FIELDS.has(meta.label);
  const common = { title: meta.text || undefined, ...input };
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-sm font-bold" style={{ color: "var(--tx)" }}>
        {meta.label}
      </span>
      {meta.text && (
        <span className="text-xs leading-snug" style={{ color: "var(--tx3)" }}>
          {meta.text}
        </span>
      )}
      {isLong ? (
        <textarea className="field min-h-20 text-sm" rows={meta.label === "Summary" || meta.label === "Findings" ? 4 : 3} placeholder={meta.text} {...common} />
      ) : (
        <input className="field py-1.5 text-sm" placeholder={meta.text} {...common} />
      )}
    </label>
  );
}
