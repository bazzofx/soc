import { useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBox, Loading } from "../components/ui";
import { IncidentDocBuilder } from "../components/IncidentDocBuilder";
import { useReferences } from "../lib/data";
import type { References } from "../types";

const TABS: Array<{ id: keyof References; label: string; blurb: string }> = [
  { id: "appendixA", label: "A · Evidence source checklist", blurb: "Where to look for each category of evidence." },
  { id: "appendixB", label: "B · Questions before closing", blurb: "Analyst questions to answer before closing any alert." },
  { id: "appendixC", label: "C · Search patterns", blurb: "Platform-neutral correlation/search patterns." },
  { id: "appendixD", label: "D · Documentation template", blurb: "Incident documentation template fields." },
  { id: "appendixE", label: "E · References & version", blurb: "Standards and sources used by the playbook." },
];

export function ReferencesPage() {
  const refs = useReferences();
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("appendixA");
  if (refs.error) return <ErrorBox error={refs.error} />;
  if (!refs.data) return <Loading />;
  const data = refs.data;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">References &amp; appendices</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--tx2)" }}>
          Supporting material from the back of the playbook.
        </p>
      </header>

      <div className="mb-4 flex flex-wrap gap-1.5" role="tablist" aria-label="Appendices">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            className="btn"
            style={
              tab === t.id
                ? { borderColor: "var(--accent)", color: "var(--accent)", background: "color-mix(in srgb, var(--accent) 10%, transparent)" }
                : undefined
            }
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <p className="mb-4 text-sm" style={{ color: "var(--tx2)" }}>
        {TABS.find((t) => t.id === tab)?.blurb}
      </p>

      <section className="flex flex-col gap-3">
        {tab === "appendixA" && <LabeledItems items={data.appendixA} />}
        {tab === "appendixB" && (
          <ol className="flex list-decimal flex-col gap-2.5 pl-6">
            {data.appendixB.map((q, i) => (
              <li key={i} className="card px-4 py-3 text-sm leading-relaxed">
                {q}
              </li>
            ))}
          </ol>
        )}
        {tab === "appendixC" && <LabeledItems items={data.appendixC} />}
        {tab === "appendixD" && (
          <>
            <div
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3"
              style={{ borderColor: "rgba(255, 46, 59, 0.3)", background: "var(--accent-dim)" }}
            >
              <p className="text-sm" style={{ color: "var(--tx2)" }}>
                Prefer guided input fields with a buildable timeline? Use the full report form.
              </p>
              <Link className="btn btn--accent" to="/report">
                Open full report form →
              </Link>
            </div>
            <IncidentDocBuilder items={data.appendixD} />
            <details className="card px-4 py-3 text-sm" style={{ borderColor: "var(--line)" }}>
              <summary className="cursor-pointer font-semibold" style={{ color: "var(--tx2)" }}>
                Show source appendix text
              </summary>
              <div className="mt-3">
                <LabeledItems items={data.appendixD} />
              </div>
            </details>
          </>
        )}
        {tab === "appendixE" && (
          <div className="flex flex-col gap-3">
            {data.appendixE.map((p, i) => (
              <p key={i} className="card px-4 py-3 text-sm leading-relaxed">
                <Linkify text={p} />
              </p>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function LabeledItems({ items }: { items: Array<{ label: string; text: string }> }) {
  if (!items.length) return <p style={{ color: "var(--tx3)" }}>No content.</p>;
  return (
    <div className="flex flex-col gap-2.5">
      {items.map((item, i) => (
        <div
          key={i}
          className="card px-4 py-3"
          style={
            item.label === "Note"
              ? { borderStyle: "dashed", background: "var(--bg2)" }
              : undefined
          }
        >
          <p className="text-sm font-bold" style={{ color: item.label === "Note" ? "var(--tx2)" : "var(--accent)" }}>
            {item.label}
          </p>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--tx2)" }}>
            <Linkify text={item.text} />
          </p>
        </div>
      ))}
    </div>
  );
}

const URL_RE = /(https?:\/\/[^\s]+)/g;

function Linkify({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a key={i} className="link" href={part} target="_blank" rel="noreferrer">
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}
