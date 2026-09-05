#!/usr/bin/env python3
"""
tools/extract.py — PDF -> JSON pipeline for '100 SOC Investigation Scenarios.pdf'.

Reads the source PDF, parses all 100 scenario pages plus the front-matter
(Method, Severity Matrix, Alert-State Vocabulary) and the appendices, and
writes validated JSON bundles into app/public/data/ (meta, categories,
scenarios, techniques, references) plus a QA report.

Only external dependency: pymupdf.
Run:  python tools/extract.py
"""
from __future__ import annotations

import datetime
import json
import os
import re
import sys

import pymupdf  # PyMuPDF

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PDF_PATH = os.path.join(ROOT, "raw guide", "100 SOC Investigation Scenarios.pdf")
OUT_DIR = os.path.join(ROOT, "app", "public", "data")
SEED_PATH = os.path.join(ROOT, "analysis_stats.json")

CATEGORIES = [
    ("phishing", "Phishing & Social Engineering", 1, 12),
    ("malware", "Malware & Endpoint Compromise", 13, 24),
    ("credential-abuse", "Credential Abuse & Identity Attacks", 25, 36),
    ("vpn", "VPN & Remote Access", 37, 44),
    ("dns", "DNS & Network Resolution", 45, 52),
    ("powershell", "PowerShell & Script Abuse", 53, 62),
    ("ransomware", "Ransomware & Extortion", 63, 74),
    ("cloud", "Cloud & SaaS", 75, 84),
    ("insider", "Insider Risk & Data Misuse", 85, 92),
    ("web", "Web & Application Attacks", 93, 100),
]
CAT_BY_NUM: dict[int, str] = {}
for _cid, _name, _f, _l in CATEGORIES:
    for _n in range(_f, _l + 1):
        CAT_BY_NUM[_n] = _cid

SEVERITIES = ("Critical", "High", "Medium", "Low")
ENTITY_LABELS = [
    "External IP", "Internal IP", "Service Account", "User", "Host", "Account",
    "Mailbox", "Server", "Device", "API", "Workload", "Gateway", "Application",
]
ENTITY_RE = "|".join(re.escape(x) for x in sorted(ENTITY_LABELS, key=len, reverse=True))

STEP_HEAD = "Step-by-step investigation"
PIVOT_HEAD = "Key pivots to run"
DECISION_HEAD = "Decision evidence"
CLOSURE_HEAD = "Containment, escalation and closure"
PIVOT_LABELS = ("Time pivot", "Entity pivot", "Control pivot", "Campaign pivot")
CLOSURE_LABELS = (
    "Containment", "Escalate when", "Closure criteria",
    "Detection improvement", "Analyst discipline",
)

REPORT: list[str] = []
WARN = 0


def warn(msg: str) -> None:
    global WARN
    WARN += 1
    REPORT.append(f"WARN {msg}")


def note(msg: str) -> None:
    REPORT.append(f"OK   {msg}")


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip()


def page_lines(page: pymupdf.Page) -> list[str]:
    """Text lines of one page with footer 'Page N' and empties removed."""
    out = []
    for line in page.get_text().splitlines():
        s = line.strip()
        if not s:
            continue
        if re.fullmatch(r"Page\s+\d+", s):  # running footer
            continue
        out.append(s)
    return out


def find_line(lines: list[str], pattern: re.Pattern[str], start: int = 0):
    for i in range(start, len(lines)):
        m = pattern.search(lines[i])
        if m:
            return i, m
    return None, None


# --------------------------------------------------------------------------
# Header / meta strip parsing
# --------------------------------------------------------------------------

