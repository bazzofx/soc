import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ScenarioCard } from "../components/ScenarioCard";
import { ErrorBox, Loading } from "../components/ui";
import { useCategories, useScenarios } from "../lib/data";
import { searchScenarios, snippetFor } from "../lib/search";
import { useReview } from "../lib/review";
import { SEVERITY_ORDER } from "../lib/format";
import type { Category, ReviewStatus, Scenario, TechniqueAgg } from "../types";
import { REVIEW_LABEL } from "../types";

type FilterKey = "cat" | "sev" | "tech" | "status";

export function BrowsePage() {
  const [params, setParams] = useSearchParams();
  const scenarios = useScenarios();
  const categories = useCategories();
  const statusMap = useReview((s) => s.status);
  const notesMap = useReview((s) => s.notes);
  const [techFilter, setTechFilter] = useState("");

  const q = params.get("q") ?? "";
  const sel = (k: FilterKey): string[] =>
    (params.get(k) ?? "").split(",").filter(Boolean);
  const notesOn = params.get("notes") === "1";

  function setParam<K extends string>(key: string, value: K | K[] | null) {
    const next = new URLSearchParams(params);
    if (value === null || value === "" || (Array.isArray(value) && value.length === 0)) {
      next.delete(key);
    } else {
      next.set(key, Array.isArray(value) ? value.join(",") : value);
    }
    setParams(next, { replace: true });
  }

  function toggle(key: FilterKey, value: string) {
    const cur = sel(key);
    const next = cur.includes(value) ? cur.filter((x) => x !== value) : [...cur, value];
    setParam(key, next);
  }

  function clearAll() {
    setParams(new URLSearchParams(), { replace: true });
  }

  const all: Scenario[] = scenarios.data?.scenarios ?? [];
  const cats: Category[] = categories.data?.categories ?? [];
  const notesOnlyActive = notesOn;

  const techniques = useTechniqueList(all);
  const shownTechniques = techniques
    .filter((t) => (techFilter.trim() ? `${t.id} ${t.name}`.toLowerCase().includes(techFilter.toLowerCase()) : true))
    .slice(0, 400);

  // search hits (only when there is a query)
  const [hits, setHits] = useState<Array<{ num: number; terms: string[] }>>([]);
  const [searching, setSearching] = useState(false);
  useEffect(() => {
    let alive = true;
    if (!q.trim() || all.length === 0 || cats.length === 0) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchScenarios(q, all, cats, 300);
        if (alive) setHits(res.map((r) => ({ num: r.num, terms: r.terms })));
      } finally {
        if (alive) setSearching(false);
      }
    }, 120);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q, all, cats]);

  // apply query + filters
  const results = (() => {
    let list: Scenario[];
    if (q.trim()) {
      const order = new Map(hits.map((h, i) => [h.num, i]));
      list = hits
        .map((h) => all.find((s) => s.num === h.num))
        .filter((s): s is Scenario => Boolean(s));
      list.sort((a, b) => (order.get(a.num) ?? 1e9) - (order.get(b.num) ?? 1e9));
    } else {
      list = [...all];
    }
    const f = { cat: sel("cat"), sev: sel("sev"), tech: sel("tech"), status: sel("status") };
    list = list.filter((s) => {
      if (f.cat.length && !f.cat.includes(s.categoryId)) return false;
      if (f.sev.length && !f.sev.includes(s.severity)) return false;
      if (f.tech.length && !s.mitreFocus.some((t) => f.tech.includes(t.id))) return false;
      if (f.status.length && !f.status.includes(statusMap[s.code] ?? "unreviewed")) return false;
      if (notesOnlyActive && !(notesMap[s.code] ?? "").trim()) return false;
      return true;
    });
    if (!q.trim()) {
      list.sort((a, b) => {
        const d = SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity);
        return d || a.num - b.num;
      });
    }
    return list;
  })();

  const activeFilterCount =
    sel("cat").length + sel("sev").length + sel("tech").length + sel("status").length + (notesOn ? 1 : 0);

  if (scenarios.error || categories.error) {
    return <ErrorBox error={scenarios.error ?? categories.error!} />;
  }
  if (!scenarios.data || !categories.data) return <Loading />;

  const activeChips: Array<{ key: string; label: string; onRemove: () => void }> = [];
  for (const id of sel("cat")) {
    activeChips.push({ key: `cat-${id}`, label: cats.find((c) => c.id === id)?.name ?? id, onRemove: () => toggle("cat", id) });
  }
  for (const s of sel("sev")) activeChips.push({ key: `sev-${s}`, label: s, onRemove: () => toggle("sev", s) });
  for (const t of sel("tech")) activeChips.push({ key: `tech-${t}`, label: t, onRemove: () => toggle("tech", t) });
  for (const st of sel("status")) activeChips.push({ key: `status-${st}`, label: REVIEW_LABEL[st as ReviewStatus], onRemove: () => toggle("status", st) });

  return (
    <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
      <aside>
        <div className="card sticky top-20 flex flex-col gap-4 p-4">
          <div className="flex items-center justify-between">
            <h2 className="h2">Filters</h2>
            {activeFilterCount > 0 && (
              <button className="link text-xs" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>

          <div>
            <input
              className="field text-sm"
              placeholder="Search within results…"
              value={q}
              onChange={(e) => setParam("q", e.target.value || null)}
              aria-label="Search within results"
            />
          </div>

          <FilterGroup label={`Category (${sel("cat").length})`} open>
            {cats.map((c) => (
              <CheckRow
                key={c.id}
                checked={sel("cat").includes(c.id)}
                label={`${c.name} (${all.filter((x) => x.categoryId === c.id).length})`}
                onToggle={() => toggle("cat", c.id)}
              />
            ))}
          </FilterGroup>

          <FilterGroup label={`Severity (${sel("sev").length})`}>
            {SEVERITY_ORDER.filter((s) => all.some((x) => x.severity === s)).map((s) => (
              <CheckRow
                key={s}
                checked={sel("sev").includes(s)}
                label={`${s} (${all.filter((x) => x.severity === s).length})`}
                swatch={`var(--sev-${s.toLowerCase()})`}
                onToggle={() => toggle("sev", s)}
              />
            ))}
          </FilterGroup>

          <FilterGroup label={`Status (${sel("status").length})`}>
            {(Object.keys(REVIEW_LABEL) as ReviewStatus[]).map((st) => (
              <CheckRow
                key={st}
                checked={sel("status").includes(st)}
                label={`${REVIEW_LABEL[st]} (${all.filter((s) => (statusMap[s.code] ?? "unreviewed") === st).length})`}
                dotClass={`status-dot status-dot--${st}`}
                onToggle={() => toggle("status", st)}
              />
            ))}
            <CheckRow
              checked={notesOn}
              label="Has notes"
              onToggle={() => setParam("notes", notesOn ? null : "1")}
            />
          </FilterGroup>

          <FilterGroup label={`MITRE technique (${sel("tech").length})`}>
            <input
              className="field mb-2 text-sm"
              placeholder="Filter list…"
              value={techFilter}
              onChange={(e) => setTechFilter(e.target.value)}
              aria-label="Filter techniques"
            />
            <div className="max-h-48 overflow-y-auto pr-1 scrollbar-thin">
              {shownTechniques.map((t) => (
                <CheckRow
                  key={t.id}
                  checked={sel("tech").includes(t.id)}
                  label={`${t.id}${t.name ? " " + t.name : ""} (${t.count})`}
                  onToggle={() => toggle("tech", t.id)}
                />
              ))}
            </div>
          </FilterGroup>
        </div>
      </aside>

      <section>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h1 className="h2 text-lg">
            {q.trim() ? <>Results for “{q.trim()}”</> : <>All scenarios</>}
            <span className="ml-2 text-sm font-normal" style={{ color: "var(--tx3)" }}>
              {results.length} of {all.length}
            </span>
          </h1>
          {searching && (
            <span className="text-xs" style={{ color: "var(--tx3)" }}>searching…</span>
          )}
        </div>

        {activeChips.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            {activeChips.map((chip) => (
              <button key={chip.key} type="button" className="chip" onClick={chip.onRemove} title="Remove filter">
                {chip.label} <span aria-hidden>✕</span>
              </button>
            ))}
          </div>
        )}

        {results.length === 0 ? (
          <div className="rounded-xl border border-dashed py-16 text-center" style={{ borderColor: "var(--line2)", color: "var(--tx3)" }}>
            <p className="font-semibold">No scenarios match these criteria</p>
            <button className="link mt-2 text-sm" onClick={clearAll}>
              Clear filters and query
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {results.map((s) => {
              const terms = hits.find((h) => h.num === s.num)?.terms ?? [];
              return (
                <ScenarioCard
                  key={s.num}
                  scenario={s}
                  categories={cats}
                  queryTerms={q.trim() ? terms : []}
                  snippet={q.trim() ? snippetFor(s, terms) : undefined}
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

// ---------------------------------------------------------------------------

function useTechniqueList(all: Scenario[]): TechniqueAgg[] {
  const map = new Map<string, TechniqueAgg>();
  for (const s of all) {
    for (const t of s.mitreFocus) {
      const agg = map.get(t.id) ?? { id: t.id, name: "", count: 0, severities: [], scenarioNums: [], categories: [] };
      if (!agg.name && t.name) agg.name = t.name;
      agg.count += 1;
      if (!agg.scenarioNums.includes(s.num)) agg.scenarioNums.push(s.num);
      if (!agg.categories.includes(s.categoryId)) agg.categories.push(s.categoryId);
      map.set(t.id, agg);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.id.localeCompare(b.id));
}

function FilterGroup({
  label,
  children,
  open,
}: {
  label: string;
  children: React.ReactNode;
  open?: boolean;
}) {
  return (
    <details open={open} className="group">
      <summary
        className="cursor-pointer select-none text-xs font-bold uppercase tracking-wider"
        style={{ color: "var(--tx3)" }}
      >
        <span className="mr-1 inline-block text-[0.6rem] transition-transform group-open:rotate-90">▶</span>
        {label}
      </summary>
      <div className="mt-2 flex max-h-64 flex-col gap-0.5 overflow-y-auto pr-1 scrollbar-thin">{children}</div>
    </details>
  );
}

function CheckRow({
  checked,
  label,
  onToggle,
  swatch,
  dotClass,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
  swatch?: string;
  dotClass?: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-[var(--bg3)]">
      <input type="checkbox" checked={checked} onChange={onToggle} />
      {swatch && <span className="inline-block h-2 w-2 rounded-full" style={{ background: swatch }} />}
      {dotClass && <span className={dotClass} />}
      <span className="truncate" style={{ color: "var(--tx2)" }}>
        {label}
      </span>
    </label>
  );
}

export function BrowseHeaderLink() {
  return (
    <Link className="link text-sm" to="/scenarios">
      Browse all scenarios →
    </Link>
  );
}
