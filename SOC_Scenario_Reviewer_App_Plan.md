# SOC Scenario Reviewer — Web App Plan & Implementation Guide

**Source material:** `raw guide/100 SOC Investigation Scenarios.pdf` (207 pages, "2026 Edition")
**Goal:** a modern web app to **browse, review, and instantly search** all 100 SOC investigation scenarios, plus the playbook's front-matter method, severity matrix, alert-state vocabulary, a **MITRE ATT&CK technique index**, and the appendices.
**Status:** Plan **v1.1** — decisions confirmed (§11), analysis grounded in the real PDF. Ready to build (M0 → M5).

---

## 1. What we found in the source PDF (analysis)

### 1.1 Document profile
- 207 PDF pages, clean text layer (author metadata: `python-docx`/Word → predictable extraction), English, ~597k characters of text.
- Text quality is good: curly double quotes and em dashes appear only occasionally; no mojibake in the actual text (earlier `�` artifacts were a console-encoding issue only).
- Every page ends with a literal footer line `Page N` (strip during extraction).

### 1.2 Top-level structure
| Part | Location | Content |
|---|---|---|
| Cover | p.1 | Title, category list |
| **The Universal SOC Investigation Method** | p.2 | 10 numbered investigation principles (validate alert → build timeline → scope entities → correlate → hypotheses → attack progression → contain → preserve evidence → closure criteria → improve detection) |
| **Practical Severity Matrix** | p.3 | Critical / High / Medium / Low × (typical meaning, examples, expected SOC posture) |
| **Alert-State Vocabulary** | p.3 | Definitions: Detected, Blocked, Allowed, Quarantined, Failed authentication, Successful authentication, True positive, Incident |
| Contents | p.4–5 | Auto-generated TOC |
| **10 attack-category sections** | p.6–205 | 100 scenarios, 001–100, each spanning 2 pages |
| **Appendix A** – Evidence Source Checklist | p.206 | Telemetry domains: Identity/IAM, Endpoint/EDR, Email/Collaboration, Network, DNS, Cloud/SaaS, Web/API, Data/DLP, Business context |
| **Appendix B** – Analyst Questions Before Closing Any Alert | p.206 | ~18 closing questions |
| **Appendix C** – Platform-Neutral Search Patterns | p.206–207 | Conceptual search-pattern recipes (e.g. DNS tunnel, external forwarding, web exploit success) |
| **Appendix D** – Incident Documentation Template | p.207 | 13-field documentation template |
| **Appendix E** – References & Version Notes | p.207 | NIST SP 800-61 R3, CSF 2.0, MITRE ATT&CK v19-era notes |

### 1.3 Category membership (deterministic numbering — a parser's best friend)
| # | Category | Scenarios | Count |
|---|---|---|---|
| 1 | Phishing & Social Engineering | 001–012 | 12 |
| 2 | Malware & Endpoint Compromise | 013–024 | 12 |
| 3 | Credential Abuse & Identity Attacks | 025–036 | 12 |
| 4 | VPN & Remote Access | 037–044 | 8 |
| 5 | DNS & Network Resolution | 045–052 | 8 |
| 6 | PowerShell & Script Abuse | 053–062 | 10 |
| 7 | Ransomware & Extortion | 063–074 | 12 |
| 8 | Cloud & SaaS | 075–084 | 10 |
| 9 | Insider Risk & Data Misuse | 085–092 | 8 |
| 10 | Web & Application Attacks | 093–100 | 8 |
| | | **Total** | **100** |

A category header page (name + tagline + "Primary evidence: …" line) sits at the top of the page where its first scenario starts (e.g. p.6 has the *Phishing* header **and** scenario 001), so boundaries can be derived from numbering alone and cross-checked against header text.

### 1.4 Per-scenario anatomy (identical for all 100 — verified by sampling across categories)
Each scenario = 2 consecutive PDF pages with this deterministic structure:

