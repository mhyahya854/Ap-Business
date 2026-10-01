import source from "./index.json";
import type { ContentsSourceState, TocEntry } from "../schema";

export type BookContents = {
  sourceState: ContentsSourceState;
  sourceNote: string;
  entries: TocEntry[];
};

function isEntry(value: unknown): value is TocEntry {
  if (typeof value !== "object" || value === null) return false;
  const entry = value as Record<string, unknown>;
  return (
    typeof entry.id === "string" &&
    typeof entry.type === "string" &&
    typeof entry.title === "string" &&
    (entry.printedPageLabel === null || typeof entry.printedPageLabel === "string") &&
    (entry.canonicalPageId === null || typeof entry.canonicalPageId === "string") &&
    Array.isArray(entry.children) &&
    entry.children.every(isEntry)
  );
}

const sourceEntries: unknown[] = source.entries;
if (!sourceEntries.every(isEntry)) {
  throw new Error("Book contents data does not match the TOC schema.");
}

export const BOOK_CONTENTS: BookContents = {
  sourceState: source.sourceState as ContentsSourceState,
  sourceNote: source.sourceNote,
  entries: source.entries as TocEntry[],
};

export function flattenContents(entries: TocEntry[] = BOOK_CONTENTS.entries): TocEntry[] {
  return entries.flatMap((entry) => [entry, ...flattenContents(entry.children)]);
}

export function findTocEntry(id: string | null | undefined): TocEntry | null {
  if (!id) return null;
  return flattenContents().find((entry) => entry.id === id) ?? null;
}
