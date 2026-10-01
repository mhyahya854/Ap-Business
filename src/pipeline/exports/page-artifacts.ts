import type { CanonicalPageId, ExportFormat, PageManifestEntry } from "@/content/book2/schema";

export type PageExportArtifact = {
  canonicalPageId: CanonicalPageId;
  format: ExportFormat;
  path: string;
  contentHash: string;
};

export interface PageArtifactAssembler {
  assembleWord(pages: PageExportArtifact[]): Promise<Blob>;
  combinePdf(pages: PageExportArtifact[]): Promise<Blob>;
}

export type ExportBuildInput = {
  pages: PageManifestEntry[];
  artifacts: PageExportArtifact[];
};

// Page-level packets are the export inputs. The final combined Word master is
// generated from the verified batches and is never a browser runtime source.