1. **Title line** — `NNN. <Scenario Name>` (e.g. `013. EDR Blocks Unknown Executable`).
2. **Meta strip** (borderless 4-column table, 2 value rows):
   - `Severity` → Critical | High | Medium | Low
   - `Primary alert source` → e.g. `Email gateway / user report / collaboration audit` (one or more sources, ` / `-separated)
   - `MITRE ATT&CK focus` → one or more technique codes + names, `; `-separated (e.g. `T1566.002 Spearphishing Link; T1078 Valid Accounts`)
   - `Example entities` → `User: n.sofia | Host: WS-HR-017 | External IP: 198.51.100.73` (every scenario includes User/Host/External IP; some add Account, Mailbox, Server, Device, API…)
3. **`Initial alert:`** — one-sentence alert description.
4. **`Investigation objective:`** — one-sentence objective.
5. **Framework note** — an identical boilerplate paragraph in every scenario ("Treat this as an evidence-building exercise, not a label…"). Duplicate content — collapse in the UI, keep in data.
6. **`Step-by-step investigation`** — numbered steps (≈13; numbered 1..N, several titled `Scenario-specific check k`).
7. **`Key pivots to run`** — four labelled paragraphs: *Time pivot*, *Entity pivot*, *Control pivot*, *Campaign pivot*.
8. **`Decision evidence`** — a real 2-column **table** (bordered; header row can end one page, body rows on the next): *Evidence that raises confidence* | *Evidence that may support benign/contained activity*; some scenarios append a "For this case, give special weight to: …" sentence inside the left column.
9. **`Containment, escalation and closure`** — five labelled paragraphs: *Containment*, *Escalate when*, *Closure criteria*, *Detection improvement* (ends with "…consider telemetry around: <scenario-specific hook>"), *Analyst discipline*. The *Escalate when*, *Closure criteria* and *Analyst discipline* paragraphs are near-identical across scenarios (boilerplate with a scenario-specific tail) — good candidates for diff-highlighting later, not v1.

### 1.5 Measured content statistics (parsed all 100 pages)
- **Severity distribution:** Medium 49 · High 42 · Critical 9 · Low 0 → filters should still offer Low for future content, but chips/badges can reflect reality (no Low cases in this edition).
- **MITRE focus:** 51 distinct techniques referenced across the 100 "focus" fields; top coverage — T1078 Valid Accounts (18), T1059 Command & Scripting (10), T1566 Phishing (9), T1098 Account Manipulation (8), T1204 User Execution (8), T1133 External Remote Services (7), T1071 (6), T1486 Data Encrypted for Impact (6), T1190 Exploit Public-Facing App (5), T1110 Brute Force (4), T1562 Impair Defenses (4), T1021 Remote Services (4), T1530 (4)…
- **Example-entity fields:** User/Host/External IP in all 100; Account 9, Mailbox 3, Device 2, Server 2, API 1.
- Structural validation succeeded: all 100 numbers 001–100 present and parseable, category map 100% consistent. Full per-scenario extract: `analysis_stats.json` (also the seed for QA during the build).

---

## 2. Product definition

### 2.1 Who it is for
SOC L1–L3 analysts, incident responders, detection engineers, trainers and blue-team learners who own this playbook and want it **searchable and reviewable** instead of flipping 207 PDF pages.

### 2.2 Jobs the app must do
1. **Find a scenario fast** — full-text search across titles, bodies, techniques, entities and alert sources; faceted filtering (category, severity, technique, alert source).
2. **Review a scenario in a structured reading mode** — clean typography for long-form steps, decision table rendered as a proper 2-column comparison, pivot/containment blocks easily scannable.
3. **Track study/review progress across all 100** — mark Unreviewed / In progress / Reviewed / Flagged, keep personal notes, jump to "next unreviewed", export/import state.
4. **Reference the framework** — Universal Method, Severity Matrix, Alert-State Vocabulary, and the five appendices in one click.
5. **Copy & print** — export a scenario as Markdown/print view for notes, tickets, or incident documentation (Appendix D is designed to be filled from these playbooks).

