import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ErrorBox, Loading, ProgressRing, SeverityBadge } from "../components/ui";
import { useCategories, useScenarios } from "../lib/data";
import { downloadReview, parseReviewFile, useReview } from "../lib/review";
import type { ReviewStatus, Scenario } from "../types";
import { REVIEW_LABEL } from "../types";

export function ProgressPage() {
  const scenarios = useScenarios();
  const categories = useCategories();
  const status = useReview((s) => s.status);
  const notes = useReview((s) => s.notes);
  const importState = useReview((s) => s.importState);
  const resetAll = useReview((s) => s.resetAll);
  const fileRef = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<string | null>(null);

  if (scenarios.error || categories.error) {
    return <ErrorBox error={scenarios.error ?? categories.error!} />;
  }
  if (!scenarios.data || !categories.data) return <Loading />;

  const all = scenarios.data.scenarios;
  const cats = categories.data.categories;

  function countStatus(st: ReviewStatus): number {
    return all.filter((s) => (status[s.code] ?? "unreviewed") === st).length;
  }
  const done = countStatus("reviewed") + countStatus("flagged");
  const withNotes = all.filter((s) => (notes[s.code] ?? "").trim()).length;

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const state = await parseReviewFile(file);
      importState(state);
      setMsg(`Imported review state (${Object.keys(state.status).length} status entries).`);
    } catch (err) {
      setMsg(`Import failed: ${(err as Error).message}`);
    }
  }

  function exportNow() {
    downloadReview({ version: 1, status, notes });
    setMsg("Exported soc-review-state.json — keep it as a backup.");
  }

  function reset() {
    if (window.confirm("Clear ALL review statuses and notes for the 100 scenarios? This cannot be undone.")) {
      resetAll();
      setMsg("Review state cleared.");
    }
  }

  const statusesAll: ReviewStatus[] = ["unreviewed", "progress", "reviewed", "flagged"];

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">Review progress</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--tx2)" }}>
            Track your walkthrough of all 100 scenarios. State is stored locally in this
            browser and can be exported/imported as JSON.
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn" onClick={exportNow}>⬇ Export state</button>
          <button className="btn" onClick={() => fileRef.current?.click()}>⬆ Import state</button>
          <button className="btn btn--ghost" onClick={reset}>Reset</button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={onFile} />
        </div>
      </header>
      {msg && (
        <p className="mb-4 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: "var(--line2)", color: "var(--tx2)" }}>
          {msg}
        </p>
      )}

      <section className="card mb-6 flex flex-wrap items-center gap-6 p-5">
        <ProgressRing value={done / all.length} size={84} stroke={8} />
        <div>
          <p className="text-2xl font-extrabold">
            {done}<span className="text-base font-normal" style={{ color: "var(--tx3)" }}> / {all.length}</span>
          </p>
          <p className="text-sm" style={{ color: "var(--tx2)" }}>reviewed or flagged</p>
          <p className="mt-1 text-xs" style={{ color: "var(--tx3)" }}>
            {withNotes} scenario(s) with notes
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {statusesAll.map((st) => (
            <span key={st} className="chip">
              <span className={`status-dot status-dot--${st}`} />
              {REVIEW_LABEL[st]}: {countStatus(st)}
            </span>
          ))}
        </div>
      </section>

      <section className="mb-8">
        <h2 className="h2 mb-3">Per-category progress</h2>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {cats.map((c) => {
            const items = all.filter((s) => s.categoryId === c.id);
            const cDone = items.filter((s) => {
              const st = status[s.code] ?? "unreviewed";
              return st === "reviewed" || st === "flagged";
            }).length;
            const mix = SEV_MIX(items);
            return (
              <div key={c.id} className="card p-4">
                <div className="flex items-center justify-between gap-2">
                  <Link className="font-bold hover:underline" style={{ color: "var(--tx)" }} to={`/scenarios?cat=${c.id}`}>
                    {c.name}
                  </Link>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--tx3)" }}>
                    {cDone}/{c.count}
                  </span>
                </div>
                <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg3)" }}>
                  <span
                    className="block h-full rounded-full"
                    style={{ width: `${(cDone / c.count) * 100}%`, background: "var(--good)" }}
                  />
                </div>
                <p className="mt-2 text-[0.68rem]" style={{ color: "var(--tx3)" }}>
                  {c.first}–{c.last} ·{" "}
                  {mix.map(([s, n]) => `${s} ${n}`).join(" · ")}
                </p>
              </div>
            );
          })}
        </div>
      </section>

      <section>
        <h2 className="h2 mb-3">Flagged scenarios</h2>
        {all.filter((s) => status[s.code] === "flagged").length === 0 ? (
          <p className="text-sm" style={{ color: "var(--tx3)" }}>
            Nothing flagged. Use the status control on any scenario page to flag a case for follow-up.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {all
              .filter((s) => status[s.code] === "flagged")
              .map((s) => (
                <li key={s.code}>
                  <Link to={`/scenarios/${s.code}`} className="card flex items-center gap-3 px-4 py-2.5">
                    <span className={`status-dot status-dot--flagged`} />
                    <span className="text-sm font-bold tabular-nums" style={{ color: "var(--tx3)" }}>{s.code}</span>
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold">{s.title}</span>
                    <SeverityBadge severity={s.severity} />
                  </Link>
                </li>
              ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function SEV_MIX(items: Scenario[]): Array<[string, number]> {
  const counts: Record<string, number> = {};
  for (const s of items) counts[s.severity] = (counts[s.severity] ?? 0) + 1;
  return (["Critical", "High", "Medium", "Low"] as const)
    .filter((k) => counts[k])
    .map((k) => [k, counts[k]]);
}
