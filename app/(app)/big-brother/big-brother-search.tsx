"use client";

import { useState } from "react";
import "./big-brother.css";
import {
  searchBigBrother,
  addPaperToDocument,
  addGithubResultToCode,
  type SearchResults,
  type PaperResult,
  type CodeResult,
} from "./actions";
import { useWorkspace } from "../workspace/workspace-context";

function PaperCard({ paper }: { paper: PaperResult }) {
  const { openTab } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);

  const onAdd = async () => {
    setAdding(true);
    const res = await addPaperToDocument(paper);
    setAdding(false);
    if (!("error" in res)) {
      setAdded(true);
      openTab("document", res.id, res.title, res.seed);
    }
  };

  return (
    <div className="bb-card">
      <div className="bb-card-title">{paper.title}</div>
      {(paper.authors.length > 0 || paper.year) && (
        <div className="bb-card-meta">
          {paper.authors.slice(0, 4).join(", ")}
          {paper.authors.length > 4 ? " et al." : ""}
          {paper.year ? ` · ${paper.year}` : ""}
        </div>
      )}
      {paper.abstract && <p className="bb-card-snippet">{paper.abstract.slice(0, 320)}…</p>}
      <div className="bb-card-actions">
        {paper.url && (
          <a href={paper.url} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
            Open source ↗
          </a>
        )}
        <button className="btn btn-sm btn-primary" onClick={onAdd} disabled={adding || added}>
          {added ? "Added ✓" : adding ? "Adding…" : "Add to Docs +"}
        </button>
      </div>
    </div>
  );
}

function CodeCard({ result }: { result: CodeResult }) {
  const { openTab } = useWorkspace();
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onAdd = async () => {
    setAdding(true);
    setError(null);
    const res = await addGithubResultToCode(result);
    setAdding(false);
    if ("error" in res) {
      setError(res.error);
      return;
    }
    setAdded(true);
    openTab("code", res.id, res.title, res.seed);
  };

  return (
    <div className="bb-card">
      <div className="bb-card-title mono">
        {result.owner}/{result.repo}
      </div>
      <div className="bb-card-meta mono">{result.path}</div>
      {result.fragment && <pre className="bb-card-code">{result.fragment}</pre>}
      {error && <div className="notice notice-error" style={{ margin: "6px 0 0" }}>{error}</div>}
      <div className="bb-card-actions">
        <a href={result.htmlUrl} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">
          Open on GitHub ↗
        </a>
        <button className="btn btn-sm btn-primary" onClick={onAdd} disabled={adding || added}>
          {added ? "Added ✓" : adding ? "Adding…" : "Add to Code"}
        </button>
      </div>
    </div>
  );
}

export function BigBrotherSearch() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [searched, setSearched] = useState(false);

  const onSearch = async () => {
    const q = query.trim();
    if (!q || loading) return;
    setLoading(true);
    setSearched(true);
    const res = await searchBigBrother(q);
    setResults(res);
    setLoading(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") onSearch();
  };

  const totalResults =
    (results?.openalex.length ?? 0) + (results?.semanticScholar.length ?? 0) + (results?.github.length ?? 0);

  return (
    <div>
      <div className="row" style={{ gap: 10, marginBottom: 20 }}>
        <input
          className="input"
          style={{ flex: 1 }}
          placeholder="Search papers and code…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="btn btn-primary" onClick={onSearch} disabled={loading || !query.trim()}>
          {loading ? "Searching…" : "Search"}
        </button>
      </div>

      {!searched && (
        <div className="empty">
          Search across OpenAlex &amp; Semantic Scholar (papers) and GitHub (code) at once.
        </div>
      )}

      {searched && loading && <div className="empty">Searching…</div>}

      {searched && !loading && results && totalResults === 0 && Object.keys(results.errors).length === 0 && (
        <div className="empty">No results for “{query}”.</div>
      )}

      {searched && !loading && results && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {results.errors.openalex && (
            <div className="notice notice-error">OpenAlex: {results.errors.openalex}</div>
          )}
          {results.openalex.length > 0 && (
            <section>
              <div className="label" style={{ marginBottom: 10 }}>
                PAPERS — OPENALEX ({results.openalex.length})
              </div>
              <div className="bb-grid">
                {results.openalex.map((p, i) => (
                  <PaperCard key={`oa-${i}`} paper={p} />
                ))}
              </div>
            </section>
          )}

          {results.errors.semanticScholar && (
            <div className="notice notice-error">Semantic Scholar: {results.errors.semanticScholar}</div>
          )}
          {results.semanticScholar.length > 0 && (
            <section>
              <div className="label" style={{ marginBottom: 10 }}>
                PAPERS — SEMANTIC SCHOLAR ({results.semanticScholar.length})
              </div>
              <div className="bb-grid">
                {results.semanticScholar.map((p, i) => (
                  <PaperCard key={`ss-${i}`} paper={p} />
                ))}
              </div>
            </section>
          )}

          {results.errors.github && <div className="notice notice-error">GitHub: {results.errors.github}</div>}
          {results.github.length > 0 && (
            <section>
              <div className="label" style={{ marginBottom: 10 }}>
                CODE — GITHUB ({results.github.length})
              </div>
              <div className="bb-grid">
                {results.github.map((r, i) => (
                  <CodeCard key={`gh-${i}`} result={r} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
