import { manifestEntryForIndex } from "../manifests";
import { PAGE_LOADERS } from "./registry";
import type { CanonicalPage, PageLoadResult } from "../schema";

const pagePromises = new Map<number, Promise<PageLoadResult>>();

export function loadCanonicalPage(index: number): Promise<PageLoadResult> {
  if (!Number.isSafeInteger(index) || index < 1)
    return Promise.resolve({ status: "invalid-index" });
  const cached = pagePromises.get(index);
  if (cached) return cached;

  const entry = manifestEntryForIndex(index);
  if (!entry) return Promise.resolve({ status: "not-imported" });
  const loader = entry.contentModule ? PAGE_LOADERS[entry.contentModule] : undefined;
  if (!loader) return Promise.resolve({ status: "failed" });

  const promise = loader()
    .then(({ page }): PageLoadResult => {
      if (page.canonicalId !== entry.canonicalId || page.canonicalIndex !== entry.canonicalIndex) {
        return { status: "failed" };
      }
      return { status: "loaded", page };
    })
    .catch(() => ({ status: "failed" as const }));
  pagePromises.set(index, promise);
  return promise;
}

export function preloadCanonicalPage(index: number): void {
  void loadCanonicalPage(index);
}

export function loadedPageOrNull(result: PageLoadResult): CanonicalPage | null {
  return result.status === "loaded" ? result.page : null;
}