### 2.3 Explicit non-goals (v1)
- No editing/correction of scenario content in-app (content is data, versioned with the source PDF).
- No authentication, multi-user sync, or server-side search (see §8 options if you later want a team deployment).
- No "answers" engine — this is a search/review tool over the author's text, not a quiz or LLM summarizer (can be layered later).

---

## 3. Feature specification

### 3.1 Global navigation & quick search
- Sticky top bar on every screen with a **command-style quick search** (`/` keyboard shortcut focuses it) that jumps instantly to the best-matching scenario.
- Routes: dashboard, browse, scenario detail, method & reference, progress (see §6.3).

### 3.2 Dashboard (`/`)
- Hero search box with example query chips (`impossible travel`, `T1486`, `DNS tunnel`, `critical`).
- Category grid: 10 cards showing name, scenario count, severity mix, small progress ring.
- "Random scenario" and "Next unreviewed" actions.
- Progress snapshot (x/100 reviewed; flagged list count).

### 3.3 Browse & search (`/scenarios`)
- Left filter rail (collapsible, live counts):
  - Category (10, multi-select)
  - Severity (Critical/High/Medium; Low present in UI but empty state aware)
  - MITRE technique (auto-derived from data; searchable, e.g. `T1078`)
  - Primary alert source (auto-derived tokens: EDR, email gateway, SIEM, VPN, DNS, cloud, WAF…)
  - Review status (Unreviewed / In progress / Reviewed / Flagged)
  - "Only with notes"
- Results as a responsive grid of **scenario cards** (code, title, severity badge, category chip, technique chips, snippet with highlighted matches).
- URL state: `/scenarios?q=…&cat=ransomware&sev=critical` → shareable/deep-linkable; browser back/forward work.
- Result ordering: ranked relevance, then scenario number; status colour dot on cards.

### 3.4 Scenario detail (`/scenarios/:num`)
- Breadcrumb: category → scenario. Prev/next (by number) controls + `←/→` keys.
- Header: code, title, severity badge, category, alert-source chips, MITRE chips (with tactic names), example entities rendered as key/value chips, page reference (`PDF p.6–7`).
- Content sections, each with sticky in-page anchors:
  1. Initial alert + investigation objective (callout box).
  2. Step-by-step investigation — numbered list with the framework-note collapsed behind an "About this playbook" hint.
  3. Key pivots — four labelled cards.
  4. Decision evidence — real 2-column comparison table (confidence vs benign/contained), with case-specific note flagged.
  5. Containment / Escalate when / Closure criteria / Detection improvement / Analyst discipline.
- Detail actions: **Copy as Markdown**, **Print / save PDF**, status control, notes editor (auto-saved).

### 3.5 Review workflow & persistence
- Status + notes stored per scenario in the browser (IndexedDB via `idb-keyval`), with **Export state (JSON)** / **Import state** buttons for backup or moving machines.
- Progress UI: donut on dashboard, per-category bars, badge on cards.
- "Study mode": `Next unreviewed` walks 001→100 skipping non-unreviewed; optional shuffle.

### 3.6 Method & reference (`/method`, `/references`)
- `/method`: Universal SOC Investigation Method (10 steps) + Severity Matrix table + Alert-State Vocabulary glossary (linkable anchors).
- `/references`: tabbed Appendix A (checklist grouped by telemetry domain), B (closing questions), C (search patterns), D (documentation template), E (references with external links).
- These are static content rendered from the extracted reference JSON.

### 3.7 MITRE ATT&CK index (`/mitre`) — *confirmed addition*
- Auto-generated from scenario data: a searchable table of the **51 techniques** referenced across scenarios (code, name, occurrence count, severities of involved scenarios).
- Technique detail panel: list of all scenarios whose `mitreFocus` includes the code (with severity + category), click-through to the scenario; **"Open on attack.mitre.org"** link (`https://attack.mitre.org/techniques/<TID>/`, sub-techniques under `T1566/002`).
- Acts as an inverse index: "which playbooks exercise T1486?" → ransomware set.
- In v1 the tactic names come from the PDF's own technique-name text; enrichment from ATT&CK STIX data is a later, optional upgrade.

