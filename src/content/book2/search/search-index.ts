import type { SearchIndexManifest, SearchRecord } from "../schema";
import { BOOK_MANIFEST } from "../manifests";

export type SearchIndexLoadResult =
  { status: "loaded"; index: SearchIndexManifest } | { status: "unavailable" };

export async function loadBookSearchIndex(): Promise<SearchIndexLoadResult> {
  if (!BOOK_MANIFEST.searchIndexPath) return { status: "unavailable" };
  try {
    const path = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}${BOOK_MANIFEST.searchIndexPath}`;
    const response = await fetch(path, { cache: "force-cache" });
    if (!response.ok) return { status: "unavailable" };
    const index: SearchIndexManifest = await response.json();
    if (!Array.isArray(index.records) || typeof index.version !== "string")
      return { status: "unavailable" };
    return { status: "loaded", index };
  } catch {
    return { status: "unavailable" };
  }
}

export function searchBookRecords(records: SearchRecord[], query: string): SearchRecord[] {
  const terms = query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  return records.filter((record) => {
    const searchable =
      `${record.snippet} ${record.terms.join(" ")} ${record.unitId ?? ""} ${record.moduleId ?? ""} ${record.sectionId ?? ""}`.toLocaleLowerCase();
    return terms.every((term) => searchable.includes(term));
  });
}
