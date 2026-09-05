import { useEffect } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { SearchBox } from "./SearchBox";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/scenarios", label: "Scenarios" },
  { to: "/mitre", label: "MITRE ATT&CK" },
  { to: "/method", label: "Method" },
  { to: "/references", label: "References" },
  { to: "/report", label: "Report" },
  { to: "/progress", label: "Progress" },
];

export function Layout() {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        const el = document.getElementById("global-search") as HTMLInputElement | null;
        el?.focus();
        el?.select();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-30 border-b backdrop-blur"
        style={{
          background: "rgba(7, 7, 9, 0.72)",
          borderColor: "var(--line)",
          boxShadow: "0 1px 0 rgba(255, 46, 59, 0.12)",
        }}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-md text-sm font-black tracking-wide"
              style={{
                background: "linear-gradient(135deg, #ff2e3b, #b3121c)",
                color: "#fff",
                boxShadow: "0 0 16px rgba(255, 46, 59, 0.35)",
              }}
              aria-hidden
            >
              SOC
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-bold tracking-tight" style={{ fontFamily: "var(--font-display)" }}>
                SOC Scenarios
              </span>
              <span className="text-[0.65rem] uppercase tracking-widest" style={{ color: "var(--tx3)" }}>
                SOC Investigation Playbooks
              </span>
            </span>
          </NavLink>

          <nav
            className="order-3 -mx-1 flex w-full items-center gap-1  pb-1 sm:order-none sm:mx-0 sm:w-auto sm:pb-0"
            aria-label="Main"
          >
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `relative whitespace-nowrap rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? "" : "hover:opacity-90"
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? "#fff" : "var(--tx2)",
                  background: isActive ? "var(--accent-dim)" : "transparent",
                })}
              >
                {({ isActive }) => (
                  <>
                    {n.label}
                    {/* red underline marker like the reference tabs */}
                    <span
                      className="absolute inset-x-1 -bottom-[9px] h-0.5"
                      style={{
                        background: "var(--accent)",
                        boxShadow: "0 0 8px var(--accent-glow)",
                        transform: isActive ? "scaleX(1)" : "scaleX(0)",
                        transition: "transform 0.2s ease",
                      }}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto min-w-0 flex-1 sm:max-w-sm lg:max-w-md">
            <SearchBox inputId="global-search" placeholder="Search Attack Scenarios…" />
          </div>

          <span
            className="hidden items-center gap-1.5 rounded-md border px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.2em] lg:flex"
            style={{ borderColor: "rgba(255, 46, 59, 0.3)", color: "var(--accent)", background: "var(--accent-dim)" }}
            title="Local-only offline tool"
          >
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
              style={{ background: "var(--accent)", boxShadow: "0 0 8px var(--accent-glow)" }}
            />
            Local
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t py-4" style={{ borderColor: "var(--line)" }}>
        <p className="mx-auto w-full max-w-7xl px-4 text-center text-xs" style={{ color: "var(--tx3)" }}>
          SOC Scenario Reviewer — Cyber Samurai theme · built from “100 SOC Investigation
          Scenarios · 2026 Edition”. Press <span className="kbd">/</span> to search.
        </p>
      </footer>
    </div>
  );
}
