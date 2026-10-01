"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import Link from "next/link";
import { findTocEntry } from "@/content/book2/contents";
import {
  BOOK_MANIFEST,
  manifestEntryForId,
  manifestEntryForIndex,
} from "@/content/book2/manifests";
import { preloadCanonicalPage } from "@/content/book2/pages/load-page";
import { spreadIndices as getSpreadIndices } from "@/content/book2/navigation/spread-indices.mjs";
import { getVirtualWindow } from "@/content/book2/navigation/virtual-window.mjs";
import type { SpreadPolicy, TocEntry } from "@/content/book2/schema";
import { BookSearch } from "./book-search";
import { CanonicalPageSurface } from "./canonical-page";
import { ContentsSidebar } from "./contents-sidebar";
import { DownloadDialog } from "./download-dialog";

type ViewerMode = "single" | "double" | "infinite";
type ThemePreference = "system" | "light" | "dark";

const modes: Array<{ id: ViewerMode; label: string }> = [
  { id: "single", label: "Single" },
  { id: "double", label: "Spread" },
  { id: "infinite", label: "Scroll" },
];

export function ReaderApp({
  initialPageIndex = 1,
  initialEntryId = null,
}: {
  initialPageIndex?: number;
  initialEntryId?: string | null;
}) {
  const [pageIndex, setPageIndex] = useState(initialPageIndex);
  const [pageDraft, setPageDraft] = useState(String(initialPageIndex));
  const [pageError, setPageError] = useState("");
  const [mode, setMode] = useState<ViewerMode>("single");
  const [zoom, setZoom] = useState(1);
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(initialEntryId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileViewport, setMobileViewport] = useState(false);
  const [downloadOpen, setDownloadOpen] = useState(false);
  const [theme, setTheme] = useState<ThemePreference>("system");
  const [hydrated, setHydrated] = useState(false);
  const [canvasWidth, setCanvasWidth] = useState(0);
  const [jumpRevision, setJumpRevision] = useState(0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const sidebarToggleRef = useRef<HTMLButtonElement>(null);

  const totalPages = BOOK_MANIFEST.canonicalPageCount ?? BOOK_MANIFEST.planningEstimate;
  const approximateCount = BOOK_MANIFEST.canonicalPageCount === null;
  const activeEntry = findTocEntry(selectedEntryId);
  const activeManifestEntry = manifestEntryForIndex(pageIndex);
  const basePageWidth = useMemo(() => {
    const availableWidth = Math.max(220, canvasWidth - 64);
    if (mode === "double" && !mobileViewport && canvasWidth >= 850) {
      return Math.min(794, Math.max(220, (canvasWidth - 120) / 2));
    }
    return Math.min(794, availableWidth);
  }, [canvasWidth, mobileViewport, mode]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pageParam = params.get("page");
    if (pageParam !== null) {
      const requestedPage = Number(pageParam);
      if (
        Number.isSafeInteger(requestedPage) &&
        requestedPage >= 1 &&
        requestedPage <= totalPages
      ) {
        // URL state is read after hydration so the server and first client render stay identical.
        // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync browser URL state after hydration.
        setPageIndex(requestedPage);
        setPageDraft(String(requestedPage));
      } else {
        setPageError(
          `The requested page is outside the current ${BOOK_MANIFEST.canonicalPageCount === null ? "planning range" : "book"} of 1–${totalPages.toLocaleString()}.`,
        );
      }
    }
    const requestedMode = params.get("view");
    if (requestedMode === "single" || requestedMode === "double" || requestedMode === "infinite")
      setMode(requestedMode);
    const requestedEntry = params.get("entry") ?? initialEntryId;
    if (requestedEntry && findTocEntry(requestedEntry)) setSelectedEntryId(requestedEntry);

    try {
      const storedTheme = window.localStorage.getItem("b2-reader-theme");
      if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system")
        setTheme(storedTheme);
    } catch {
      /* System appearance remains available when storage is blocked. */
    }
    setHydrated(true);
  }, [initialEntryId, totalPages]);

  useEffect(() => {
    if (!hydrated) return;
    if (theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    try {
      window.localStorage.setItem("b2-reader-theme", theme);
    } catch {
      /* The override lasts for this session. */
    }
  }, [hydrated, theme]);

  useEffect(() => {
    const element = canvasRef.current;
    if (!element) return;
    const measure = () => setCanvasWidth(element.getBoundingClientRect().width);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 760px)");
    const update = () => {
      setMobileViewport(media.matches);
      if (media.matches) setSidebarOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (mobileViewport && sidebarOpen) {
      drawerRef.current?.querySelector<HTMLElement>("input, button")?.focus();
    } else if (mobileViewport) {
      sidebarToggleRef.current?.focus();
    }
  }, [mobileViewport, sidebarOpen]);

  useEffect(() => {
    preloadCanonicalPage(pageIndex - 1);
    preloadCanonicalPage(pageIndex + 1);
  }, [pageIndex]);

  const updateUrl = useCallback((changes: Record<string, string | null>) => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries(changes)) {
      if (value === null) url.searchParams.delete(key);
      else url.searchParams.set(key, value);
    }
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
  }, []);

  const navigateToPage = useCallback(
    (requestedIndex: number) => {
      if (
        !Number.isSafeInteger(requestedIndex) ||
        requestedIndex < 1 ||
        requestedIndex > totalPages
      )
        return;
      setPageIndex(requestedIndex);
      setPageDraft(String(requestedIndex));
      setPageError("");
      setJumpRevision((revision) => revision + 1);
      updateUrl({ page: String(requestedIndex) });
    },
    [totalPages, updateUrl],
  );

  const updatePageFromScroll = useCallback(
    (nextIndex: number) => {
      if (nextIndex === pageIndex || nextIndex < 1 || nextIndex > totalPages) return;
      setPageIndex(nextIndex);
      setPageDraft(String(nextIndex));
      updateUrl({ page: String(nextIndex) });
    },
    [pageIndex, totalPages, updateUrl],
  );

  const changeMode = useCallback(
    (nextMode: ViewerMode) => {
      setMode(nextMode);
      updateUrl({ view: nextMode === "single" ? null : nextMode });
      setJumpRevision((revision) => revision + 1);
    },
    [updateUrl],
  );

  function selectEntry(entry: TocEntry) {
    setSelectedEntryId(entry.id);
    updateUrl({ entry: entry.id });
    if (entry.canonicalPageId) {
      const target = manifestEntryForId(entry.canonicalPageId);
      if (target) navigateToPage(target.canonicalIndex);
    }
  }

  function submitPage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const parsed = Number(pageDraft);
    if (!Number.isSafeInteger(parsed) || parsed < 1) {
      setPageError("Enter a whole canonical page index greater than zero.");
    } else if (parsed > totalPages) {
      setPageError(
        `Enter a page within the current ${BOOK_MANIFEST.canonicalPageCount === null ? "planning range" : "verified book bounds"} of 1–${totalPages.toLocaleString()}.`,
      );
    } else {
      navigateToPage(parsed);
    }
  }

  function onDrawerKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (!mobileViewport || !sidebarOpen) return;
    if (event.key === "Escape") {
      event.preventDefault();
      setSidebarOpen(false);
      sidebarToggleRef.current?.focus();
      return;
    }
    if (event.key !== "Tab" || !drawerRef.current) return;
    const focusable = Array.from(
      drawerRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), a[href], select:not([disabled]), [tabindex]:not([tabindex='-1'])",
      ),
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  useEffect(() => {
    function onKeyDown(event: globalThis.KeyboardEvent) {
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName))
      )
        return;
      if (downloadOpen || document.querySelector("dialog[open]")) return;
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        navigateToPage(Math.max(1, pageIndex - 1));
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        navigateToPage(Math.min(totalPages, pageIndex + 1));
      } else if (event.key === "+" || event.key === "=") {
        setZoom((value) => Math.min(1.6, Number((value + 0.1).toFixed(2))));
      } else if (event.key === "-") {
        setZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(2))));
      } else if (event.key.toLowerCase() === "b") {
        setSidebarOpen((value) => !value);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [downloadOpen, navigateToPage, pageIndex, totalPages]);

  const narrowSpreadFallback = mode === "double" && (mobileViewport || canvasWidth < 850);
  const pageCountLabel = approximateCount
    ? `~${totalPages.toLocaleString()}`
    : totalPages.toLocaleString();
  const pageWidth = basePageWidth;

  return (
    <div
      className={`reader-app${mobileViewport && sidebarOpen ? " is-mobile-drawer-open" : ""}${!mobileViewport && !sidebarOpen ? " is-sidebar-hidden" : ""}`}
    >
      <a className="skip-link" href="#main-content">
        Skip to reader
      </a>
      <ReaderToolbar
        mode={mode}
        pageDraft={pageDraft}
        pageError={pageError}
        pageCountLabel={pageCountLabel}
        sidebarOpen={sidebarOpen}
        zoom={zoom}
        theme={theme}
        toggleSidebar={() => setSidebarOpen((value) => !value)}
        onSidebarButtonRef={(node) => {
          sidebarToggleRef.current = node;
        }}
        onPageDraftChange={(value) => {
          setPageDraft(value);
          setPageError("");
        }}
        onSubmitPage={submitPage}
        onPrevious={() => navigateToPage(Math.max(1, pageIndex - 1))}
        onNext={() => navigateToPage(Math.min(totalPages, pageIndex + 1))}
        onModeChange={changeMode}
        onThemeChange={setTheme}
        onZoomOut={() => setZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(2))))}
        onZoomIn={() => setZoom((value) => Math.min(1.6, Number((value + 0.1).toFixed(2))))}
        onDownload={() => setDownloadOpen(true)}
        onNavigate={navigateToPage}
      />
      <div className="reader-layout">
        {mobileViewport && sidebarOpen && (
          <button
            className="drawer-scrim"
            type="button"
            aria-label="Close contents"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <ContentsSidebar
          selectedId={selectedEntryId}
          mobileOpen={mobileViewport && sidebarOpen}
          onSelect={selectEntry}
          onClose={() => setSidebarOpen(false)}
          onKeyDown={onDrawerKeyDown}
          onElement={(node) => {
            drawerRef.current = node;
          }}
        />
        <main className="reader-main" id="main-content">
          <div className="reader-context" aria-live="polite">
            <div>
              <span className="context-page-number">
                Page {pageIndex}
                {approximateCount ? " · estimated" : ""}
              </span>
              {activeEntry && <span className="context-entry">{activeEntry.title}</span>}
            </div>
            {pageError ? (
              <span id="page-jump-error" className="page-navigation-error" role="alert">
                {pageError}
              </span>
            ) : (
              <span className="context-source-state">
                {activeManifestEntry ? activeManifestEntry.auditStatus : "Awaiting Word import"}
              </span>
            )}
          </div>
          {activeEntry && !activeEntry.canonicalPageId && (
            <p className="mapping-note">
              This contents entry has no canonical page mapping yet. The printed label will be
              assigned during Word import.
            </p>
          )}
          {narrowSpreadFallback && (
            <p className="responsive-note" role="status">
              Spread view is showing one page at this width.
            </p>
          )}
          <div className={`reader-canvas reader-canvas-${mode}`} ref={canvasRef}>
            {mode === "infinite" ? (
              <VirtualizedScrollViewer
                key="infinite-view"
                activeIndex={pageIndex}
                totalPages={totalPages}
                width={pageWidth}
                zoom={zoom}
                jumpRevision={jumpRevision}
                onPageChange={updatePageFromScroll}
              />
            ) : (
              <div
                className="page-stage"
                aria-label={
                  mode === "double" && !narrowSpreadFallback
                    ? "Two-page spread"
                    : "Single textbook page"
                }
              >
                {mode === "double" && !narrowSpreadFallback ? (
                  <PageSpread
                    activeIndex={pageIndex}
                    totalPages={totalPages}
                    width={pageWidth}
                    zoom={zoom}
                    policy={BOOK_MANIFEST.spreadPolicy}
                  />
                ) : (
                  <CanonicalPageSurface canonicalIndex={pageIndex} width={pageWidth} zoom={zoom} />
                )}
              </div>
            )}
          </div>
        </main>
      </div>
      <DownloadDialog open={downloadOpen} onClose={() => setDownloadOpen(false)} />
    </div>
  );
}