def parse_head(lines: list[str], title_idx: int) -> dict:
    """Parse the meta strip between the scenario title and 'Initial alert'."""
    head: dict = {}
    i_alert, _ = find_line(lines, re.compile(r"^Initial alert:"), title_idx + 1)
    if i_alert is None:
        warn(f"page {lines and ''} no 'Initial alert'")
        i_alert = len(lines)
    head_lines = [l for l in lines[title_idx + 1:i_alert] if l]
    merged = " ".join(head_lines)  # keep wraps as single spaces
    merged = re.sub(r"\s+", " ", merged)

    sev = re.search(r"\b(Critical|High|Medium|Low)\b", merged)
    if sev:
        head["severity"] = sev.group(1)
    else:
        warn("severity not found in head")

    rest = merged[sev.end():] if sev else merged
    # alert sources: text until the first MITRE code or first entity label
    m_t = re.search(r"\bT\d{4}(?:\.\d+)?\b", rest)
    m_e = re.search(rf"\b(?:{ENTITY_RE})\s*:", rest)
    cut = len(rest)
    for m in (m_t, m_e):
        if m and m.start() < cut:
            cut = m.start()
    src_text = rest[:cut]
    srcs = [norm(x).strip(" ;") for x in re.split(r"/", src_text)]
    head["primaryAlertSources"] = [s for s in srcs if s and re.search(r"[A-Za-z]", s)]

    # MITRE codes + names: from first code up to first entity label
    tech_txt = rest[cut:]
    m_e2 = re.search(rf"\b(?:{ENTITY_RE})\s*:", tech_txt)
    if m_e2:
        tech_txt = tech_txt[:m_e2.start()]
    mitre = []
    for cm in re.finditer(r"\b(T\d{4}(?:\.\d+)?)\b\s*([^;]*)", tech_txt):
        code, name = cm.group(1), norm(cm.group(2))
        if name and name[0].isupper() and not name.startswith("T"):
            mitre.append({"id": code, "name": name})
        elif name and not re.match(r"^T\d", name) and not mitre:
            # tolerate a name on the same code without clear separation
            mitre.append({"id": code, "name": name})
        else:
            mitre.append({"id": code, "name": ""})
    head["mitreFocus"] = mitre

    # entities: everything from the first entity label to the end
    m_ent = re.search(rf"\b(?:{ENTITY_RE})\s*:", rest)
    ent_txt = rest[m_ent.start():] if m_ent else ""
    entities: dict[str, str] = {}
    pos = 0
    for em in re.finditer(rf"\b({ENTITY_RE})\s*:\s*", ent_txt):
        label = em.group(1)
        nxt = re.search(rf"\b(?:{ENTITY_RE})\s*:", ent_txt[em.end():])
        val_end = em.end() + nxt.start() if nxt else len(ent_txt)
        val = ent_txt[em.end():val_end]
        val = re.sub(r"\s+", " ", val).strip().strip("|").strip()
        val = re.sub(r"(?<=[A-Za-z0-9])-\s+(?=[A-Za-z0-9])", "-", val)  # fix hyphen wraps
        if label not in entities and val:
            entities[label] = val
    head["exampleEntities"] = entities
    return head


# --------------------------------------------------------------------------
# Section scanning / paragraph building
# --------------------------------------------------------------------------

def join_lines(lines: list[str]) -> str:
    return re.sub(r"\s+", " ", " ".join(lines)).strip()


def numbered_items(text: str) -> list[str]:
    """Split '1. aaa\n2. bbb' (with wrapped lines) into item strings."""
    parts = re.split(r"(?m)^\s*(\d{1,2})\.\s+", text)
    items: list[str] = []
    # parts[0] is preamble; then pairs (num, body)
    for i in range(1, len(parts) - 1, 2):
        body = norm(parts[i + 1])
        if body:
            items.append(body)
    if not items:
        # no numbered lines found: whole text is one item
        t = norm(text)
        if t:
            items.append(t)
    return items


def labelled_blocks(text: str, labels: tuple[str, ...]) -> list[dict]:
    """Split text into {label, text} blocks by label lines (no re.split groups)."""
    alt = "|".join(re.escape(l) for l in labels)
    ms = list(re.finditer(rf"(?m)^((?:{alt})):\s*", text))
    out = []
    for k, m in enumerate(ms):
        seg_end = ms[k + 1].start() if k + 1 < len(ms) else len(text)
        out.append({"label": m.group(1), "text": norm(text[m.end():seg_end])})
    return out


# --------------------------------------------------------------------------
# Decision-evidence table (real bordered tables)
# --------------------------------------------------------------------------

