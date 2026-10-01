import { BOOK_MANIFEST } from "../manifests";
import type { ExportFormat, PageManifestEntry } from "../schema";
import type { PageArtifactAssembler, PageExportArtifact } from "@/pipeline/exports/page-artifacts";
import { validatePageRange } from "./validate-range.mjs";
import type { RangeValidation } from "./validate-range.mjs";

export { validatePageRange };
export type { RangeValidation };
export type PageRangeRequest = { from: number; to: number; format: ExportFormat };

export type ExportRequestResult =
  | { status: "ready"; blob: Blob; filename: string }
  | { status: "invalid-range"; validation: Exclude<RangeValidation, { valid: true }> }
  | { status: "not-generated" }
  | { status: "unavailable" };

export async function requestPageRangeExport(
  request: PageRangeRequest,
  manifestEntries: PageManifestEntry[],
  artifacts: PageExportArtifact[],
  assembler: PageArtifactAssembler | null,
): Promise<ExportRequestResult> {
  const validation = validatePageRange(request.from, request.to, BOOK_MANIFEST.canonicalPageCount);
  if (!validation.valid) return { status: "invalid-range", validation };

  const selected = manifestEntries.filter(
    (entry) => entry.canonicalIndex >= request.from && entry.canonicalIndex <= request.to,
  );
  if (selected.length !== request.to - request.from + 1) return { status: "not-generated" };
  const exportArtifacts = selected.map((entry) =>
    artifacts.find(
      (artifact) =>
        artifact.canonicalPageId === entry.canonicalId && artifact.format === request.format,
    ),
  );
  if (exportArtifacts.some((artifact) => !artifact)) return { status: "not-generated" };
  if (!assembler) return { status: "unavailable" };

  const completeArtifacts = exportArtifacts as PageExportArtifact[];
  const blob =
    request.format === "word"
      ? await assembler.assembleWord(completeArtifacts)
      : await assembler.combinePdf(completeArtifacts);
  return {
    status: "ready",
    blob,
    filename: `book2-pages-${String(request.from).padStart(4, "0")}-${String(request.to).padStart(4, "0")}.${request.format === "word" ? "docx" : "pdf"}`,
  };
}