---

## 4. Data model & content pipeline

### 4.1 Target data layout (shipped with the app, versioned)
```
public/data/
  meta.json            # title, edition, source file, generatedAt, counts (100/10/51 techniques/…)
  categories.json      # [{id, name, tagline, evidenceNote, first, last, count}]
  scenarios.json       # full array (≈2–3 MB) — or split data/category/<id>.json for lazy load
  techniques.json      # derived index: [{id, name, slug, count, severities, scenarioNums}]  → /mitre
  references.json      # method, severityMatrix, alertStates, appendices A–E
```
`techniques.json` is generated from the same extraction run (aggregate `mitreFocus` across scenarios), so the MITRE index can never drift from scenario data.
Per-scenario schema (fields all verified present in the PDF):
```jsonc
{
  "num": 1, "code": "001",
  "title": "Spoofed Microsoft 365 Password Reset",
  "categoryId": "phishing",
  "severity": "Medium",                        // Critical | High | Medium | Low
  "primaryAlertSources": ["Email gateway", "user report", "collaboration audit"],
  "mitreFocus": [
    { "id": "T1566.002", "name": "Spearphishing Link" },
    { "id": "T1078",     "name": "Valid Accounts" }
  ],
  "exampleEntities": { "User": "n.sofia", "Host": "WS-HR-017", "External IP": "198.51.100.73" },
  "initialAlert": "Secure email gateway flags a message impersonating the identity team…",
  "objective": "Determine whether any recipient clicked, entered credentials, approved MFA…",
  "frameworkNote": "Treat this as an evidence-building exercise, not a label. …", // duplicate marker
  "steps": [
    "Preserve the message and metadata: …",
    "Validate sender authenticity: …"
    // … ≈13 items, incl. "Scenario-specific check k: …"
  ],
  "pivots": [
    { "label": "Time pivot",   "text": "expand 15 minutes before/after first, then 24 hours…" },
    { "label": "Entity pivot", "text": "…" }, { "label": "Control pivot", "text": "…" },
    { "label": "Campaign pivot", "text": "…" }
  ],
  "decisionEvidence": {
    "raisesConfidence":    ["Corroborating telemetry shows the suspicious action succeeded; …"],
    "benignOrContained":   ["The control clearly prevented the action before execution/access; …"],
    "caseSpecificWeight":  "Compare display name, envelope sender, Reply-To, SPF/DKIM/DMARC…"  // optional
  },
  "closure": {
    "containment":          "Purge malicious messages where authorised; block validated domains/URLs…",
    "escalateWhen":         "There is confirmed unauthorised access or execution, privileged identity…",
    "closureCriteria":      "The analyst has a documented timeline and scope; …",
    "detectionImprovement": "Convert the strongest evidence… consider telemetry around: Correlate any click…",
    "analystDiscipline":    "“Not observed” is not the same as “did not happen.” …"
  },
  "pages": [6, 7], "wordCount": 812
}
```

