import { useEffect, useState } from "react";
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

function isTyping(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
}

export function Layout() {
  const [searchOpen, setSearchOpen] = useState(false);

  // keyboard: F toggles the search modal, Escape closes it
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setSearchOpen(false);
        return;
      }
      const k = e.key.toLowerCase();
      if (k === "f" && !isTyping(e.target) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // lock body scroll while the modal is open
  useEffect(() => {
    document.body.style.overflow = searchOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [searchOpen]);

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
            <SearchBox inputId="global-search" placeholder="Search Attack Scenarios… (F)" />
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
            ALERT
          </span>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t py-4" style={{ borderColor: "var(--line)" }}>
        <p className="mx-auto w-full max-w-7xl px-4 text-center text-xs" style={{ color: "var(--tx3)" }}>
          SOC Scenario Reviewer — Cyber Samurai theme · built from “100 SOC Investigation
          Scenarios · 2026 Edition”. Press <span className="kbd">F</span> to search.
        </p>
      </footer>

      {/* search modal (F key) */}
      {searchOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 pt-[12vh] pb-10"
          role="dialog"
          aria-modal="true"
          aria-label="Search scenarios"
        >
          <div
            className="absolute inset-0"
            style={{ background: "rgba(4, 4, 6, 0.78)", backdropFilter: "blur(6px)" }}
            onClick={() => setSearchOpen(false)}
          />
          <div className="rise card relative z-10 w-full max-w-2xl p-4" style={{ boxShadow: "var(--shadow)" }}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="cyber-kicker" style={{ fontSize: "0.62rem", letterSpacing: "0.22em" }}>
                Search scenarios
              </p>
              <button
                className="btn btn--ghost px-2 py-0.5 text-xs"
                onClick={() => setSearchOpen(false)}
              >
                Esc ✕
              </button>
            </div>
            <SearchBox
              variant="big"
              autoFocus
              inputId="modal-search"
              onPick={() => setSearchOpen(false)}
              placeholder="Search Attack Scenarios… type to filter, Enter opens the top result"
            />
            <p className="mt-2 text-center text-[0.68rem]" style={{ color: "var(--tx3)" }}>
              Press <span className="kbd">F</span> again or <span className="kbd">Esc</span> to close
            </p>
          </div>
        </div>
      )}

      {/* staticMind mascot — a bit of personality on every page */}
      <div className="mascot-wrap fixed bottom-3 right-3 z-20">
        <span
          className="glitch-tooltip pointer-events-none absolute bottom-full right-0 mb-2 block w-max max-w-[240px] rounded-lg border px-3 py-2 text-[0.72rem] leading-snug"
          style={{ borderColor: "#2a2a2e", boxShadow: "0 0 24px rgba(0,0,0,0.6)" }}
        >
          “The quieter I become, the more I can hear.”
        </span>
        <img
          src="theme/staticMind.gif"
          alt=""
          aria-hidden="true"
          className="h-16 w-16 rounded-2xl object-cover opacity-80 transition-opacity hover:opacity-100"
          style={{ border: "1px solid var(--line2)", boxShadow: "0 0 18px rgba(255, 46, 59, 0.25)" }}
        />
      </div>
    </div>
  );
}