def _table_cols(page: pymupdf.Page, wanted: tuple[str, str]):
    """Return dict with 'left','right' list of cell strings, or None.

    Content cells can sit in different grid columns than their header label
    (merged-cell offset), so body text is taken per-row in visual order:
    first non-empty cell -> left column, second -> right column.
    """
    tabs = page.find_tables()
    if not tabs.tables:
        return None
    left_label, right_label = wanted
    left_cells: list[str] = []
    right_cells: list[str] = []
    matched = False
    for table in tabs.tables:
        grid = table.extract()
        header_texts = {
            norm(c or "")
            for row in grid
            for c in row
            if norm(c or "") in (left_label, right_label)
        }
        if left_label not in header_texts or right_label not in header_texts:
            continue
        matched = True
        for row in grid:
            cells = [norm(c or "") for c in row if norm(c or "")]
            cells = [c for c in cells if c not in header_texts]
            if not cells:
                continue
            left_cells.append(cells[0])
            if len(cells) > 1:
                right_cells.append(cells[1])
    if not matched:
        return None
    return {"left": left_cells, "right": right_cells}


def parse_decision(doc: pymupdf.Document, p1: int, p2: int,
                   region_text: str) -> dict:
    out = {"raisesConfidence": [], "benignOrContained": [], "caseSpecific": ""}
    collected = {"left": [], "right": []}
    for pno in (p1, p2):
        res = _table_cols(doc[pno], ("Evidence that raises confidence",
                                     "Evidence that may support benign/contained activity"))
        if res:
            collected["left"].extend(res["left"])
            collected["right"].extend(res["right"])
    left = norm(" ".join(collected["left"]))
    right = norm(" ".join(collected["right"]))

    if not left or not right:  # textual fallback
        m_l = re.search(r"Evidence that raises confidence", region_text)
        m_r = re.search(r"Evidence that may support benign/contained activity", region_text)
        if m_l and m_r:
            left = norm(region_text[m_l.end():m_r.start()])
            right = norm(region_text[m_r.end():])
            # drop any repeated header tokens that slipped into content
            left = re.sub(r"Evidence that raises confidence", "", left)
            right = re.sub(r"Evidence that may support benign/contained activity", "", right)
            left, right = norm(left), norm(right)
        elif m_l:
            left = norm(region_text[m_l.end():])

    if not left:
        warn(f"decision evidence left column empty (p{p1+1})")
    if not right:
        warn(f"decision evidence right column empty (p{p1+1})")

    # extract the case-specific weighting sentence if present
    ms = re.search(r"For this case, give special weight to:", left)
    if ms:
        tail = norm(left[ms.end():])
        left = norm(left[:ms.start()])
        if tail:
            out["caseSpecific"] = tail
    out["raisesConfidence"] = [left] if left else []
    out["benignOrContained"] = [right] if right else []
    return out


# --------------------------------------------------------------------------
# Scenario parsing
# --------------------------------------------------------------------------

