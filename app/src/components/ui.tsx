import type { ReactNode } from "react";
import type { Severity } from "../types";
import { SEVERITY_COLOR } from "../lib/format";

export function SeverityBadge({ severity }: { severity: Severity }) {
  const cls =
    severity === "Critical"
      ? "sev sev--critical"
      : severity === "High"
        ? "sev sev--high"
        : severity === "Medium"
          ? "sev sev--medium"
          : "sev sev--low";
  return (
    <span className={cls} title={`Severity: ${severity}`}>
      <span
        aria-hidden
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: SEVERITY_COLOR[severity],
          display: "inline-block",
        }}
      />
      {severity}
    </span>
  );
}

export function Chip({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <span className="chip" title={title}>
      {children}
    </span>
  );
}

export function SeverityLegend({ severities }: { severities: Severity[] }) {
  if (!severities.length) return null;
  return (
    <span className="flex items-center gap-1.5">
      {severities.map((s) => (
        <span
          key={s}
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: SEVERITY_COLOR[s] }}
          title={s}
        />
      ))}
    </span>
  );
}

/** Case-insensitive <mark> highlighting for a list of search terms. */
export function Highlight({
  text,
  terms,
}: {
  text: string;
  terms: string[];
}) {
  const clean = terms
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .filter((t) => t.length >= 2);
  if (!clean.length) return <>{text}</>;
  const re = new RegExp(`(${clean.join("|")})`, "gi");
  const parts = text.split(re);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i}>{part}</mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

export function ProgressRing({
  value,
  size = 56,
  stroke = 6,
}: {
  value: number; // 0..1
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const filled = Math.min(1, Math.max(0, value)) * c;
  return (
    <svg width={size} height={size} aria-hidden className="-rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--line)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent)"
        strokeWidth={stroke}
        strokeDasharray={`${filled} ${c}`}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-16 text-sm" style={{ color: "var(--tx3)" }}>
      <span
        className="inline-block h-4 w-4 animate-spin rounded-full border-2"
        style={{ borderColor: "var(--line2)", borderTopColor: "var(--accent)" }}
      />
      {label}
    </div>
  );
}

export function ErrorBox({ error }: { error: Error }) {
  return (
    <div className="card mx-auto my-10 max-w-xl p-6 text-center" role="alert">
      <p className="text-base font-semibold" style={{ color: "var(--danger)" }}>
        Could not load content
      </p>
      <p className="mt-2 text-sm" style={{ color: "var(--tx2)" }}>
        {error.message}
      </p>
      <p className="mt-3 text-xs" style={{ color: "var(--tx3)" }}>
        Check that the data bundles exist under <code>public/data/</code> (run
        <code> tools/extract.py</code> once).
      </p>
    </div>
  );
}

export function Empty({ children }: { children?: ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed py-14 text-sm"
      style={{ borderColor: "var(--line2)", color: "var(--tx3)" }}
    >
      {children ?? "Nothing here yet."}
    </div>
  );
}
