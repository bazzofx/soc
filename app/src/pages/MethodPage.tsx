import { ErrorBox, Loading } from "../components/ui";
import { useReferences } from "../lib/data";

export function MethodPage() {
  const refs = useReferences();
  if (refs.error) return <ErrorBox error={refs.error} />;
  if (!refs.data) return <Loading />;
  const { method, severityMatrix, alertStates } = refs.data;

  return (
    <div className="mx-auto max-w-4xl">
      <header className="mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight">The Universal SOC Investigation Method</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--tx2)" }}>
          The 10 principles every scenario in this playbook follows — straight from the front matter.
        </p>
      </header>

      <ol className="flex flex-col gap-3">
        {method.map((step, i) => {
          const m = step.match(/^(.*?)(?::\s*)(.*)$/);
          const head = m?.[1] ?? step;
          const rest = m?.[2] ?? "";
          return (
            <li key={i} className="card flex gap-4 p-4">
              <span className="step-num">{i + 1}</span>
              <div>
                <p className="font-bold">{head}</p>
                {rest && <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--tx2)" }}>{rest}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <section className="mt-10">
        <h2 className="h2 mb-3 text-xl">Practical Severity Matrix</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr style={{ borderBottom: "1px solid var(--line)" }}>
                {["Severity", "Typical meaning", "Examples", "Expected SOC posture"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-xs font-bold uppercase tracking-wider" style={{ color: "var(--tx3)" }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {severityMatrix.map((row) => (
                <tr key={row.severity} style={{ borderBottom: "1px solid var(--line)" }}>
                  <td className="px-4 py-3">
                    <span
                      className={`sev ${
                        row.severity === "Critical"
                          ? "sev--critical"
                          : row.severity === "High"
                            ? "sev--high"
                            : row.severity === "Medium"
                              ? "sev--medium"
                              : "sev--low"
                      }`}
                    >
                      {row.severity}
                    </span>
                  </td>
                  <td className="px-4 py-3 align-top leading-relaxed" style={{ color: "var(--tx2)" }}>
                    {row.meaning}
                  </td>
                  <td className="px-4 py-3 align-top leading-relaxed" style={{ color: "var(--tx2)" }}>
                    {row.examples}
                  </td>
                  <td className="px-4 py-3 align-top leading-relaxed" style={{ color: "var(--tx2)" }}>
                    {row.posture}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="h2 mb-3 text-xl">Alert-State Vocabulary</h2>
        <p className="mb-3 text-sm" style={{ color: "var(--tx2)" }}>
          What each alert-state word really means when you are judging evidence.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {alertStates.map((a) => (
            <div key={a.term} className="card p-4" id={a.term.toLowerCase().replace(/\s+/g, "-")}>
              <p className="font-bold" style={{ color: "var(--accent)" }}>{a.term}</p>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--tx2)" }}>
                {a.definition}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