def parse_scenario(doc: pymupdf.Document, p1: int) -> dict | None:
    lines1 = page_lines(doc[p1])
    if p1 + 1 < doc.page_count:
        lines2 = page_lines(doc[p1 + 1])
    else:
        lines2 = []

    ti, tm = find_line(lines1, re.compile(r"^(\d{3})\.\s+(.+)$"))
    if ti is None:
        return None
    num = int(tm.group(1))
    title = tm.group(2).strip()

    head = parse_head(lines1, ti)
    head["title"] = title
    head["num"] = num
    head["code"] = f"{num:03d}"
    head["categoryId"] = CAT_BY_NUM.get(num)
    head["pages"] = [p1 + 1, p1 + 2 if p1 + 2 <= doc.page_count else p1 + 1]

    # ---- ordered section scan over both pages after the title ----
    stream = lines1[ti + 1:] + lines2
    def seg_until(start: int, pattern: re.Pattern[str]):
        i, _ = find_line(stream, pattern, start)
        return i

    i_alert, _ = find_line(stream, re.compile(r"^Initial alert:"), 0)
    i_obj, _ = find_line(stream, re.compile(r"^Investigation objective:"), (i_alert or 0) + 1)
    i_fr = None
    if i_obj is not None:
        i_fr, _ = find_line(stream, re.compile(r"^Treat this as an evidence-building"), i_obj + 1)
    i_steps = None
    i_pivots = i_dec = i_closure = None
    for idx, ln in enumerate(stream):
        s = ln.strip()
        if s == STEP_HEAD and i_steps is None and (i_obj is None or idx > i_obj):
            i_steps = idx
        elif s == PIVOT_HEAD and i_steps is not None and i_pivots is None:
            i_pivots = idx
        elif s == DECISION_HEAD and i_pivots is not None and i_dec is None:
            i_dec = idx
        elif s == CLOSURE_HEAD and i_dec is not None and i_closure is None:
            i_closure = idx
    if i_steps is None:
        warn(f"scenario {num}: no steps heading")

    def block(a, b) -> str:
        if a is None or b is None:
            return ""
        return "\n".join(stream[a:b])

    alert_text = ""
    if i_alert is not None:
        end = i_obj if i_obj is not None else (i_fr if i_fr is not None else i_steps or len(stream))
        txt = block(i_alert, end)
        alert_text = norm(re.sub(r"(?m)^Initial alert:\s*", "", txt))
    obj_text = ""
    if i_obj is not None:
        end = i_fr if i_fr is not None else (i_steps if i_steps is not None else len(stream))
        txt = block(i_obj, end)
        obj_text = norm(re.sub(r"(?m)^Investigation objective:\s*", "", txt))
    framework = ""
    if i_fr is not None:
        end = i_steps if i_steps is not None else len(stream)
        framework = block(i_fr, end)

    steps: list[str] = []
    if i_steps is not None:
        end = i_pivots if i_pivots is not None else len(stream)
        steps = numbered_items(block(i_steps + 1, end))
    pivots: list[dict] = []
    if i_pivots is not None:
        end = i_dec if i_dec is not None else len(stream)
        pivots = labelled_blocks(block(i_pivots + 1, end), PIVOT_LABELS)

    region_text = block(i_dec + 1, i_closure) if i_dec is not None else ""
    decision = parse_decision(doc, p1, p1 + 1 if p1 + 1 < doc.page_count else p1, region_text)

    closure: dict[str, str] = {}
    if i_closure is not None:
        for b in labelled_blocks("\n".join(stream[i_closure + 1:]), CLOSURE_LABELS):
            closure[b["label"]] = b["text"]

    sc = {
        "num": num, "code": head["code"], "title": title,
        "categoryId": head["categoryId"],
        "severity": head.get("severity"),
        "primaryAlertSources": head.get("primaryAlertSources", []),
        "mitreFocus": head.get("mitreFocus", []),
        "exampleEntities": head.get("exampleEntities", {}),
        "initialAlert": alert_text,
        "objective": obj_text,
        "frameworkNote": framework,
        "steps": steps,
        "pivots": pivots,
        "decisionEvidence": decision,
        "closure": closure,
        "pages": head["pages"],
    }
    return sc


# --------------------------------------------------------------------------
# Reference content
# --------------------------------------------------------------------------

def parse_method(lines: list[str]) -> list[str]:
    """Method steps 1..10 from the front-matter page."""
    return numbered_items("\n".join(lines))


def parse_severity_matrix(doc: pymupdf.Document, pno: int) -> list[dict]:
    """Severity matrix table: header may not be grid row 0, and content cells
    can sit in different grid columns than their headers (merged cells), so
    rows are read as non-empty cells in visual (left-to-right) order."""
    rows: list[dict] = []
    tabs = doc[pno].find_tables()
    for table in tabs.tables:
        grid = table.extract()
        # locate the header row: contains the 'Severity' label
        hdr_idx = None
        for ri, row in enumerate(grid):
            if any(norm(c or "") == "Severity" for c in row):
                hdr_idx = ri
                break
        if hdr_idx is None:
            continue
        for row in grid[hdr_idx + 1:]:
            cells = [norm(c or "") for c in row if norm(c or "")]
            if len(cells) < 2:
                continue
            rows.append({
                "severity": cells[0],
                "meaning": cells[1],
                "examples": cells[2] if len(cells) > 2 else "",
                "posture": cells[3] if len(cells) > 3 else "",
            })
    return rows


def parse_alert_states(lines: list[str], heading: str = "Alert-State Vocabulary") -> list[dict]:
    idx = next((i for i, l in enumerate(lines) if l.strip() == heading), None)
    if idx is None:
        return []
    text = "\n".join(lines[idx + 1:])
    terms = ["Detected", "Blocked", "Allowed", "Quarantined",
             "Failed authentication", "Successful authentication",
             "True positive", "Incident"]
    pat = "|".join(re.escape(t) for t in terms)
    parts = re.split(rf"(?=(?:{pat}):)", text)
    out = []
    for p in parts:
        m = re.match(rf"^((?:{pat})):\s*(.*)$", p, re.S)
        if m:
            out.append({"term": m.group(1), "definition": norm(m.group(2))})
    return out