### 4.2 Extraction pipeline (a one-shot, re-runnable script `tools/extract.py`)
1. **Page text + blocks** via PyMuPDF; drop `Page N` footers (text below ~y=800).
2. **Scenario boundaries:** find `^NNN\. <Title>`; next-start page = +2. Category derived from number ranges, cross-checked with the category header lines present on first-scenario pages.
3. **Meta strip:** parse the block between title and `Initial alert`; severity via keyword row; alert sources split on ` / `; MITRE codes `\bT\d{4}(\.\d+)?\b` with names from the same run; entity fields from `Label: value` tokens split on ` | `.
4. **Sections:** cut the page text on the section headings; steps as numbered list items; pivots/closure blocks by label lines; rejoin hard line-wraps inside paragraphs.
5. **Decision-evidence table:** detect with `page.find_tables()`, but **merge header row (page 1) with body rows (page 2)** manually; extract the optional "give special weight to" tail sentence into `caseSpecificWeight`.
6. **Cleanup:** normalize whitespace, curly quotes → straight for indexing plus keep a display-clean copy, HTML-escape at render, collapse duplicate framework/closure boilerplate into markers.
7. **Validation gate (must pass before data ships):** exactly 100 scenarios, codes 001–100 contiguous; required fields non-empty for every scenario; severity ∈ enum; MITRE code regex; category counts (12/12/12/8/8/10/12/10/8/8); `wordCount` sanity band; diff against `analysis_stats.json`.
8. Emit `meta.json`, `categories.json`, `scenarios.json`, `references.json` + a **QA report** (this is also your regression suite if the source PDF is updated).

> The script needs `pymupdf` only; output is committed to the repo so the app itself never needs Python.

---

## 5. Search design (client-side, instant, offline)

### 5.1 Why client-side is enough
The whole corpus is ~600k characters (~2–3 MB JSON). MiniSearch builds an in-memory index in well under a second even on a phone; searches return in milliseconds with zero network. No backend, no hosting cost, works offline. Revisit only for team/hosted needs (§8).

### 5.2 Library recommendation
**MiniSearch** (≈8 kB, zero deps) over Fuse.js (weaker scoring/prefix) or Lunr (larger, UK-style stemming). MiniSearch gives weighted fields, prefix search, fuzzy matching, stop words, and a clean option to serialize the prebuilt index for instant boot.

### 5.3 Fields & weights
| Field | Weight | Notes |
|---|---|---|
| `code` + `num` | 9 | type `67` → 067; `001` exact |
| `title` | 8 | |
| `mitreFocus.id` + `.name` | 7 | `T1110`, `brute force` |
| `categoryId` + category name | 6 | |
| `severity` | 5 | `critical` finds the 9 |
| `primaryAlertSources` | 5 | `waf`, `edr`, `email gateway` |
| `exampleEntities` values | 4 | `ws-hr-017`, `n.sofia` |
| `objective` | 3 | |
| `initialAlert` | 3 | |
| `steps` | 2 | full text searchable |
| `pivots` / `decisionEvidence` / `closure` | 1–2 | |

### 5.4 Tokenization & match behaviour
- Normalize case, strip punctuation; keep `T####`/`T####.###`, numbers and hyphens (`dns-over-https`).
- Prefix matching on every term (typing `imposs` → "Impossible Travel").
- Mild fuzzy (max 1 edit) as fallback for misspellings.
- Multi-term queries = intersection (AND) across terms with per-document score boost for hits in high-weight fields.
- Synonyms map: `sign-in↔login`, `phish↔phishing`, `credential↔password`, `c2↔command and control`, `bec↔business email compromise`, `mfa`, `ransom↔ransomware`.
- Results: top 10 scenario cards with snippet + `<mark>` highlighting; match explanation line ("matched in title, technique T1078, steps").

### 5.5 Acceptance queries (verified against the built data)
| Query | Expects | Status |
|---|---|---|
| `impossible travel` | 027, 041 (VPN/SaaS) | ✅ |
| `QR` | 004 | ✅ |
| `T1110` | 025, 039, 096 | ✅ |
| `password spray` | 025, 039 (096 is credential-stuffing — reached via `T1110`/`credential stuffing`) | ✅ |
| `credential stuffing` | 096 | ✅ |
| `DNS tunnel` | 046 | ✅ |
| `web shell` | 094 | ✅ |
| `lsass` | 035 | ✅ |
| `67` (code) | 067 PsExec ransomware propagation | ✅ |
| `scheduled task persistence` | 019, 058 | ✅ |
| `T1486` | all focus playbooks surface: 063, 066, 068, 072, 073, 074 | ✅ |
| severity filter `Critical` | 9 results (distribution Medium 49 / High 42 / Critical 9) | ✅ |

