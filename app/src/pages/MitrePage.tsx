import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ErrorBox, Loading, SeverityBadge } from "../components/ui";
import { useCategories, useScenarios, useTechniques } from "../lib/data";
import { attackMitreUrl } from "../lib/format";
import type { TechniqueAgg } from "../types";

export function MitrePage() {
  const scenarios = useScenarios();
  const techniques = useTechniques();
  const categories = useCategories();
  const [q, setQ] = useState("");
  const [params, setParams] = useSearchParams();
  const selected = params.get("t") ?? null;

  const allScen = scenarios.data?.scenarios;
  const techList = techniques.data?.techniques ?? [];

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return techList;
    return techList.filter((t) => `${t.id} ${t.name}`.toLowerCase().includes(needle));
  }, [techList, q]);

  const selectedTech = techList.find((t) => t.id === selected) ?? null;

  if (scenarios.error || techniques.error) {
    return <ErrorBox error={scenarios.error ?? techniques.error!} />;
  }
  if (!scenarios.data || !techniques.data || !categories.data) return <Loading />;

  const maxCount = Math.max(1, ...techList.map((t) => t.count));

  return (
    <div>
      <header className="mb-4">
        <h1 className="text-2xl font-extrabold tracking-tight">MITRE ATT&CK technique index</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--tx2)" }}>
          All techniques referenced in the 100 scenarios’ “MITRE ATT&amp;CK focus” fields —
          with the playbooks that exercise each one. Data: {techList.length} techniques.
        </p>
      </header>

      <div className="mb-4 max-w-xl">
        <input
          className="field"
          placeholder="Filter techniques — code or name, e.g. T1078 or “Valid Accounts”…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Filter techniques"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-1.5">
          {list.length === 0 && (
            <p className="py-10 text-center text-sm" style={{ color: "var(--tx3)" }}>
              No techniques match “{q}”.
            </p>
          )}
          {list.map((t) => {
            const active = selected === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setParams(active ? {} : { t: t.id }, { replace: true })}
                className="card flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={
                  active
                    ? { borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 9%, var(--bg1))" }
                    : undefined
                }
              >
                <span
                  className="h-8 w-1 shrink-0 rounded-full"
                  style={{
                    background: "var(--accent2)",
                    opacity: 0.25 + (t.count / maxCount) * 0.75,
                  }}
                  title={`appears in ${t.count} scenario(s)`}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold tabular-nums">{t.id}</span>
                  <span className="block truncate text-xs" style={{ color: "var(--tx2)" }}>
                    {t.name || "—"}
                  </span>
                </span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: "var(--accent)" }}>
                  {t.count}
                </span>
              </button>
            );
          })}
        </div>

        <aside>
          {selectedTech ? (
            <TechniqueDetail
              tech={selectedTech}
              scenariosByNum={allScen}
              onClose={() => setParams({}, { replace: true })}
            />
          ) : (
            <div className="card sticky top-20 p-5 text-sm" style={{ color: "var(--tx2)" }}>
              <p className="font-semibold" style={{ color: "var(--tx)" }}>
                Select a technique
              </p>
              <p className="mt-1.5 leading-relaxed">
                See which of the 100 playbooks exercise it, at what severities, and open
                the official ATT&amp;CK page.
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function TechniqueDetail({
  tech,
  scenariosByNum,
  onClose,
}: {
  tech: TechniqueAgg;
  scenariosByNum?: Array<{
    num: number;
    code: string;
    title: string;
    severity: import("../types").Severity;
  }>;
  onClose: () => void;
}) {
  const scen = (scenariosByNum ?? []).filter((s) => tech.scenarioNums.includes(s.num));
  return (
    <div className="card sticky top-20 p-5">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-extrabold tabular-nums">{tech.id}</h2>
        <button className="btn btn--ghost px-2 py-0.5 text-xs" onClick={onClose} aria-label="Close">
          ✕
        </button>
      </div>
      <p className="mt-0.5 text-sm font-semibold">{tech.name || "No name recorded in the playbook"}</p>
      <p className="mt-1 text-xs" style={{ color: "var(--tx3)" }}>
        Appears in {tech.count} scenario{tech.count === 1 ? "" : "s"}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {tech.severities.map((s) => (
          <SeverityBadge key={s} severity={s} />
        ))}
      </div>

      <a
        className="btn mt-4 w-full"
        href={attackMitreUrl(tech.id)}
        target="_blank"
        rel="noreferrer"
      >
        Open on attack.mitre.org ↗
      </a>

      <p className="mt-5 mb-1 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--tx3)" }}>
        Playbooks exercising {tech.id}
      </p>
      <ul className="flex max-h-96 flex-col gap-1 overflow-y-auto pr-1 scrollbar-thin">
        {scen.map((s) => (
          <li key={s.num}>
            <Link to={`/scenarios/${s.code}`} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-[var(--bg3)]">
              <span className="text-xs font-bold tabular-nums" style={{ color: "var(--tx3)" }}>{s.code}</span>
              <span className="min-w-0 flex-1 truncate text-sm">{s.title}</span>
              <SeverityBadge severity={s.severity} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
