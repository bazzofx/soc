// Data model — mirrors the JSON produced by tools/extract.py

export type Severity = "Critical" | "High" | "Medium" | "Low";

export interface MitreFocus {
  id: string; // e.g. T1566.002
  name: string; // e.g. Spearphishing Link
}

export interface Pivot {
  label: string; // Time pivot | Entity pivot | Control pivot | Campaign pivot
  text: string;
}

export interface DecisionEvidence {
  raisesConfidence: string[];
  benignOrContained: string[];
  caseSpecific: string;
}

export interface Scenario {
  num: number;
  code: string; // "001"
  title: string;
  categoryId: string;
  severity: Severity;
  primaryAlertSources: string[];
  mitreFocus: MitreFocus[];
  exampleEntities: Record<string, string>;
  initialAlert: string;
  objective: string;
  frameworkNote: string; // identical boilerplate across scenarios
  steps: string[];
  pivots: Pivot[];
  decisionEvidence: DecisionEvidence;
  closure: Record<string, string>; // Containment | Escalate when | Closure criteria | Detection improvement | Analyst discipline
  pages: [number, number];
}

export interface Category {
  id: string;
  name: string;
  tagline: string;
  primaryEvidence: string;
  first: number;
  last: number;
  count: number;
}

export interface TechniqueAgg {
  id: string;
  name: string;
  count: number;
  severities: Severity[];
  scenarioNums: number[];
  categories: string[];
}

export interface Meta {
  title: string;
  subtitle: string;
  edition: string;
  sourceFile: string;
  sourcePages: number;
  sourceSha256: string;
  generatedAt: string;
  counts: {
    scenarios: number;
    categories: number;
    techniques: number;
    bySeverity: Record<string, number>;
    byCategory: Record<string, number>;
  };
}

export interface LabeledText {
  label: string;
  text: string;
}

export interface SeverityRow {
  severity: string;
  meaning: string;
  examples: string;
  posture: string;
}

export interface AlertState {
  term: string;
  definition: string;
}

export interface References {
  method: string[];
  severityMatrix: SeverityRow[];
  alertStates: AlertState[];
  appendixA: LabeledText[];
  appendixB: string[];
  appendixC: LabeledText[];
  appendixD: LabeledText[];
  appendixE: string[];
}

// Review workflow state
export type ReviewStatus = "unreviewed" | "progress" | "reviewed" | "flagged";

export interface ReviewState {
  version: number;
  exportedAt?: string;
  status: Record<string, ReviewStatus>; // keyed by scenario code "001"
  notes: Record<string, string>;
}

export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  unreviewed: "Unreviewed",
  progress: "In progress",
  reviewed: "Reviewed",
  flagged: "Flagged",
};
