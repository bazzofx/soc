// Shared lookup helpers and severity/technique constants.
import type { Category, Scenario, Severity } from "../types";

export const SEVERITY_ORDER: Severity[] = ["Critical", "High", "Medium", "Low"];

export const SEVERITY_COLOR: Record<Severity, string> = {
  Critical: "#ff2e3b",
  High: "#f59e0b",
  Medium: "#facc15",
  Low: "#6f7385",
};

/** map technique id (T1566.002) to an attack.mitre.org URL */
export function attackMitreUrl(id: string): string {
  if (id.includes(".")) {
    const [base, sub] = id.split(".");
    return `https://attack.mitre.org/techniques/${base}/${sub}/`;
  }
  return `https://attack.mitre.org/techniques/${id}/`;
}

export function categoryName(categories: Category[], id?: string): string {
  return categories.find((c) => c.id === id)?.name ?? id ?? "";
}

export function byNum(scenarios: Scenario[]): Map<number, Scenario> {
  return new Map(scenarios.map((s) => [s.num, s]));
}

/** Synonym expansion for search queries (longest keys first). */
export const SYNONYMS: Record<string, string> = {
  "sign-in": "sign-in login signin",
  "sign in": "sign-in login signin",
  login: "sign-in login signin",
  c2: "c2 command-and-control beacon",
  "command and control": "c2 command-and-control",
  mfa: "mfa multifactor",
  phish: "phishing phish",
  rans: "ransom ransomware",
  creds: "credential credentials",
  exec: "execution execute",
};
