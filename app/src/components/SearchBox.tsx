// Command-style scenario search box with a dropdown of instant results.
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCategories, useScenarios } from "../lib/data";
import { searchScenarios, snippetFor, tokenizeQuery } from "../lib/search";
import type { Scenario } from "../types";
import { Highlight, Loading } from "./ui";

interface Props {
  placeholder?: string;
  autoFocus?: boolean;
  variant?: "big" | "inline";
  inputId?: string;
}

export function SearchBox({ placeholder, autoFocus, variant = "inline", inputId }: Props) {
  const nav = useNavigate();
  const scenarios = useScenarios();
  const categories = useCategories();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<
    Array<{ scenario: Scenario; terms: string[] }>
  >([]);
  const [searching, setSearching] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const all = scenarios.data?.scenarios;
  const cats = categories.data?.categories;
  const tokens = tokenizeQuery(q);

  useEffect(() => {
    if (!all || !cats) return;
    if (!q.trim()) {
      setHits([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchScenarios(q, all, cats, 7);
        const items = res
          .map((h) => ({ scenario: all.find((s) => s.num === h.num)!, terms: h.terms }))
          .filter((x) => x.scenario);
        setHits(items);
      } finally {
        setSearching(false);
      }
    }, 120);
    return () => clearTimeout(t);
  }, [q, all, cats]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  function go(num: number) {
    setOpen(false);
    setQ("");
    nav(`/scenarios/${String(num).padStart(3, "0")}`);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setOpen(false);
    if (hits[0]) {
      nav(`/scenarios/${String(hits[0].scenario.num).padStart(3, "0")}`);
    } else {
      nav(`/scenarios?q=${encodeURIComponent(q)}`);
    }
  }

  const big = variant === "big";
  return (
    <div ref={boxRef} className="relative w-full">
      <form onSubmit={submit} role="search" className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" aria-hidden>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--tx3)" strokeWidth="2.4" strokeLinecap="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </span>
        <input
          className="field"
          id={inputId}
          style={big ? { padding: "0.8rem 1rem 0.8rem 2.6rem", fontSize: "1.05rem" } : { paddingLeft: "2.4rem" }}
          type="search"
          value={q}
          autoFocus={autoFocus}
          placeholder={placeholder ?? "Search 100 scenarios — e.g. impossible travel, T1110, web shell…"}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-label="Search scenarios"
        />
        {searching && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <Loading />
          </span>
        )}
      </form>
      {open && q.trim() && (
        <div className="rise card absolute z-40 mt-2 max-h-96 w-full overflow-y-auto p-2 scrollbar-thin" style={{ boxShadow: "var(--shadow)" }}>
          {hits.length === 0 && !searching ? (
            <p className="px-3 py-3 text-sm" style={{ color: "var(--tx3)" }}>
              No matches for “{q}”. Press Enter to open the full results page.
            </p>
          ) : (
            <ul>
              {hits.map(({ scenario: s, terms: ts }) => (
                <li key={s.num}>
                  <button
                    type="button"
                    className="flex w-full flex-col gap-0.5 rounded-lg px-3 py-2 text-left hover:bg-[var(--bg3)]"
                    onClick={() => go(s.num)}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      <span className="opacity-60" style={{ color: "var(--tx3)" }}>{s.code}</span>
                      <Highlight text={s.title} terms={tokens} />
                    </span>
                    {ts.length > 0 && (
                      <span className="text-xs" style={{ color: "var(--tx2)" }}>
                        {snippetFor(s, ts).slice(0, 140)}
                      </span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
