// Fill-in / export tool for the Appendix D incident documentation template.
import { useEffect, useMemo, useRef, useState } from "react";
import {
  downloadTextFile,
  incidentTemplateMarkdown,
  type DocField,
} from "../lib/markdown";

const DRAFT_KEY = "soc-incident-doc-draft-v1";

function loadDraft(): string | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw && raw.trim() ? raw : null;
  } catch {
    return null;
  }
}

export function IncidentDocBuilder({ items }: { items: DocField[] }) {
  const blank = useMemo(() => incidentTemplateMarkdown(items), [items]);
  const [text, setText] = useState<string>(() => loadDraft() ?? incidentTemplateMarkdown(items));
  const [copied, setCopied] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // autosave draft locally while typing
  useEffect(() => {
    try {
      localStorage.setItem(DRAFT_KEY, text);
      setSavedAt(new Date().toLocaleTimeString());
    } catch {
      /* storage unavailable */
    }
  }, [text]);

  function reset() {
    if (window.confirm("Replace the current draft with a blank template? This cannot be undone.")) {
      setText(blank);
      setSavedAt(null);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  const filled = text.trim().length > 0 && text !== blank;
  const sectionCount = items.length;

  return (
    <div className="card p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="h2">Incident documentation template</h2>
          <p className="mt-1 text-sm" style={{ color: "var(--tx2)" }}>
            {sectionCount} fields from Appendix D. Write your draft below — it is
            auto-saved in this browser — then download it as Markdown.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="btn btn--accent"
            onClick={() => downloadTextFile("incident-documentation.md", text)}
            title="Download the document with your entries"
          >
            ⬇ Download .md
          </button>
          <button
            className="btn"
            onClick={() => downloadTextFile("incident-template-blank.md", blank)}
            title="Download a fresh blank template"
          >
            ⬇ Blank template
          </button>
          <button className="btn" onClick={copy}>
            {copied ? "✓ Copied" : "⧉ Copy"}
          </button>
          <button className="btn btn--ghost" onClick={reset}>
            Reset
          </button>
        </div>
      </div>

      <textarea
        ref={areaRef}
        className="field mt-4 min-h-[24rem] w-full whitespace-pre-wrap font-mono text-[0.82rem] leading-relaxed"
        spellCheck={false}
        value={text}
        onChange={(e) => setText(e.target.value)}
        aria-label="Incident documentation template editor"
      />

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: "var(--tx3)" }}>
        <span>
          {text.length} chars · {filled ? "draft has content" : "blank template"}
          {savedAt ? ` · auto-saved ${savedAt}` : ""}
        </span>
        <span>
          Tip: keep the lines starting with <code>&gt;</code> as reminders or delete them
          once filled.
        </span>
      </div>
    </div>
  );
}
