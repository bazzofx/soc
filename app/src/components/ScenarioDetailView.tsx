// Structured reading view for one scenario.
import { useState } from "react";
import { Link } from "react-router-dom";
import { copyMarkdown } from "../lib/markdown";
import { useReview } from "../lib/review";
import type { Category, ReviewStatus, Scenario } from "../types";
import { REVIEW_LABEL } from "../types";
import { Chip, SeverityBadge } from "./ui";

function StatusControl({ code }: { code: string }) {
  const status = useReview((s) => s.status[code] ?? "unreviewed");
  const setStatus = useReview((s) => s.setStatus);
  const options: ReviewStatus[] = ["unreviewed", "progress", "reviewed", "flagged"];
  return (
    <label className="flex items-center gap-2 text-xs font-semibold" style={{ color: "var(--tx2)" }}>
      Status
      <select
        className="field w-auto py-1.5 text-xs"
        value={status}
        onChange={(e) => setStatus(code, e.target.value as ReviewStatus)}
        aria-label="Review status"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {REVIEW_LABEL[o]}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ScenarioDetailView({
  scenario,
  categories,
}: {
  scenario: Scenario;
  categories: Category[];
}) {
  const cat = categories.find((c) => c.id === scenario.categoryId);
  const [copied, setCopied] = useState(false);
  const prevNum = scenario.num - 1;
  const nextNum = scenario.num + 1;

  async function copy() {
    const ok = await copyMarkdown(scenario, categories);
    setCopied(ok);
    setTimeout(() => setCopied(false), 1600);
  }

  return (
    <article className="mx-auto max-w-4xl">
      {/* header */}
      <nav className="mb-3 flex items-center justify-between gap-2 text-sm">
        <div className="flex items-center gap-2">
          <Link className="link" to={`/scenarios?cat=${scenario.categoryId}`}>
            {cat?.name ?? scenario.categoryId}
          </Link>
          <span style={{ color: "var(--tx3)" }}>/</span>
          <span style={{ color: "var(--tx3)" }}>
            Scenario {scenario.code}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {prevNum >= 1 && (
            <Link className="btn btn--ghost px-2.5 py-1 text-xs" to={`/scenarios/${String(prevNum).padStart(3, "0")}`} title="Previous scenario (←)">
              ← {String(prevNum).padStart(3, "0")}
            </Link>
          )}
          {nextNum <= 100 && (
            <Link className="btn btn--ghost px-2.5 py-1 text-xs" to={`/scenarios/${String(nextNum).padStart(3, "0")}`} title="Next scenario (→)">
              {String(nextNum).padStart(3, "0")} →
            </Link>
          )}
        </div>
      </nav>

      <header className="card p-5">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm font-bold tabular-nums" style={{ color: "var(--tx3)" }}>
            {scenario.code}
          </span>
          <SeverityBadge severity={scenario.severity} />
          <Chip>{cat?.name}</Chip>
          {scenario.primaryAlertSources.map((src) => (
            <Chip key={src} title="Primary alert source">
              {src}
            </Chip>
          ))}
        </div>
        <h1 className="mt-2 text-2xl font-extrabold tracking-tight sm:text-3xl">
          {scenario.title}
        </h1>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
            <p className="text-[0.68rem] font-bold uppercase tracking-wider" style={{ color: "var(--tx3)" }}>
              Initial alert
            </p>
            <p className="mt-1 text-sm leading-relaxed">{scenario.initialAlert}</p>
          </div>
          <div className="rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
            <p className="text-[0.68rem] font-bold uppercase tracking-wider" style={{ color: "var(--tx3)" }}>
              Investigation objective
            </p>
            <p className="mt-1 text-sm leading-relaxed">{scenario.objective}</p>
          </div>
        </div>

        {scenario.mitreFocus.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold" style={{ color: "var(--tx3)" }}>
              MITRE ATT&amp;CK:
            </span>
            {scenario.mitreFocus.map((t) => (
              <Link key={t.id} to={`/mitre?t=${t.id}`} className="chip chip-hover">
                {t.id}
                {t.name ? ` · ${t.name}` : ""}
              </Link>
            ))}
          </div>
        )}

        {Object.keys(scenario.exampleEntities).length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold" style={{ color: "var(--tx3)" }}>
              Example entities:
            </span>
            {Object.entries(scenario.exampleEntities).map(([k, v]) => (
              <Chip key={k}>
                <span style={{ color: "var(--tx3)" }}>{k}:</span> {v}
              </Chip>
            ))}
          </div>
        )}
      </header>

      {/* actions */}
      <div className="my-4 flex flex-wrap items-center gap-2">
        <StatusControl code={scenario.code} />
        <span className="btn" role="button" tabIndex={0} onClick={copy} onKeyDown={(e) => e.key === "Enter" && copy()}>
          {copied ? "✓ Copied" : "⧉ Copy as Markdown"}
        </span>
        <button className="btn" onClick={() => window.print()} title="Print or save as PDF">
          🖨 Print
        </button>
        <span className="ml-auto text-xs" style={{ color: "var(--tx3)" }}>
          Keyboard: <span className="kbd">←</span> <span className="kbd">→</span> previous / next
        </span>
      </div>

      {scenario.frameworkNote && (
        <details className="card mb-4 px-4 py-3 text-sm" style={{ borderColor: "var(--line)" }}>
          <summary className="cursor-pointer font-semibold" style={{ color: "var(--tx2)" }}>
            About this playbook — how to read a scenario
          </summary>
          <p className="mt-2 leading-relaxed" style={{ color: "var(--tx2)" }}>
            {scenario.frameworkNote}
          </p>
        </details>
      )}

      {/* steps */}
      <section id="steps" className="card mb-4 p-5">
        <h2 className="h2 mb-3">Step-by-step investigation</h2>
        <ol className="flex flex-col gap-2.5">
          {scenario.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="step-num">{i + 1}</span>
              <p className="text-sm leading-relaxed">{step}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* pivots */}
      <section id="pivots" className="card mb-4 p-5">
        <h2 className="h2 mb-3">Key pivots to run</h2>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {scenario.pivots.map((p) => (
            <div key={p.label} className="rounded-xl border p-3" style={{ borderColor: "var(--line)" }}>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                {p.label.replace(" pivot", "")}
              </p>
              <p className="mt-1 text-sm leading-relaxed">{p.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* decision evidence */}
      <section id="decision" className="card mb-4 p-5">
        <h2 className="h2 mb-3">Decision evidence</h2>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="rounded-xl border p-4" style={{ borderColor: "color-mix(in srgb, var(--good) 45%, var(--line))", background: "color-mix(in srgb, var(--good) 6%, transparent)" }}>
            <p className="text-sm font-bold" style={{ color: "var(--good)" }}>
              ↑ Evidence that raises confidence
            </p>
            {scenario.decisionEvidence.raisesConfidence.map((t, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed">{t}</p>
            ))}
          </div>
          <div className="rounded-xl border p-4" style={{ borderColor: "color-mix(in srgb, var(--tx3) 45%, var(--line))" }}>
            <p className="text-sm font-bold" style={{ color: "var(--tx2)" }}>
              ↓ Evidence that may support benign / contained activity
            </p>
            {scenario.decisionEvidence.benignOrContained.map((t, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed">{t}</p>
            ))}
          </div>
        </div>
        {scenario.decisionEvidence.caseSpecific && (
          <div className="mt-3 rounded-xl border px-4 py-3" style={{ borderColor: "var(--line2)", background: "var(--bg2)" }}>
            <p className="text-sm leading-relaxed">
              <span className="font-bold">For this case, give special weight to:</span>{" "}
              {scenario.decisionEvidence.caseSpecific}
            </p>
          </div>
        )}
      </section>

      {/* closure */}
      <section id="closure" className="card mb-4 p-5">
        <h2 className="h2 mb-3">Containment, escalation and closure</h2>
        <div className="flex flex-col gap-3">
          {Object.entries(scenario.closure).map(([label, text]) =>
            text ? (
              <div key={label}>
                <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--accent)" }}>
                  {label}
                </p>
                <p className="mt-1 text-sm leading-relaxed">{text}</p>
              </div>
            ) : null,
          )}
        </div>
      </section>
    </article>
  );
}