def split_label_items(text: str, labels: tuple[str, ...]) -> list[dict]:
    """Split multiline text on lines that begin with one of the given labels."""
    pat = "|".join(re.escape(f"{l}:") for l in labels)
    parts = re.split(rf"(?m)(?=^({pat}))", text)
    out = []
    for p in parts:
        m = re.match(rf"^((?:{'|'.join(re.escape(l) for l in labels)})):\s*(.*)$", p, re.S)
        if m and m.group(2).strip():
            out.append({"label": m.group(1), "text": norm(m.group(2))})
    return out


def sentences(text: str) -> list[str]:
    out = []
    for chunk in re.split(r"(?<=[?]) +", norm(text)):
        if chunk:
            out.append(chunk)
    return out


def para_blocks(page: pymupdf.Page) -> list[str]:
    """Paragraph-level text blocks of a page (footer removed)."""
    res = []
    for b in page.get_text("blocks"):
        txt = re.sub(r"\s+", " ", b[4]).strip()
        if not txt or re.fullmatch(r"Page\s+\d+", txt):
            continue
        res.append(txt)
    return res


def parse_references(doc: pymupdf.Document) -> dict:
    p_method = doc[1]                       # page 2: Universal SOC Investigation Method
    method = parse_method(page_lines(p_method))

    matrix = parse_severity_matrix(doc, 2)  # page 3: Severity Matrix + Alert states
    alert_states = parse_alert_states(page_lines(doc[2]))

    last = doc.page_count - 1
    t_a = "\n".join(page_lines(doc[last - 1]))  # appendix pages A-D start
    t_b = "\n".join(page_lines(doc[last]))

    def slice_between(full: str, title: str, nxt: str | None = None) -> str:
        i = full.find(title)
        if i < 0:
            return ""
        i += len(title)
        if nxt:
            j = full.find(nxt, i)
            if j >= 0:
                return full[i:j]
        return full[i:]

    evidence_labels = (
        "Identity / IAM", "Endpoint / EDR", "Email / Collaboration",
        "Network / Firewall / Proxy", "DNS", "Cloud / SaaS",
        "Web / Application / API", "Data / DLP / Repositories", "Business context",
    )
    secA = slice_between(t_a, "Appendix A - Evidence Source Checklist", "Appendix B -")
    appendix_a = split_label_items(secA, evidence_labels)

    secB = slice_between(t_a, "Appendix B - Analyst Questions Before Closing Any Alert",
                         "Appendix C -")
    appendix_b = sentences(secB)

    c_head = "Appendix C - Platform-Neutral Search Patterns"
    secC = slice_between(t_a, c_head)          # C may continue onto the last page
    if not secC:
        secC = slice_between(t_b, c_head, "Appendix D -")
    else:
        if "Appendix D -" in t_b:
            secC += "\n" + t_b[:t_b.find("Appendix D -")]
    if "Appendix D -" in secC:
        secC = secC[:secC.find("Appendix D -")]
    # items are 'Short phrase: recipe sentence(s)' — one label per line start
    appendix_c = []
    cur_label, cur_text = None, []
    for ln in secC.splitlines():
        if ln.startswith("These are conceptual search patterns"):
            appendix_c_note = norm(ln)
            if cur_label:
                appendix_c.append({"label": cur_label, "text": norm(" ".join(cur_text))})
                cur_label, cur_text = None, []
            appendix_c.append({"label": "Note", "text": appendix_c_note})
            continue
        m = re.match(r"^([A-Z][A-Za-z /]+):\s*(.*)$", ln)
        if m:
            if cur_label:
                appendix_c.append({"label": cur_label, "text": norm(" ".join(cur_text))})
            cur_label, cur_text = m.group(1), [m.group(2)]
        elif cur_label:
            cur_text.append(ln)
    if cur_label:
        appendix_c.append({"label": cur_label, "text": norm(" ".join(cur_text))})

    secD = slice_between(t_b, "Appendix D - Incident Documentation Template", "Appendix E -")
    doc_labels = (
        "Incident / Alert ID", "Date / Time", "Detection source", "Affected entities",
        "Summary", "Timeline", "Investigation performed", "Findings", "MITRE ATT&CK",
        "Containment / Recovery", "Business / Data impact", "Root cause / Initial access",
        "Closure rationale", "Lessons / Detection improvements",
    )
    appendix_d = split_label_items(secD, doc_labels)

    # Appendix E is a short references list whose heading may not be its own
    # block: the items follow the last Appendix D field ('Lessons / Detection …').
    appendix_e = []
    blocks = para_blocks(doc[last])
    seen_d_end = False
    for b in blocks:
        if not seen_d_end:
            seen_d_end = b.startswith("Lessons / Detection improvements")
            continue
        if re.match(r"^(NIST|MITRE|CISA|ATT&CK|Lockheed|CrowdStrike|SANS|SOC)", b):
            appendix_e.append(b)
            if len(appendix_e) >= 12:
                break
        elif appendix_e:
            break  # reference list finished

    return {
        "method": method,
        "severityMatrix": matrix,
        "alertStates": alert_states,
        "appendixA": appendix_a,
        "appendixB": appendix_b,
        "appendixC": appendix_c,
        "appendixD": appendix_d,
        "appendixE": appendix_e,
    }


