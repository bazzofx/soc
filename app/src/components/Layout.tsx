import { useEffect, useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { SearchBox } from "./SearchBox";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/scenarios", label: "Scenarios" },
  { to: "/mitre", label: "MITRE ATT&CK" },
  { to: "/method", label: "Method" },
  { to: "/references", label: "References" },
  { to: "/progress", label: "Progress" },
];

export function Layout() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    const root = document.documentElement.getAttribute("data-theme");
    return root === "light" ? "light" : "dark";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      localStorage.setItem("soc-theme", theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

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
        style={{ background: "color-mix(in srgb, var(--bg) 82%, transparent)", borderColor: "var(--line)" }}
      >
        <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center gap-3 px-4 py-2.5">
          <NavLink to="/" className="flex items-center gap-2.5">
            <span
              className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black"
              style={{ background: "var(--accent)", color: "#04121f" }}
              aria-hidden
            >
              SOC
            </span>
            <span className="hidden flex-col leading-tight sm:flex">
              <span className="text-sm font-bold tracking-tight">Scenario Reviewer</span>
              <span className="text-[0.65rem]" style={{ color: "var(--tx3)" }}>
                100 SOC investigation playbooks
              </span>
            </span>
          </NavLink>

          <nav className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto pb-1 sm:order-none sm:mx-0 sm:w-auto sm:pb-0" aria-label="Main">
            {NAV.map((n) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors ${
                    isActive ? "" : "hover:opacity-80"
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? "var(--accent)" : "var(--tx2)",
                  background: isActive ? "color-mix(in srgb, var(--accent) 12%, transparent)" : "transparent",
                })}
              >
                {n.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto min-w-0 flex-1 sm:max-w-sm lg:max-w-md">
            <SearchBox inputId="global-search" placeholder="Search 100 scenarios… ( / )" />
          </div>

          <button
            type="button"
            className="btn btn--ghost px-2.5"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            aria-label="Toggle color theme"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t py-4" style={{ borderColor: "var(--line)" }}>
        <p className="mx-auto w-full max-w-7xl px-4 text-center text-xs" style={{ color: "var(--tx3)" }}>
          SOC Scenario Reviewer — built from “100 SOC Investigation Scenarios · 2026 Edition”.
          Personal study &amp; review tool. Press <span className="kbd">/</span> to search.
        </p>
      </footer>
    </div>
  );
}
