// Runtime QA for the SOC Scenario Reviewer data + search configuration.
// Mirrors the MiniSearch field/boost config from src/lib/search.ts and runs the
// acceptance queries from the plan. Exit code 0 = all checks pass.
import { readFileSync } from "node:fs";
import MiniSearch from "minisearch";

const DATA = new URL("../public/data/", import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, DATA), "utf8"));

const { scenarios } = read("scenarios.json");
const { categories } = read("categories.json");
const { techniques } = read("techniques.json");
const refs = read("references.json");
const meta = read("meta.json");

let failures = 0;
const check = (ok, label, detail = "") => {
  if (ok) console.log(`  PASS  ${label}`);
  else {
    failures++;
    console.log(`  FAIL  ${label} ${detail}`);
  }
};

console.log("== structural integrity ==");
check(scenarios.length === 100, "100 scenarios", `got ${scenarios.length}`);
check(
  scenarios.every((s, i) => s.num === i + 1 && s.code === String(i + 1).padStart(3, "0")),
  "codes contiguous 001..100",
);
check(
  categories.every((c) => scenarios.filter((s) => s.categoryId === c.id).length === c.count),
  "category counts match",
);
const sev = {};
for (const s of scenarios) sev[s.severity] = (sev[s.severity] ?? 0) + 1;
check(JSON.stringify(sev) === JSON.stringify({ Medium: 49, High: 42, Critical: 9 }),
  "severity distribution 49/42/9", JSON.stringify(sev));
check(
  scenarios.every(
    (s) =>
      s.title &&
      s.initialAlert &&
      s.objective &&
      s.severity &&
      Array.isArray(s.steps) && s.steps.length >= 6 &&
      s.pivots.length === 4 &&
      s.decisionEvidence.raisesConfidence.length &&
      s.decisionEvidence.benignOrContained.length &&
      Object.keys(s.closure).length === 5,
  ),
  "every scenario has required sections",
);
check(meta.counts.scenarios === 100, "meta.counts.scenarios === 100");
check(
  refs.method.length === 10 &&
    refs.severityMatrix.length === 4 &&
    refs.alertStates.length === 8 &&
    refs.appendixA.length === 9 &&
    refs.appendixD.length === 14,
  "references parsed (method 10 / matrix 4 / states 8 / A 9 / D 14)",
  JSON.stringify({ m: refs.method.length, mx: refs.severityMatrix.length, st: refs.alertStates.length, a: refs.appendixA.length, d: refs.appendixD.length }),
);
const techIds = new Set(scenarios.flatMap((s) => s.mitreFocus.map((t) => t.id)));
check(techIds.size === techniques.length, "techniques.json aggregates match scenario data",
  `derived ${techIds.size} vs index ${techniques.length}`);
check(
  techniques.every(
    (t) => t.scenarioNums.length === t.count &&
      t.scenarioNums.every((n) => scenarios.find((s) => s.num === n)?.mitreFocus.some((m) => m.id === t.id)),
  ),
  "technique counts/scenario links consistent",
);

// ---- search index (mirrors src/lib/search.ts) --------------------------
const catName = (id) => categories.find((c) => c.id === id)?.name ?? id;
const docFor = (s) => ({
  num: s.num,
  code: `${s.num} ${s.code}`,
  title: s.title,
  mitre: [...s.mitreFocus.map((t) => t.id), ...s.mitreFocus.map((t) => t.name)].join(" "),
  category: `${catName(s.categoryId)} ${s.categoryId}`,
  severity: s.severity,
  sources: s.primaryAlertSources.join(" "),
  entities: Object.values(s.exampleEntities).join(" "),
  objective: s.objective,
  alert: s.initialAlert,
  steps: s.steps.join(" "),
  body: [
    ...s.pivots.map((p) => p.text),
    ...s.decisionEvidence.raisesConfidence,
    ...s.decisionEvidence.benignOrContained,
    s.decisionEvidence.caseSpecific,
    ...Object.values(s.closure),
  ].join(" "),
});
const index = new MiniSearch({
  idField: "num",
  fields: ["code", "title", "mitre", "category", "severity", "sources", "entities", "objective", "alert", "steps", "body"],
  storeFields: ["num"],
  searchOptions: {
    boost: { code: 9, title: 8, mitre: 7, category: 6, severity: 5, sources: 5, entities: 4, objective: 3, alert: 3, steps: 2, body: 1 },
    prefix: true,
    fuzzy: 0.2,
    combineWith: "AND",
  },
});
index.addAll(scenarios.map(docFor));

const searchTop = (q, n = 20) =>
  index.search(q, { combineWith: "AND" })
    .concat(index.search(q, { combineWith: "OR" }))
    .slice(0, n)
    .map((r) => Number(r.id));
const uniq = (a) => [...new Set(a)];
const inTop = (ids, expected) => expected.filter((n) => ids.includes(n));

console.log("\n== acceptance queries (top results include expected scenarios) ==");
const cases = [
  ["impossible travel", [27, 41]],
  ["QR", [4]],
  ["T1110", [25, 39, 96]],
  ["password spray", [25, 39]],
  ["credential stuffing", [96]],
  ["DNS tunnel", [46]],
  ["web shell", [94]],
  ["lsass", [35]],
  ["67", [67]],
  ["scheduled task persistence", [19, 58]],
];
for (const [q, expect] of cases) {
  const hits = uniq(searchTop(q));
  const found = inTop(hits, expect);
  check(found.length === expect.length, `query "${q}"`, `found [${found}] of [${expect}] (top: ${hits.slice(0, 6).join(",")})`);
}
// technique coverage: scenarios whose mitreFocus lists T1486 must all surface
const t1486Focused = scenarios.filter((s) => s.mitreFocus.some((t) => t.id === "T1486")).map((s) => s.num);
const t1486 = inTop(uniq(searchTop("T1486")), t1486Focused);
check(t1486.length === t1486Focused.length, "T1486 surfaces all focus playbooks",
  `matched ${t1486.length}/${t1486Focused.length} [${t1486Focused}]`);

console.log(`\n== ${failures === 0 ? "ALL CHECKS PASSED" : failures + " CHECK(S) FAILED"} ==`);
process.exit(failures === 0 ? 0 : 1);
