import { Link, useNavigate } from "react-router-dom";
import { SearchBox } from "../components/SearchBox";
import { ErrorBox, Loading, ProgressRing, SeverityBadge } from "../components/ui";
import { useCategories, useScenarios } from "../lib/data";
import { useReview } from "../lib/review";
import { SEVERITY_COLOR, SEVERITY_ORDER } from "../lib/format";

const EXAMPLES = [
  { q: "impossible travel", label: "Impossible travel" },
  { q: "DNS tunnel", label: "DNS tunnel" },
  { q: "web shell", label: "Web shell" },
  { q: "T1486", label: "T1486 encryption" },
  { q: "password spray", label: "Password spray" },
  { q: "critical", label: "Critical (filter)" },
];

export function HomePage() {
  const scenarios = useScenarios();
  const categories = useCategories();
  const nav = useNavigate();
  const statusMap = useReview((s) => s.status);

  if (scenarios.error || categories.error) {
    return <ErrorBox error={scenarios.error ?? categories.error!} />;
  }
  if (!scenarios.data || !categories.data) return <Loading />;

  const all = scenarios.data.scenarios;
  const cats = categories.data.categories;

  const sevCounts = SEVERITY_ORDER.map((s) => ({
    sev: s,
    n: all.filter((x) => x.severity === s).length,
  }));
  const done = all.filter((s) => {
    const st = statusMap[s.code];
    return st === "reviewed" || st === "flagged";
  }).length;
  const unreviewed = all.find((s) => !statusMap[s.code] || statusMap[s.code] === "unreviewed");

  function sevMix(catFirst: number, catLast: number) {
    const list = all.filter((s) => s.num >= catFirst && s.num <= catLast);
    return SEVERITY_ORDER.map((s) => list.filter((x) => x.severity === s).length);
  }

  return (
    <div>
      {/* cyber hero */}
      <section
        // className="cyber-hero" 
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(7,7,9,0.9) 20%, rgba(7,7,9,0.35) 100%), url(theme/cyber_samurai_banner.jpg)",
        }}
      >
        <div className="cyber-hero-inner mx-auto max-w-6xl">
          <div className="max-w-2xl">
            <p className="cyber-kicker mb-4">Security Operations · 2026 Edition</p>
            <h1 className="text-3xl font-extrabold tracking-tight sm:text-5xl">
              SOC Investigation Scenarios
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed sm:text-base" style={{ color: "var(--tx2)" }}>
              Search and review the full blue-team playbook — phishing to ransomware,
              identity to web attacks — with the MITRE ATT&amp;CK index, method and appendices.
            </p>
            <div className="mt-7 max-w-2xl">
              <SearchBox
                variant="big"
                autoFocus
                placeholder="Press F to fSearch every scenario… e.g. QR phish, LSASS, MFA fatigue, T1078"
              />
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className="cyber-tag">Try</span>
                {EXAMPLES.map((ex) => (
                  <Link key={ex.q} to={`/scenarios?q=${encodeURIComponent(ex.q)}`} className="chip chip-hover">
                    {ex.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* quick stats */}
      {/* <section className="mx-auto mt-6 grid max-w-4xl gap-3 sm:grid-cols-3">
        <div className="card flex items-center gap-4 p-4">
          <ProgressRing value={done / all.length} />
          <div>
            <p className="text-xl font-extrabold">{done}<span className="text-sm font-normal" style={{ color: "var(--tx3)" }}>/{all.length}</span></p>
            <p className="text-xs" style={{ color: "var(--tx2)" }}>reviewed or flagged</p>
          </div>
        </div>
        <div className="card p-4">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--tx3)" }}>
            Severity
          </p>
          <div className="mt-2 flex flex-col gap-1">
            {sevCounts.map(({ sev, n }) => (
              <div key={sev} className="flex items-center gap-2 text-sm">
                <SeverityBadge severity={sev} />
                <span style={{ color: "var(--tx2)" }}>{n}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card flex flex-col justify-between gap-3 p-4">
          <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "var(--tx3)" }}>
            Study
          </p>
          <button className="btn" onClick={() => unreviewed && nav(`/scenarios/${unreviewed.code}`)}>
            ▶ Next unreviewed{unreviewed ? ` — ${unreviewed.code}` : ""}
          </button>
          <button
            className="btn btn--ghost"
            onClick={() => {
              const pick = all[Math.floor(Math.random() * all.length)];
              nav(`/scenarios/${pick.code}`);
            }}
          >
            🎲 Random scenario
          </button>
        </div>
      </section> */}

      {/* categories */}
      <section className="mt-10">
        <div className="mb-3 flex items-baseline justify-between">
          <h2 className="h2">Browse by category</h2>
          <Link className="link text-sm" to="/scenarios">All scenarios →</Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {cats.map((c) => {
            const mix = sevMix(c.first, c.last);
            const total = c.count;
            return (
              <Link key={c.id} to={`/scenarios?cat=${c.id}`} className="card card-hover p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold tracking-tight">{c.name}</h3>
                    <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: "var(--tx3)" }}>
                      {c.tagline || `${c.first}–${c.last}`}
                    </p>
                  </div>
                  <span className="text-lg font-extrabold tabular-nums" style={{ color: "var(--accent)" }}>
                    {total}
                  </span>
                </div>
                <div className="mt-3 flex h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--bg3)" }}>
                  {mix.map((n, i) =>
                    n ? (
                      <span
                        key={SEVERITY_ORDER[i]}
                        style={{
                          width: `${(n / total) * 100}%`,
                          background: SEVERITY_COLOR[SEVERITY_ORDER[i]],
                        }}
                      />
                    ) : null,
                  )}
                </div>
                <p className="mt-2 text-[0.68rem]" style={{ color: "var(--tx3)" }}>
                  scenarios {String(c.first).padStart(3, "0")}–{String(c.last).padStart(3, "0")}
                </p>
              </Link>
            );
          })}
        </div>
      </section>

      {all.length === 0 && (
        <div
          className="rounded-xl border border-dashed py-14 text-center text-sm"
          style={{ borderColor: "var(--line2)", color: "var(--tx3)" }}
        >
          No scenarios found in the data bundle.
        </div>
      )}
    </div>
  );
}
