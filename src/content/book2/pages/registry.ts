import type { CanonicalPage } from "../schema";

export type CanonicalPageModule = { page: CanonicalPage };
export type CanonicalPageLoader = () => Promise<CanonicalPageModule>;

// The Word import build adds one dynamic import per generated page module here.
// Keeping loaders separate from the manifest keeps page bodies out of the initial bundle.
export const PAGE_LOADERS: Record<string, CanonicalPageLoader> = {};
