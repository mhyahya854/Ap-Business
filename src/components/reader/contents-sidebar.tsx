"use client";

import { useMemo, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";
import { BOOK_CONTENTS } from "@/content/book2/contents";
import type { TocEntry } from "@/content/book2/schema";

type ContentsSidebarProps = {
  selectedId: string | null;
  mobileOpen: boolean;
  onSelect: (entry: TocEntry) => void;
  onClose: () => void;
  onKeyDown: (event: KeyboardEvent<HTMLElement>) => void;
  onElement: (node: HTMLElement | null) => void;
};

export function ContentsSidebar({
  selectedId,
  mobileOpen,
  onSelect,
  onClose,
  onKeyDown,
  onElement,
}: ContentsSidebarProps) {
  const [query, setQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set(["unit-1"]));
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const entryIds = useMemo(
    () => new Set(flatten(BOOK_CONTENTS.entries).map((entry) => entry.id)),
    [],
  );

  function toggle(id: string) {
    setExpandedIds((previous) => {
      const next = new Set(previous);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function select(entry: TocEntry) {
    onSelect(entry);
    onClose();
  }

  return (
    <aside
      className={`contents-sidebar${mobileOpen ? " is-drawer-open" : ""}`}
      aria-label="Book contents"
      aria-modal={mobileOpen || undefined}
      role={mobileOpen ? "dialog" : undefined}
      onKeyDown={onKeyDown}
      ref={onElement}
      data-entry-count={entryIds.size}
    >
      <div className="contents-heading">
        <div>
          <p className="contents-eyebrow">Book 2</p>
          <h2>Contents</h2>
        </div>
        <button
          className="icon-button contents-close"
          type="button"
          aria-label="Close contents"
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <label className="contents-search-label" htmlFor="contents-search">
        Search titles
      </label>
      <input
        id="contents-search"
        className="contents-search"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Find in contents"
        autoComplete="off"
      />
      {BOOK_CONTENTS.sourceState !== "complete" && (
        <p className="contents-source-note">
          Contents source is incomplete. Page labels are left unresolved.
        </p>
      )}
      <nav className="contents-tree" aria-label="Table of contents">
        {BOOK_CONTENTS.entries.map((entry) => (
          <TocNode
            key={entry.id}
            entry={entry}
            depth={0}
            selectedId={selectedId}
            query={normalizedQuery}
            expandedIds={expandedIds}
            onToggle={toggle}
            onSelect={select}
          />
        ))}
        {normalizedQuery &&
          !flatten(BOOK_CONTENTS.entries).some((entry) =>
            entry.title.toLocaleLowerCase().includes(normalizedQuery),
          ) && <p className="contents-no-results">No titles match “{query}”.</p>}
      </nav>
    </aside>
  );
}

function TocNode({
  entry,
  depth,
  selectedId,
  query,
  expandedIds,
  onToggle,
  onSelect,
}: {
  entry: TocEntry;
  depth: number;
  selectedId: string | null;
  query: string;
  expandedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (entry: TocEntry) => void;
}) {
  const childMatches = (candidate: TocEntry): boolean =>
    candidate.title.toLocaleLowerCase().includes(query) || candidate.children.some(childMatches);
  if (query && !childMatches(entry)) return null;
  const hasChildren = entry.children.length > 0;
  const expanded = query.length > 0 || expandedIds.has(entry.id);
  const kindClass = `toc-item-${entry.type}`;

  return (
    <div className={`toc-node ${kindClass}`}>
      <div className="toc-row" style={{ "--toc-depth": depth } as CSSProperties}>
        {hasChildren ? (
          <button
            className="toc-disclosure"
            type="button"
            aria-label={`${expanded ? "Collapse" : "Expand"} ${entry.title}`}
            aria-expanded={expanded}
            aria-controls={`toc-children-${entry.id}`}
            onClick={() => onToggle(entry.id)}
          >
            <span
              aria-hidden="true"
              className={expanded ? "disclosure-chevron is-expanded" : "disclosure-chevron"}
            >
              ›
            </span>
          </button>
        ) : (
          <span className="toc-disclosure-spacer" aria-hidden="true" />
        )}
        <button
          className={`toc-title${selectedId === entry.id ? " is-current" : ""}`}
          type="button"
          aria-current={selectedId === entry.id ? "page" : undefined}
          data-toc-entry="true"
          onKeyDown={(event) => onTreeKeyDown(event, entry, expanded, hasChildren, onToggle)}
          onClick={() => onSelect(entry)}
        >
          {entry.title}
        </button>
      </div>
      {hasChildren && expanded && (
        <div className="toc-children" id={`toc-children-${entry.id}`}>
          {entry.children.map((child) => (
            <TocNode
              key={child.id}
              entry={child}
              depth={depth + 1}
              selectedId={selectedId}
              query={query}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function onTreeKeyDown(
  event: KeyboardEvent<HTMLButtonElement>,
  entry: TocEntry,
  expanded: boolean,
  hasChildren: boolean,
  onToggle: (id: string) => void,
) {
  const current = event.currentTarget;
  const tree = current.closest(".contents-tree");
  const entries = Array.from(tree?.querySelectorAll<HTMLButtonElement>("[data-toc-entry]") ?? []);
  const position = entries.indexOf(current);
  if (
    event.key === "ArrowDown" ||
    event.key === "ArrowUp" ||
    event.key === "Home" ||
    event.key === "End"
  ) {
    event.preventDefault();
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? entries.length - 1
          : position + (event.key === "ArrowDown" ? 1 : -1);
    entries[Math.max(0, Math.min(entries.length - 1, next))]?.focus();
  } else if (event.key === "ArrowRight" && hasChildren) {
    event.preventDefault();
    if (!expanded) onToggle(entry.id);
    else
      current
        .closest(".toc-node")
        ?.querySelector<HTMLButtonElement>(".toc-children [data-toc-entry]")
        ?.focus();
  } else if (event.key === "ArrowLeft") {
    const node = current.closest(".toc-node");
    if (hasChildren && expanded) {
      event.preventDefault();
      onToggle(entry.id);
    } else {
      const parent = node?.parentElement?.closest(".toc-node");
      const parentButton = parent?.querySelector<HTMLButtonElement>(".toc-title[data-toc-entry]");
      if (parentButton) {
        event.preventDefault();
        parentButton.focus();
      }
    }
  }
}

function flatten(entries: TocEntry[]): TocEntry[] {
  return entries.flatMap((entry) => [entry, ...flatten(entry.children)]);
}
