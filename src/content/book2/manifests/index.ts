import source from "../../../../public/book-data/B2/manifest.json";
import type { BookManifest, PageManifestEntry } from "../schema";

function isManifestEntry(value: unknown): value is PageManifestEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.canonicalId === "string" &&
    Number.isInteger(entry.canonicalIndex) &&
    (entry.printedPageLabel === null || typeof entry.printedPageLabel === "string") &&
    typeof entry.auditStatus === "string"
  );
}

const sourcePages: unknown[] = source.pages;
if (!sourcePages.every(isManifestEntry)) {
  throw new Error("Canonical page manifest is malformed.");
}

export const BOOK_MANIFEST = source as unknown as BookManifest;
export const MANIFEST_ENTRIES: PageManifestEntry[] = BOOK_MANIFEST.pages;

export function manifestEntryForIndex(index: number): PageManifestEntry | null {
  return MANIFEST_ENTRIES.find((entry) => entry.canonicalIndex === index) ?? null;
}

export function manifestEntryForId(id: string): PageManifestEntry | null {
  return MANIFEST_ENTRIES.find((entry) => entry.canonicalId === id) ?? null;
}