function ReaderToolbar({
  mode,
  pageDraft,
  pageError,
  pageCountLabel,
  sidebarOpen,
  zoom,
  theme,
  toggleSidebar,
  onSidebarButtonRef,
  onPageDraftChange,
  onSubmitPage,
  onPrevious,
  onNext,
  onModeChange,
  onThemeChange,
  onZoomOut,
  onZoomIn,
  onDownload,
  onNavigate,
}: {
  mode: ViewerMode;
  pageDraft: string;
  pageError: string;
  pageCountLabel: string;
  sidebarOpen: boolean;
  zoom: number;
  theme: ThemePreference;
  toggleSidebar: () => void;
  onSidebarButtonRef: (node: HTMLButtonElement | null) => void;
  onPageDraftChange: (value: string) => void;
  onSubmitPage: (event: FormEvent<HTMLFormElement>) => void;
  onPrevious: () => void;
  onNext: () => void;
  onModeChange: (mode: ViewerMode) => void;
  onThemeChange: (theme: ThemePreference) => void;
  onZoomOut: () => void;
  onZoomIn: () => void;
  onDownload: () => void;
  onNavigate: (index: number) => void;
}) {
  return (
    <header className="reader-toolbar">
      <div className="toolbar-brand">
        <button
          ref={onSidebarButtonRef}
          className={`icon-button sidebar-toggle${sidebarOpen ? " is-selected" : ""}`}
          type="button"
          aria-label={sidebarOpen ? "Hide contents" : "Show contents"}
          aria-expanded={sidebarOpen}
          onClick={toggleSidebar}
          title="Contents (B)"
        >
          <span className="sidebar-icon" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        </button>
        <Link
          className="book-brand"
          href="/"
          aria-label="Business with Personal Finance, Book 2 home"
        >
          <span className="brand-mark" aria-hidden="true">
            B2
          </span>
          <span>
            <strong>Business with Personal Finance</strong>
            <small>Book 2 · Reader</small>
          </span>
        </Link>
      </div>

      <div className="toolbar-middle">
        <div className="mode-control" role="group" aria-label="Page viewing mode">
          {modes.map((item) => (
            <button
              key={item.id}
              type="button"
              aria-pressed={mode === item.id}
              className={mode === item.id ? "is-active" : ""}
              onClick={() => onModeChange(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        <form className="page-jump" onSubmit={onSubmitPage}>
          <button
            type="button"
            className="page-step"
            aria-label="Previous page"
            title="Previous page (←)"
            onClick={onPrevious}
          >
            ‹
          </button>
          <label className="visually-hidden" htmlFor="canonical-page-index">
            Canonical reader page
          </label>
          <input
            id="canonical-page-index"
            type="number"
            min="1"
            value={pageDraft}
            onChange={(event) => onPageDraftChange(event.target.value)}
            aria-label="Canonical reader page index"
            aria-invalid={Boolean(pageError)}
            aria-describedby={pageError ? "page-jump-error" : undefined}
          />
          <span className="page-total">/ {pageCountLabel}</span>
          <button
            type="button"
            className="page-step"
            aria-label="Next page"
            title="Next page (→)"
            onClick={onNext}
          >
            ›
          </button>
        </form>
      </div>

      <div className="toolbar-actions">
        <div className="zoom-control" role="group" aria-label="Page zoom">
          <button
            className="icon-button"
            type="button"
            aria-label="Zoom out"
            title="Zoom out (−)"
            onClick={onZoomOut}
          >
            −
          </button>
          <span aria-live="polite">{Math.round(zoom * 100)}%</span>
          <button
            className="icon-button"
            type="button"
            aria-label="Zoom in"
            title="Zoom in (+)"
            onClick={onZoomIn}
          >
            +
          </button>
        </div>
        <BookSearch onNavigate={onNavigate} />
        <label className="theme-select-wrap">
          <span className="visually-hidden">Appearance</span>
          <select
            className="theme-select"
            aria-label="Appearance"
            value={theme}
            onChange={(event) => onThemeChange(event.target.value as ThemePreference)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
        <button className="download-button" type="button" onClick={onDownload}>
          <span aria-hidden="true">↓</span> Download
        </button>
      </div>
    </header>
  );
}

function PageSpread({
  activeIndex,
  totalPages,
  width,
  zoom,
  policy,
}: {
  activeIndex: number;
  totalPages: number;
  width: number;
  zoom: number;
  policy: SpreadPolicy;
}) {
  const pages = spreadIndices(activeIndex, totalPages, policy);
  return (
    <div className="page-spread">
      {pages.map((index, side) =>
        index === null ? (
          <div
            className="spread-blank"
            key={`blank-${side}`}
            style={{ width: width * zoom, height: ((width * 297) / 210) * zoom }}
            aria-hidden="true"
          />
        ) : (
          <CanonicalPageSurface key={index} canonicalIndex={index} width={width} zoom={zoom} />
        ),
      )}
    </div>
  );
}

function spreadIndices(
  activeIndex: number,
  totalPages: number,
  policy: SpreadPolicy,
): Array<number | null> {
  return getSpreadIndices(activeIndex, totalPages, policy);
}

function VirtualizedScrollViewer({
  activeIndex,
  totalPages,
  width,
  zoom,
  jumpRevision,
  onPageChange,
}: {
  activeIndex: number;
  totalPages: number;
  width: number;
  zoom: number;
  jumpRevision: number;
  onPageChange: (index: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastJumpRevision = useRef(-1);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);
  const pageHeight = ((width * 297) / 210) * zoom;
  const stride = pageHeight + 48;
  const visibleIndex = Math.min(totalPages, Math.max(1, Math.floor((scrollTop + 80) / stride) + 1));
  const window = getVirtualWindow(totalPages, visibleIndex, viewportHeight, stride);

  useEffect(() => {
    const element = scrollRef.current;
    if (!element) return;
    const updateHeight = () => setViewportHeight(element.clientHeight);
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const previousStride = useRef<number | null>(null);
  useEffect(() => {
    const element = scrollRef.current;
    if (previousStride.current === null) {
      previousStride.current = stride;
      return;
    }
    if (previousStride.current !== stride && element) {
      const previous = previousStride.current;
      const visiblePage = Math.max(1, Math.floor((element.scrollTop + 80) / previous) + 1);
      const offsetWithinPage = element.scrollTop - (visiblePage - 1) * previous;
      const positionWithinPage = Math.max(0, Math.min(1, offsetWithinPage / previous));
      element.scrollTo({ top: (visiblePage - 1 + positionWithinPage) * stride, behavior: "auto" });
      setScrollTop(element.scrollTop);
    }
    previousStride.current = stride;
  }, [stride]);

  useEffect(() => {
    if (lastJumpRevision.current === jumpRevision) return;
    lastJumpRevision.current = jumpRevision;
    const element = scrollRef.current;
    if (!element) return;
    element.scrollTo({ top: (activeIndex - 1) * stride, behavior: "auto" });
    setScrollTop(element.scrollTop);
  }, [activeIndex, jumpRevision, stride]);

  function handleScroll() {
    const element = scrollRef.current;
    if (!element) return;
    const nextScrollTop = element.scrollTop;
    setScrollTop(nextScrollTop);
    const nextIndex = Math.min(
      totalPages,
      Math.max(1, Math.floor((nextScrollTop + 80) / stride) + 1),
    );
    onPageChange(nextIndex);
  }

  return (
    <div
      ref={scrollRef}
      className="infinite-scrollport"
      role="region"
      aria-label="Continuous book pages"
      tabIndex={0}
      onScroll={handleScroll}
    >
      <div className="virtual-page-list" aria-live="off">
        <div className="virtual-spacer" aria-hidden="true" style={{ height: window.topSpacer }} />
        {window.indices.map((index) => (
          <div className="virtual-page-row" key={index} style={{ height: stride }}>
            <CanonicalPageSurface canonicalIndex={index} width={width} zoom={zoom} />
          </div>
        ))}
        <div
          className="virtual-spacer"
          aria-hidden="true"
          style={{ height: window.bottomSpacer }}
        />
      </div>
    </div>
  );
}
