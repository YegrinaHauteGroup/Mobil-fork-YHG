"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { IconDocuments, IconCode, IconSheet, IconMindmap, IconFiles, IconSearch } from "./icons";
import { useWorkspace, type TabKind } from "./workspace/workspace-context";
import {
  searchOntology,
  getLinkedObjects,
  type SearchResult,
  type LinkedObject,
} from "./search/actions";

const KIND_ICON: Record<string, (props: { size?: number }) => React.ReactElement> = {
  document: IconDocuments,
  code: IconCode,
  sheet: IconSheet,
  mindmap: IconMindmap,
  file: IconFiles,
};
const KIND_LABEL: Record<string, string> = {
  document: "Docs +",
  code: "Code",
  sheet: "Table",
  mindmap: "Link Graph",
  file: "Repository",
};
const TAB_KINDS = new Set(["document", "code", "sheet", "mindmap"]);

function ResultRow({
  result,
  onOpenItem,
}: {
  result: SearchResult;
  onOpenItem: (kind: string, id: string, title: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [links, setLinks] = useState<LinkedObject[] | null>(null);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const Icon = KIND_ICON[result.kind] ?? IconDocuments;
  const openable = TAB_KINDS.has(result.kind);

  const toggleExpand = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (expanded) {
      setExpanded(false);
      return;
    }
    setExpanded(true);
    if (links === null) {
      setLoadingLinks(true);
      const data = await getLinkedObjects(result.kind, result.id);
      setLinks(data);
      setLoadingLinks(false);
    }
  };

  return (
    <div className="search-result">
      <div
        className="search-result-main"
        role={openable ? "button" : undefined}
        tabIndex={openable ? 0 : undefined}
        onClick={openable ? () => onOpenItem(result.kind, result.id, result.title) : undefined}
        onKeyDown={
          openable
            ? (e) => {
                if (e.key === "Enter") onOpenItem(result.kind, result.id, result.title);
              }
            : undefined
        }
      >
        <span className="search-result-icon">
          <Icon size={14} />
        </span>
        <span className="search-result-body">
          <span className="search-result-title">{result.title || "Untitled"}</span>
          {result.snippet && <span className="search-result-snippet">{result.snippet}</span>}
        </span>
        <span className="search-result-kind">{KIND_LABEL[result.kind] ?? result.kind}</span>
        <button
          type="button"
          className="search-result-expand"
          onClick={toggleExpand}
          title="Show connected items"
          aria-label="Show connected items"
        >
          {expanded ? "▾" : "▸"}
        </button>
      </div>
      {expanded && (
        <div className="search-linked">
          {loadingLinks && <span className="muted">Loading…</span>}
          {!loadingLinks && links && links.length === 0 && (
            <span className="muted">No connected items.</span>
          )}
          {!loadingLinks &&
            links &&
            links.map((l) => {
              const LIcon = KIND_ICON[l.kind] ?? IconDocuments;
              return (
                <button
                  key={`${l.kind}:${l.id}`}
                  type="button"
                  className="search-linked-item"
                  onClick={() => onOpenItem(l.kind, l.id, l.title)}
                >
                  <LIcon size={12} />
                  <span>{l.title || "Untitled"}</span>
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

export function HeaderSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  // 모바일에서는 검색창을 돋보기 아이콘으로 접어두고, 아이콘을 누를 때만
  // 검색 입력을 오버레이로 펼친다(헤더 가로 공간 절약).
  const [mobileOpen, setMobileOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { openTab } = useWorkspace();

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // 모바일 검색을 펼치면 입력에 포커스를 준다.
  useEffect(() => {
    if (mobileOpen) inputRef.current?.focus();
  }, [mobileOpen]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = query.trim();
    if (!q) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      const data = await searchOntology(q);
      setResults(data);
      setLoading(false);
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const onOpenItem = (kind: string, id: string, title: string) => {
    if (TAB_KINDS.has(kind)) {
      openTab(kind as TabKind, id, title);
      setOpen(false);
      setMobileOpen(false);
      setQuery("");
    }
  };

  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    (acc[r.kind] ??= []).push(r);
    return acc;
  }, {});

  return (
    <div className={`hsearch ${mobileOpen ? "mobile-open" : ""}`} ref={rootRef}>
      <button
        type="button"
        className="hsearch-icon-btn"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Search"
        aria-expanded={mobileOpen}
      >
        <IconSearch size={18} />
      </button>
      <input
        ref={inputRef}
        className="hsearch-input"
        type="text"
        placeholder="Search Mobil… (try #tag)"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && query.trim() && (
        <div className="hsearch-dropdown">
          {loading && <div className="hsearch-empty">Searching…</div>}
          {!loading && results.length === 0 && (
            <div className="hsearch-empty">No results for “{query}”.</div>
          )}
          {!loading &&
            Object.entries(grouped).map(([kind, rows]) => (
              <div key={kind} className="hsearch-group">
                <div className="hsearch-group-label">{KIND_LABEL[kind] ?? kind}</div>
                {rows.map((r) => (
                  <ResultRow key={`${r.kind}:${r.id}`} result={r} onOpenItem={onOpenItem} />
                ))}
              </div>
            ))}
          {!loading && results.some((r) => r.kind === "file") && (
            <div className="hsearch-footer">
              <Link href="/files" onClick={() => setOpen(false)}>
                Open Repository to view matched files →
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