# --------------------------------------------------------------------------
# Category headers (tagline + primary evidence) from first-scenario pages
# --------------------------------------------------------------------------

def category_meta(doc: pymupdf.Document, first_page: int, cat_name: str) -> dict:
    lines = page_lines(doc[first_page])
    try:
        idx = next(i for i, l in enumerate(lines) if l.strip() == cat_name)
    except StopIteration:
        warn(f"category header not found: {cat_name}")
        return {}
    tagline = ""
    evidence = ""
    vals = [l for l in lines[idx + 1:idx + 4] if l.strip()]
    if vals:
        tagline = vals[0]
    for l in lines[idx + 1:idx + 6]:
        if l.startswith("Primary evidence:"):
            evidence = l[len("Primary evidence:"):].strip()
            break
    return {"tagline": tagline, "primaryEvidence": evidence}


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main() -> int:
    os.makedirs(OUT_DIR, exist_ok=True)
    doc = pymupdf.open(PDF_PATH)

    note(f"pages={doc.page_count} bytes={os.path.getsize(PDF_PATH)}")

    scenarios: list[dict] = []
    pno = 0
    while pno < doc.page_count:
        sc = parse_scenario(doc, pno)
        if sc is None:
            pno += 1
            continue
        scenarios.append(sc)
        pno += 2  # each scenario spans exactly two pages

    if len(scenarios) != 100:
        warn(f"expected 100 scenarios, parsed {len(scenarios)}")

    # sort & validate
    scenarios.sort(key=lambda s: s["num"])
    for n in range(1, 101):
        if scenarios[n - 1]["num"] != n:
            warn(f"scenario numbering gap near {n}")
    for sc in scenarios:
        num = sc["num"]
        if sc["severity"] not in SEVERITIES:
            warn(f"{num}: bad severity {sc['severity']}")
        if not sc["steps"]:
            warn(f"{num}: no steps")
        if len(sc["pivots"]) != 4:
            warn(f"{num}: pivots={len(sc['pivots'])}")
        if not sc["decisionEvidence"]["raisesConfidence"] or not sc["decisionEvidence"]["benignOrContained"]:
            warn(f"{num}: decision evidence incomplete")
        missing = [k for k in ("Containment", "Escalate when", "Closure criteria",
                               "Detection improvement", "Analyst discipline")
                   if not sc["closure"].get(k)]
        if missing:
            warn(f"{num}: closure missing {missing}")
        if not sc["objective"]:
            warn(f"{num}: objective empty")
        ents = sc["exampleEntities"]
        for k in ("User", "Host", "External IP"):
            if k not in ents:
                warn(f"{num}: entity '{k}' missing")

    note(f"scenarios parsed: {len(scenarios)}")

    # ---- compare against the QA seed ----
    seed_by_num = {}
    if os.path.exists(SEED_PATH):
        with open(SEED_PATH, encoding="utf-8") as fh:
            seed = json.load(fh)
        seed_by_num = {s["num"]: s for s in seed.get("scenarios", [])}
        mism = 0
        for sc in scenarios:
            se = seed_by_num.get(sc["num"])
            if not se:
                mism += 1
                continue
            if se["title"] != sc["title"]:
                warn(f"{sc['num']}: title differs from seed")
                mism += 1
            if se["severity"] != sc["severity"]:
                warn(f"{sc['num']}: severity {sc['severity']} != seed {se['severity']}")
                mism += 1
            if se["category"] != sc["categoryId"]:
                warn(f"{sc['num']}: category differs from seed")
                mism += 1
        note(f"seed comparison: {len(scenarios) - mism}/{len(scenarios)} match")

    # ---- categories ----
    categories = []
    cat_first_page = {}
    for cid, name, first, last in CATEGORIES:
        fp = None
        for sc in scenarios:
            if sc["num"] == first:
                fp = sc["pages"][0]
                break
        meta = category_meta(doc, fp - 1, name) if fp else {}
        categories.append({
            "id": cid, "name": name,
            "tagline": meta.get("tagline", ""),
            "primaryEvidence": meta.get("primaryEvidence", ""),
            "first": first, "last": last, "count": last - first + 1,
        })

    # ---- techniques (aggregate) ----
    tech_map: dict[str, dict] = {}
    for sc in scenarios:
        for t in sc["mitreFocus"]:
            tid = t["id"]
            e = tech_map.setdefault(tid, {"id": tid, "name": "", "count": 0,
                                          "severities": [], "scenarioNums": [],
                                          "categories": []})
            if not e["name"] and t["name"]:
                e["name"] = t["name"]
            e["count"] += 1
            e["scenarioNums"].append(sc["num"])
            e["categories"].append(sc["categoryId"])
            if sc["severity"] not in e["severities"]:
                e["severities"].append(sc["severity"])
    techniques = []
    for e in tech_map.values():
        e["scenarioNums"] = sorted(set(e["scenarioNums"]))
        e["categories"] = sorted(set(e["categories"]))
        techniques.append(e)
    techniques.sort(key=lambda t: t["id"])

    references = parse_references(doc)
    note(f"method steps={len(references['method'])} matrix={len(references['severityMatrix'])} "
         f"alertStates={len(references['alertStates'])} A={len(references['appendixA'])} "
         f"B={len(references['appendixB'])} C={len(references['appendixC'])} "
         f"D={len(references['appendixD'])} E={len(references['appendixE'])}")

    counts = {
        "scenarios": len(scenarios),
        "categories": len(categories),
        "techniques": len(techniques),
        "bySeverity": {},
        "byCategory": {},
    }
    for sc in scenarios:
        counts["bySeverity"][sc["severity"]] = counts["bySeverity"].get(sc["severity"], 0) + 1
        counts["byCategory"][sc["categoryId"]] = counts["byCategory"].get(sc["categoryId"], 0) + 1

    meta = {
        "title": "100 SOC Investigation Scenarios",
        "subtitle": "A Practical Step-by-Step Playbook for Security Operations",
        "edition": "2026 Edition",
        "sourceFile": os.path.basename(PDF_PATH),
        "sourcePages": doc.page_count,
        "sourceSha256": hashlib_sha256(PDF_PATH),
        "generatedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
        "counts": counts,
        "totalWords": sum(len(s["title"].split()) + sum(len(x.split()) for x in s["steps"])
                          + len((s.get("initialAlert") or "").split())
                          + len((s.get("objective") or "").split()) for s in scenarios),
    }

    payloads = {
        "meta.json": meta,
        "categories.json": {"categories": categories},
        "scenarios.json": {"scenarios": scenarios},
        "techniques.json": {"techniques": techniques},
        "references.json": references,
    }
    for fname, data in payloads.items():
        path = os.path.join(OUT_DIR, fname)
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=1)
        note(f"wrote {os.path.relpath(path, ROOT)} ({os.path.getsize(path):,} bytes)")

    with open(os.path.join(OUT_DIR, "qa-report.txt"), "w", encoding="utf-8") as fh:
        fh.write(f"SOC scenario extraction QA report  ({datetime.date.today().isoformat()})\n")
        fh.write("=" * 70 + "\n")
        fh.write("\n".join(REPORT))
        fh.write(f"\n{'='*70}\nwarnings: {WARN}\n")
    print(f"done. scenarios={len(scenarios)} warnings={WARN}")
    return 1 if WARN else 0


def hashlib_sha256(path: str) -> str:
    import hashlib
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


if __name__ == "__main__":
    sys.exit(main())
