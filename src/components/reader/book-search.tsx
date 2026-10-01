"use client";

import { useEffect, useState } from "react";
import { loadBookSearchIndex, searchBookRecords } from "@/content/book2/search/search-index";
import type { SearchIndexManifest, SearchRecord } from "@/content/book2/schema";

export function BookSearch({ onNavigate }: { onNavigate: (index: number) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [index, setIndex] = useState<SearchIndexManifest | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [loadingQuery, setLoadingQuery] = useState<string | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (!open || normalizedQuery.length < 2 || index || unavailable) return;
    let active = true;
    const timer = window.setTimeout(() => {
      setLoadingQuery(normalizedQuery);
      void loadBookSearchIndex().then((result) => {
        if (!active) return;
        if (result.status === "loaded") setIndex(result.index);
        else setUnavailable(true);
        setLoadingQuery(null);
      });
    }, 180);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [index, open, query, unavailable]);

  const results: SearchRecord[] = index ? searchBookRecords(index.records, query).slice(0, 12) : [];
  const loading = loadingQuery !== null && loadingQuery === query.trim();

  return (
    <div className="book-search-control">
      <button
        type="button"
        className={`toolbar-button search-trigger${open ? " is-selected" : ""}`}
        aria-expanded={open}
        aria-controls="book-search-panel"
        onClick={() => {
          setOpen((value) => !value);
          setLoadingQuery(null);
        }}
      >
        <span className="search-glyph" aria-hidden="true">
          ⌕
        </span>
        <span>Search</span>
      </button>
      {open && (
        <div className="book-search-panel" id="book-search-panel" role="search">
          <label htmlFor="book-search-input">Search imported page text</label>
          <input
            autoFocus
            id="book-search-input"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLoadingQuery(null);
            }}
            placeholder="Search the book"
          />
          <div className="book-search-results" aria-live="polite">
            {query.trim().length < 2 ? (
              <p>Enter at least two characters.</p>
            ) : loading ? (
              <p>Loading the search index…</p>
            ) : unavailable ? (
              <p>Page search will be available when Word import generates the search index.</p>
            ) : results.length ? (
              results.map((record) => (
                <button
                  key={record.canonicalPageId}
                  type="button"
                  onClick={() => {
                    onNavigate(record.canonicalIndex);
                    setOpen(false);
                  }}
                >
                  <span>Page {record.canonicalIndex}</span>
                  <span>{record.snippet}</span>
                </button>
              ))
            ) : (
              <p>No imported pages match this search.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
