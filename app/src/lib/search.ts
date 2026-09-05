// Client-side full-text search over scenarios using MiniSearch.
import MiniSearch from "minisearch";
import type { Category, Scenario } from "../types";
import { categoryName, SYNONYMS } from "./format";

interface IndexDoc {
  num: number;
  code: string;
  title: string;
  mitre: string;
  category: string;
  severity: string;
  sources: string;
  entities: string;
  objective: string;
  alert: string;
  steps: string;
  body: string;
}

const FIELD_BOOST: Record<string, number> = {
  code: 9,
  title: 8,
  mitre: 7,
  category: 6,
  severity: 5,
  sources: 5,
  entities: 4,
  objective: 3,
  alert: 3,
  steps: 2,
  body: 1,
};

function docFor(sc: Scenario, categories: Category[]): IndexDoc {
  const textOf = (v: string[]) => v.join(" ");
  return {
    num: sc.num,
    code: `${sc.num} ${sc.code}`,
    title: sc.title,
    mitre: textOf([
      ...sc.mitreFocus.map((t) => t.id),
      ...sc.mitreFocus.map((t) => t.name),
    ]),
    category: `${categoryName(categories, sc.categoryId)} ${sc.categoryId}`,
    severity: sc.severity,
    sources: textOf(sc.primaryAlertSources),
    entities: textOf(Object.values(sc.exampleEntities)),
    objective: sc.objective,
    alert: sc.initialAlert,
    steps: textOf(sc.steps),
    body: textOf([
      ...sc.pivots.map((p) => p.text),
      ...sc.decisionEvidence.raisesConfidence,
      ...sc.decisionEvidence.benignOrContained,
      sc.decisionEvidence.caseSpecific,
      ...Object.values(sc.closure),
    ]),
  };
}

export interface Hit {
  num: number;
  score: number;
  terms: string[];
}

let indexPromise: Promise<MiniSearch> | null = null;
let indexForScenarios: Scenario[] | null = null;
let indexForCategories: Category[] | null = null;

function getIndex(scenarios: Scenario[], categories: Category[]): Promise<MiniSearch> {
  if (
    indexPromise &&
    indexForScenarios === scenarios &&
    indexForCategories === categories
  ) {
    return indexPromise;
  }
  indexForScenarios = scenarios;
  indexForCategories = categories;
  indexPromise = (async () => {
    const idx = new MiniSearch<IndexDoc>({
      idField: "num",
      fields: Object.keys(FIELD_BOOST),
      storeFields: ["num"],
      searchOptions: {
        boost: { ...FIELD_BOOST },
        prefix: true,
        fuzzy: 0.2,
        combineWith: "AND",
      },
    });
    idx.addAll(scenarios.map((s) => docFor(s, categories)));
    return idx;
  })();
  return indexPromise;
}

/** Normalise user input into search terms (lowercase, punctuation stripped). */
export function tokenizeQuery(raw: string): string[] {
  return raw
    .toLowerCase()
    .split(/[^a-z0-9.#-]+/)
    .filter((t) => t.length > 0 && /[a-z0-9]/.test(t));
}

/** Synonym group for a single token (the token itself + aliases). */
function synonymGroup(token: string): string[] {
  const group = [token];
  const expanded = SYNONYMS[token];
  if (expanded) {
    for (const alt of expanded.split(" ")) {
      if (!group.includes(alt)) group.push(alt);
    }
  }
  return group;
}

export async function searchScenarios(
  rawQuery: string,
  scenarios: Scenario[],
  categories: Category[],
  limit = 60,
): Promise<Hit[]> {
  const idx = await getIndex(scenarios, categories);
  const tokens = tokenizeQuery(rawQuery);
  if (tokens.length === 0) return [];

  // AND across token groups; if nothing found, retry with OR (better recall).
  let results = idx.search(tokens.join(" "), { combineWith: "AND" });
  if (results.length === 0 && tokens.length > 1) {
    results = idx.search(tokens.join(" "), { combineWith: "OR" });
  }
  // single short token: also try synonym expansion
  if (results.length === 0 && tokens.length === 1) {
    const group = synonymGroup(tokens[0]);
    if (group.length > 1) {
      results = idx.search(group.join(" OR "), { combineWith: "OR" });
    }
  }
  return results.slice(0, limit).map((r) => ({
    num: Number(r.id),
    score: r.score,
    terms: (r.terms ?? []).slice(0, 4),
  }));
}

/** Fields in priority order used to pick the best snippet source. */
function contentFields(sc: Scenario): Array<[string, string]> {
  return [
    ["title", sc.title],
    ["initialAlert", sc.initialAlert],
    ["objective", sc.objective],
    ["steps", sc.steps.join(" ")],
    ...sc.pivots.map((p): [string, string] => [p.label, p.text]),
    ["raisesConfidence", sc.decisionEvidence.raisesConfidence.join(" ")],
    ["benignOrContained", sc.decisionEvidence.benignOrContained.join(" ")],
    ...Object.entries(sc.closure),
  ];
}

/** Build a short snippet around the first matched term. */
export function snippetFor(sc: Scenario, terms: string[]): string {
  const wanted = terms.filter((t) => t.length >= 2);
  for (const [, text] of contentFields(sc)) {
    const low = text.toLowerCase();
    for (const term of wanted) {
      const at = low.indexOf(term);
      if (at >= 0) {
        const start = Math.max(0, at - 60);
        const end = Math.min(text.length, at + term.length + 130);
        return text.slice(start, end);
      }
    }
  }
  return "";
}