The automated harness lives at `app/scripts/qa.mjs` and runs against `public/data`.

---

## 6. UI / UX plan

### 6.1 Look & feel
- Default **dark theme** (SOC-friendly), light theme option; accent per severity.
- Severity palette from the source semantics: Critical `red`, High `orange`, Medium `yellow`, Low `slate/grey`.
- Typography tuned for long numbered procedures; tables compare cleanly at ≥900 px, stack into cards under that.

### 6.2 Component inventory
`CommandSearch` · `FilterRail` (facets + live counts) · `ScenarioCard` · `ResultList` · `SeverityBadge` · `CategoryChip` · `TechniqueChip` · `EntityChips` · `DetailSections` (steps/pivots/decision/closure) · `DecisionTable` (2-col) · `StatusControl` (4 states) · `NotesEditor` (autosave) · `ProgressRing/Bar` · `CopyMarkdown` · `PrevNextNav` · `RandomScenario` · `ExportImport` · `TechniqueIndex` (MITRE table + detail panel)

### 6.3 Routes
| Route | View |
|---|---|
| `/` | Dashboard (search, categories, progress) |
| `/scenarios` | Browse + search results (query/filter state in URL) |
| `/scenarios/:num` | Scenario detail (001–100; unknown → friendly 404) |
| `/method` | Universal Method + Severity Matrix + Alert-State Vocabulary |
| `/mitre` | MITRE ATT&CK technique index (51 techniques, scenario cross-refs, attack.mitre.org links) |
| `/references` | Appendices A–E (tabs/anchors) |
| `/progress` | Review status overview + export/import |

### 6.4 Accessibility & ergonomics
- `/` focuses search; `←`/`→` prev/next scenario; `n` next unreviewed; `e` export.
- Full keyboard operability, `aria` labels, contrast-safe chips, `prefers-reduced-motion`.
- Responsive: usable on phone for quick lookup; desktop optimised for review.

---

## 7. Recommended tech stack (Option A — static-first PWA)

| Layer | Choice | Why |
|---|---|---|
| Build | **Vite 6 + React 19 + TypeScript** | Fast dev loop, static output, typed data |
| Styling | **Tailwind CSS v4** | Design-token friendly, dark theme |
| Routing | **React Router 7** | URL-driven search state |
| Search | **MiniSearch** (+ optional prebuilt index) | Instant offline full-text, weighted |
| Persistence | **idb-keyval** (IndexedDB) + **localStorage** for prefs | Notes/status survive reloads |
| State | React context/zustand (small) | Status/notes/UI prefs |
| PWA | **vite-plugin-pwa** | Offline install later (optional, v1.5) |
| Deploy | Static host: Netlify/Vercel/GitHub Pages/any folder | Zero backend |

Project shape (as built in this workspace):
```
soc_100_app/
  raw guide/100 SOC Investigation Scenarios.pdf   # source (untouched)
  analysis_stats.json                             # parsed QA seed
  SOC_Scenario_Reviewer_App_Plan.md               # this plan (v1.1)
  tools/extract.py                                # PDF → JSON pipeline (writes app/public/data)
  app/
    package.json · pnpm-lock.yaml · vite.config.ts · index.html
    public/data/   # generated: meta | categories | scenarios | techniques | references .json + qa-report.txt
    src/           # React app: components/, pages/, lib/ (data, search, review, markdown, format), types.ts
    scripts/qa.mjs # runtime acceptance harness (node scripts/qa.mjs)
    dist/          # production build output (static, data included)
  .pnpm-store/     # pnpm package cache (created inside workspace under sandboxed runs; safe to delete)
```

**Alternatives (swap in only if requirements change — see §11):**
- **Option B — Team/hosted:** Next.js (or FastAPI) + SQLite FTS5/Postgres + a real search engine (Meilisearch/Typesense), auth, shared notes/sync. More moving parts; needed only for multi-analyst teams.
- **Option C — Zero-tool single file:** one static HTML+JS+embedded JSON (MiniSearch in a `<script>`). Fine as a fallback artefact, weak for maintainability.

