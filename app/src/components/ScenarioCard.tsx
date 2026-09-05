import { Link } from "react-router-dom";
import { useReview } from "../lib/review";
import { categoryName } from "../lib/format";
import type { Category, Scenario } from "../types";
import { Chip, Highlight, SeverityBadge } from "./ui";

export function ScenarioCard({
  scenario,
  categories,
  queryTerms = [],
  snippet,
}: {
  scenario: Scenario;
  categories: Category[];
  queryTerms?: string[];
  snippet?: string;
}) {
  const status = useReview((s) => s.status[scenario.code] ?? "unreviewed");
  const cat = categoryName(categories, scenario.categoryId);
  return (
    <Link
      to={`/scenarios/${scenario.code}`}
      className="card card-hover flex flex-col gap-2.5 p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-bold tabular-nums" style={{ color: "var(--tx3)" }}>
          {scenario.code}
        </span>
        <div className="flex items-center gap-2">
          <span
            className={`status-dot status-dot--${status}`}
            title={`Status: ${status}`}
          />
          <SeverityBadge severity={scenario.severity} />
        </div>
      </div>

      <h3 className="text-[0.95rem] font-bold leading-snug tracking-tight">
        <Highlight text={scenario.title} terms={queryTerms} />
      </h3>

      {snippet && (
        <p className="line-clamp-2 text-xs leading-relaxed" style={{ color: "var(--tx2)" }}>
          <Highlight text={snippet} terms={queryTerms} />
        </p>
      )}

      <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
        <Chip title={`Category: ${cat}`}>{cat}</Chip>
        {scenario.mitreFocus.slice(0, 3).map((t) => (
          <Chip key={t.id} title={`${t.id}${t.name ? " — " + t.name : ""}`}>
            {t.id}
          </Chip>
        ))}
        {scenario.mitreFocus.length > 3 && (
          <Chip>+{scenario.mitreFocus.length - 3}</Chip>
        )}
      </div>
    </Link>
  );
}
