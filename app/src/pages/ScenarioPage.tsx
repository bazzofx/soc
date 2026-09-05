import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ScenarioDetailView } from "../components/ScenarioDetailView";
import { ErrorBox, Loading } from "../components/ui";
import { useCategories, useScenarios } from "../lib/data";

export function ScenarioPage() {
  const { code = "" } = useParams();
  const nav = useNavigate();
  const scenarios = useScenarios();
  const categories = useCategories();
  const num = parseInt(code, 10);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "ArrowLeft" && num > 1) {
        nav(`/scenarios/${String(num - 1).padStart(3, "0")}`);
      } else if (e.key === "ArrowRight" && num < 100) {
        nav(`/scenarios/${String(num + 1).padStart(3, "0")}`);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [num, nav]);

  if (scenarios.error || categories.error) {
    return <ErrorBox error={scenarios.error ?? categories.error!} />;
  }
  if (!scenarios.data || !categories.data) return <Loading label={`Loading scenario ${code}…`} />;

  const scenario = scenarios.data.scenarios.find((s) => s.num === num);
  if (!scenario) {
    return (
      <div className="mx-auto max-w-xl py-16 text-center">
        <p className="text-5xl" style={{ color: "var(--tx3)" }}>404</p>
        <h1 className="mt-3 text-xl font-bold">Scenario {code} not found</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--tx2)" }}>
          Scenarios are numbered 001–100.
        </p>
        <Link className="btn mt-5" to="/scenarios">Browse scenarios</Link>
      </div>
    );
  }

  return <ScenarioDetailView scenario={scenario} categories={categories.data.categories} />;
}
