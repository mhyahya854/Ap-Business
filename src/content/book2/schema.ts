export type CanonicalPageId = `book2-page-${string}`;
export type CanonicalPageIndex = number;
export type PrintedPageLabel = string;

export type TocEntryType =
  | "front-matter"
  | "unit"
  | "module"
  | "section"
  | "subsection"
  | "review"
  | "practice"
  | "case-study"
  | "appendix"
  | "references"
  | "glossary"
  | "index"
  | "back-matter"
  | "unplaced";

export type TocEntry = {
  id: string;
  type: TocEntryType;
  title: string;
  printedPageLabel: PrintedPageLabel | null;
  canonicalPageId: CanonicalPageId | null;
  placementStatus?: "known" | "unresolved";
  children: TocEntry[];
};

export type ContentsSourceState = "complete" | "partial" | "missing";
export type AuditStatus =
  "unimported" | "imported" | "structural-pass" | "visual-pass" | "verified" | "failed";

export type WordSource = {
  batchId: string | null;
  documentPath: string | null;
  documentSha256: string | null;
  wordPageIndex: number | null;
};

export type AssetRecord = {
  id: string;
  contentHash: string;
  path: string;
  mimeType: string;
  sizeBytes: number;
  widthPx: number;
  heightPx: number;
  alt: string;
  source: WordSource;
};

export type PageManifestEntry = {
  canonicalId: CanonicalPageId;
  canonicalIndex: CanonicalPageIndex;
  printedPageLabel: PrintedPageLabel | null;
  unitId: string | null;
  moduleId: string | null;
  sectionId: string | null;
  physicalPageRole: "cover" | "content" | "intentional-blank" | null;
  contentModule: string | null;
  source: WordSource;
  pdfAssetId: string | null;
  wordPacketPath: string | null;
  contentHash: string | null;
  contentVersion: string | null;
  auditStatus: AuditStatus;
};

export type SpreadPolicy = {
  firstCanonicalPageSide: "left" | "right" | null;
  coversParticipate: boolean | null;
  coverPageIndices: number[] | null;
  intentionalBlankBehavior: "show" | "skip" | null;
  intentionalBlankPageIndices: number[] | null;
};

export type BookManifest = {
  bookId: "B2";
  partId: "P1";
  schemaVersion: 1;
  releaseId: string | null;
  canonicalPageCount: number | null;
  planningEstimate: number;
  fullPartAuditStatus: "not_started" | "in_progress" | "complete";
  wordBatches: Array<{
    batchId: string;
    documentPath: string | null;
    sha256: string | null;
    pageStart: number | null;
    pageEnd: number | null;
    verified: boolean;
  }>;
  searchIndexPath: string | null;
  spreadPolicy: SpreadPolicy;
  pages: PageManifestEntry[];
};

export type SourceRef = {
  documentPath: string | null;
  documentSha256: string | null;
  wordPageIndex: number | null;
  batchId: string | null;
};

export type AuditMetadata = {
  status: AuditStatus;
  sourceHash: string | null;
  webHash: string | null;
  expectedText: string | null;
  expectedTableCount: number | null;
  expectedFigureCount: number | null;
  expectedEquationCount: number | null;
  structuralValidation: "unavailable" | "pass" | "fail";
  visualComparison: "unavailable" | "pending" | "pass" | "fail";
};

export type InlineMark = "bold" | "italic" | "underline" | "superscript" | "subscript";
export type InlineContent =
  | { type: "text"; text: string; marks?: InlineMark[] }
  | { type: "link"; href: string; children: InlineContent[] }
  | { type: "break" };

export type LayoutRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  unit: "page-percent";
  zIndex?: number;
};

export type TableBorder = {
  color: string;
  widthPt: number;
  style: "solid" | "dashed" | "dotted" | "double" | "none";
};

export type TableCell = {
  id: string;
  blocks: PageBlock[];
  rowSpan?: number;
  columnSpan?: number;
  fill?: string;
  borders?: Partial<Record<"top" | "right" | "bottom" | "left", TableBorder>>;
  alignment?: "left" | "center" | "right" | "justify";
  widthPercent?: number;
  header?: boolean;
};

export type PageBlockBase = {
  id: string;
  layout?: LayoutRect;
};

export type PageBlock = PageBlockBase &
  (
    | { type: "text" | "paragraph"; content: InlineContent[]; styleId?: string }
    | { type: "rich-text"; content: InlineContent[]; styleId?: string }
    | { type: "heading"; level: 1 | 2 | 3 | 4 | 5 | 6; content: InlineContent[]; styleId?: string }
    | { type: "list"; ordered: boolean; items: InlineContent[][]; markerStyle?: string }
    | {
        type: "table";
        caption?: string;
        headers?: TableCell[];
        rows: TableCell[][];
        columnWidths?: number[];
      }
    | { type: "figure"; assetId: string; caption?: string; alt: string }
    | { type: "image"; assetId: string; alt: string; decorative?: boolean }
    | { type: "caption"; content: InlineContent[]; figureId?: string }
    | {
        type: "equation";
        format: "mathml" | "latex" | "linear";
        source: string;
        accessibleText: string;
        sourceOmml?: string;
      }
    | {
        type: "shape";
        shape: "rectangle" | "ellipse" | "line";
        fill?: string;
        stroke?: string;
        strokeWidthPt?: number;
        label?: string;
      }
    | {
        type: "callout" | "shaded-box";
        blocks: PageBlock[];
        fill?: string;
        border?: string;
        label?: string;
      }
    | {
        type: "mcq";
        stem: PageBlock[];
        options: Array<{ id: string; content: InlineContent[] }>;
        answerId?: string | null;
      }
    | { type: "vertical-text"; content: InlineContent[]; direction: "vertical-rl" | "vertical-lr" }
    | { type: "columns"; columns: PageBlock[][]; gapPt?: number }
    | { type: "page-number"; printedPageLabel: PrintedPageLabel | null; canonicalIndex: number }
    | { type: "footnote"; marker: string; content: InlineContent[] }
  );

export type CanonicalPage = {
  canonicalId: CanonicalPageId;
  canonicalIndex: CanonicalPageIndex;
  printedPageLabel: PrintedPageLabel | null;
  chapterId: string | null;
  moduleId: string | null;
  sectionId: string | null;
  pageSize: { widthMm: 210; heightMm: 297 };
  blocks: PageBlock[];
  assets: string[];
  source: SourceRef;
  contentVersion: string;
  contentHash: string;
  audit: AuditMetadata;
};

export type SearchRecord = {
  canonicalPageId: CanonicalPageId;
  canonicalIndex: number;
  unitId: string | null;
  moduleId: string | null;
  sectionId: string | null;
  snippet: string;
  terms: string[];
};

export type SearchIndexManifest = {
  version: string;
  generatedFromRelease: string;
  records: SearchRecord[];
};

export type ExportFormat = "word" | "pdf";
export type ExportAvailability = "ready" | "not-generated" | "unavailable";

export type PageLoadResult =
  | { status: "loaded"; page: CanonicalPage }
  | { status: "not-imported" }
  | { status: "invalid-index" }
  | { status: "failed" };
