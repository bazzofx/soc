# SOC Scenario Reviewer

A fast, offline-friendly **web app for browsing, reviewing and searching the 100 SOC
Investigation Scenarios** playbook (2026 Edition) — plus the Universal SOC Investigation
Method, Severity Matrix, Alert-State Vocabulary, a MITRE ATT&CK technique index and the
appendices.

Everything runs locally in the browser: all scenario content is converted from the source
PDF into JSON (`app/public/data/`) and searched instantly on the client with MiniSearch —
no backend, no accounts, no telemetry. Mark scenarios as reviewed/flagged, track
progress across all 100, and export/import your progress as JSON.

## Features

- 🔍 **Instant full-text search** over all 100 scenarios (press `F` for the search popup) with snippets & highlighting
- 🗂 **Filters**: category, severity, MITRE technique, review status — state lives in the URL
- 📖 **Structured scenario pages**: steps, pivots, decision-evidence table, containment/closure, copy-as-Markdown, print
- ✅ **Review workflow**: statuses, progress dashboard, export/import
- 🎯 **MITRE ATT&CK index**: which playbooks exercise each technique (+ attack.mitre.org links)
- 📚 **Method, Severity Matrix, Alert-State Vocabulary, Appendices A–E**
- 🎌 **Cyber Samurai theme** (dark, red accent, glass panels, samurai banner hero); keyboard navigation

## Requirements

- Node.js ≥ 20 and pnpm (or npm)
- Python 3 + `pymupdf` — only needed to regenerate data from the PDF

## Install & run

```bash
# 1. Install dependencies
cd app
pnpm install

# 2. Start the dev server
pnpm dev          # → http://localhost:5173
```

### Production build

```bash
cd app
pnpm build        # static output in app/dist/
pnpm preview      # serve the built app locally
```

`dist/` is fully static — copy it to any web server, or open `dist/index.html` directly.

### Deploy with Docker (build the site, serve it with your own nginx)

The image contains **no web server**. It builds the app and copies the compiled
static files into a directory on your host, which your existing nginx serves:

```bash
# 1. build the static-file image (from the project root)
docker build -t soc-bootcamp .

# 2. export the built site into the host web root (creates/populates it)
docker run --rm -v /var/www/soc-bootcamp:/out soc-bootcamp
```

> The `-t soc-bootcamp` tag is optional — untagged means `soc-bootcamp:latest`.
> Add a version if you like (`-t soc-bootcamp:v1.2`) and use that name in step 2.

Then point your host nginx at `/var/www/soc-bootcamp` — a ready-to-adapt server
block is in `deploy/soc_bootcamp.conf`:

```bash
sudo cp deploy/soc_bootcamp.conf /etc/nginx/conf.d/soc_bootcamp.conf
sudo nano /etc/nginx/conf.d/soc_bootcamp.conf     # set server_name (and listen)
sudo nginx -t && sudo systemctl reload nginx
```

Redeploys are just: `docker build …` then re-run the export container — nginx keeps
serving, no restart needed (new hashed asset names are picked up automatically).

**Alternative without running a container** (BuildKit):

```bash
docker build --target static --output type=local,dest=./deploy-out .
# → files land in ./deploy-out/srv/soc-app  (copy that to your web root)
```

Notes:
- The image only needs `app/` (source + committed data in `app/public/data/`);
  everything else is excluded via `.dockerignore`.
- If `/var/www/soc-bootcamp` is root-owned, run the export with `sudo` (or
  `sudo mkdir -p /var/www/soc-bootcamp && sudo chown $USER /var/www/soc-bootcamp` once).
- If you export into a directory that already has content, the copy adds/overwrites
  files. Clean it first (`sudo rm -rf /var/www/soc-bootcamp/*`) for a pristine deploy.

### Run the checks

```bash
cd app
pnpm typecheck    # TypeScript check
node scripts/qa.mjs   # data integrity + search acceptance tests
```

## (Re)generate the content from the PDF

Only needed once, or when the source PDF changes:

```bash
python tools/extract.py      # validates and writes app/public/data/*.json
node app/scripts/qa.mjs      # verify
```

## Project layout

```
raw guide/                       source PDF (untouched)
tools/extract.py                 PDF → JSON pipeline
analysis_stats.json              parsed QA seed for the extractor
app/                             the web app
  public/data/                   generated content bundles
  src/                           React source
  scripts/qa.mjs                 acceptance checks
  dist/                          production build output
SOC_Scenario_Reviewer_App_Plan.md  design & build plan (v1.1)
```
#