---

## 8. Roadmap & milestones

| # | Milestone | Deliverables | Exit criteria | Effort (approx.) |
|---|---|---|---|---|
| M0 | Decisions + scaffold | Confirm §11 choices; init Vite app, data folder, CI-less QA script | App boots, shows version banner | 0.5 d |
| M1 | Extraction pipeline | `tools/extract.py` → validated `data/*.json` + QA report | Validation gate green (100 scenarios, counts, fields) | 1–2 d |
| M2 | Browse + detail | Category grid, scenario cards, full structured detail page, print view | Spot-check 10 scenarios across 10 categories render identically to PDF | 1–2 d |
| M3 | Search + filters | MiniSearch index, command search, filter rail, snippets, URL state, highlighting | §5.5 acceptance queries pass | 1–2 d |
| M4 | Review workflow | Status, notes, progress, export/import, next-unreviewed | Round-trip export→import preserves state | 1 d |
| M5 | Polish + QA | Dark/light themes, a11y pass, offline/PWA, README, full QA checklist | Automated + manual QA over all 100; fixes closed | 1–2 d |
| | | **Total** | | **≈ 6–9 working days** |

---

## 9. QA checklist (definition of done)
- [ ] QA report from M1: 100/100 scenarios, contiguous codes, correct category counts, severity distribution 49/42/9, ≥51 distinct MITRE codes.
- [ ] Every scenario detail page renders all five content blocks; spot-check each category.
- [ ] §5.5 acceptance queries return the expected scenarios (and rank them sensibly).
- [ ] MITRE index lists 51 techniques with correct counts; T1486 → ransomware scenarios; attack.mitre.org links resolve.
- [ ] Filters combine (category × severity × status × technique); URL round-trips via copy/paste.
- [ ] Export/import preserves notes + status; page reload keeps state.
- [ ] Copy-as-Markdown for scenario 001 matches the PDF content faithfully.
- [ ] Keyboard shortcuts, `/` search, prev/next work; Lighthouse a11y ≥ 90.

## 10. Risks & mitigations
| Risk | Mitigation |
|---|---|
| Extraction edge cases (decision table spans page break; header values wrap) | Handle at pipeline level with explicit merge + wrap-join; validation gate catches regressions |
| Boilerplate text duplicated 100× bloats search results | Keep in data (searchable), collapse in UI via `frameworkNote` marker |
| Source PDF updates → drift | Re-run pipeline; `meta.json` records source hash + generatedAt; QA diff |
| Reproduction/licence of the PDF content | Keep app private/local by default; if publishing publicly, confirm rights and attribute; data stays as JSON so removal is trivial |
| Low/empty facet combos | UI shows live counts and a clear empty state with "clear filters" |

## 11. Confirmed decisions (locked for v1.1)
| # | Decision | Choice |
|---|---|---|
| 1 | Distribution | ★ **Local/private static app** (Option A) — no backend; client-side search; deployable to any static host later |
| 2 | Review features | **Full review workflow in v1** — status (Unreviewed/In progress/Reviewed/Flagged), notes, progress, export/import |
| 3 | Scope | **Everything** — scenarios + Method, Severity Matrix, Alert-State Vocabulary, Appendices A–E, **and a MITRE ATT&CK technique index** (§3.7) |
| 4 | Stack | **React + TypeScript + Vite + Tailwind CSS** + MiniSearch + idb-keyval (local persistence) |

Remaining free choices at build time (no re-plan needed): deployment target (none yet — local dev server first), PWA/offline packaging (nice-to-have after M4), and whether to enrich technique names from ATT&CK STIX later.

---

*Prepared from a full structural + content analysis of the source PDF (all 100 scenarios parsed and validated; per-scenario QA seed in `analysis_stats.json`).*
