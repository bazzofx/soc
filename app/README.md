# SOC Scenario Reviewer

A fast, offline-friendly web app for **browsing, reviewing, and searching the 100 SOC
Investigation Scenarios** playbook (“2026 Edition”), plus the Universal SOC Investigation
Method, Severity Matrix, Alert-State Vocabulary, a **MITRE ATT&CK technique index** and the
appendices.

Built from the source PDF in `../raw guide/100 SOC Investigation Scenarios.pdf` — no backend,
all content shipped as JSON and searched client-side (MiniSearch).

## Features

- **Instant full-text search** over all 100 scenarios (titles, steps, techniques, entities,
  alert sources…) with ranking, snippets and `<mark>` highlighting — press `/` anywhere.
- **Faceted browsing**: filter by category, severity, MITRE technique, review status, notes.
  Filter/query state lives in the URL, so results are shareable and back/forward works.
- **Structured detail pages**: initial alert & objective, numbered step-by-step
  investigation, four pivots, the two-column *decision evidence* comparison, and the
  containment/escalation/closure block — with “copy as Markdown” and print.
- **Review workflow**: mark scenarios Unreviewed / In progress / Reviewed / Flagged, keep
  notes per scenario, track progress per category, export/import state as JSON.
- **MITRE ATT&CK index** (`/mitre`): all techniques referenced by the playbook, which
  scenarios exercise each one, severity mix, and links to attack.mitre.org.
- **Method & references**: the 10-step universal method, severity matrix, alert-state
  vocabulary and Appendices A–E.
- Dark/light themes; keyboard navigation (←/→ between scenarios).

## Project layout

| Path | Purpose |
|---|---|
| `public/data/*.json` | Generated content bundles (scenarios, categories, techniques, references, meta) + QA report |
| `scripts/qa.mjs` | Runtime acceptance harness: `node scripts/qa.mjs` |
| `../tools/extract.py` | PDF → JSON extraction pipeline (run once, or when the PDF changes) |
| `../analysis_stats.json` | Parsed QA seed used by the extractor’s self-check |

## Getting started

```bash
# 1. (optional) (Re)generate the data bundles from the source PDF — needs Python + pymupdf
python ../tools/extract.py          # writes public/data/*.json + qa-report.txt
# exit code 0 = zero warnings; the script also prints a QA report

# 2. Install and run (Node ≥ 20, pnpm recommended)
pnpm install
pnpm dev                            # dev server → http://localhost:5173
pnpm typecheck                      # TypeScript check
node scripts/qa.mjs                 # data + search acceptance checks
pnpm build                          # production build → dist/
pnpm preview                        # serve the built app
```

> **Note (sandboxed/CI shells):** Vite/esbuild spawn a native helper process over stdio
> pipes; in restricted shells (e.g. some sandboxed terminals) run `pnpm dev`/`pnpm build`
> with permission to spawn child processes.

`dist/` is fully static: copy it anywhere (or double-click `dist/index.html`; routing is
hash-based) or host on Netlify/Vercel/GitHub Pages. All data stays local to the browser.

## Keeping state

Review statuses and notes are stored in IndexedDB **in the browser** under
`soc-review-state-v1`. Use **Progress → Export state** to back up, and **Import state** to
restore on another machine/browser.

## Regenerating content

If the source PDF is updated:

```bash
python ../tools/extract.py
node scripts/qa.mjs
pnpm build
```

The extractor validates 100 contiguous scenarios, category/severity counts, required
sections per scenario, technique aggregation and reference content before writing.
