import type {
  AssetRecord,
  CanonicalPage,
  PageManifestEntry,
  SourceRef,
} from "@/content/book2/schema";

export type WordBatchSource = {
  batchId: string;
  documentPath: string;
  sha256: string;
  verified: boolean;
  pageStart: number;
  pageEnd: number;
};

export type CanonicalPageAssignment = {
  wordPageIndex: number;
  canonicalIndex: number;
  canonicalId: string;
  printedPageLabel: string | null;
  mappingVerified: boolean;
};

export type ParsedWordPage = {
  wordPageIndex: number;
  printedPageLabel: string | null;
  extractedBlocks: unknown[];
  extractedAssets: Array<{ bytes: Uint8Array; mimeType: string; alt: string }>;
  source: SourceRef;
  parserVersion: string;
};

export type NormalizedWordPage = {
  wordPageIndex: number;
  printedPageLabel: string | null;
  blocks: CanonicalPage["blocks"];
  assets: AssetRecord[];
  source: SourceRef;
  normalizationVersion: string;
};

export type GeneratedPageArtifact = {
  page: CanonicalPage;
  manifestEntry: PageManifestEntry;
  modulePath: string;
  wordPacketPath: string | null;
  pdfPath: string | null;
  assets: AssetRecord[];
};

export interface WordSourceParser {
  parseBatch(source: WordBatchSource): Promise<ParsedWordPage[]>;
}

export interface WordPageNormalizer {
  normalize(parsed: ParsedWordPage, context: CanonicalPageAssignment): Promise<NormalizedWordPage>;
}

export interface CanonicalPageGenerator {
  generate(
    normalized: NormalizedWordPage,
    context: CanonicalPageAssignment,
  ): Promise<GeneratedPageArtifact>;
}

export interface ImportAuditValidator {
  validate(artifact: GeneratedPageArtifact): Promise<{ valid: boolean; issues: string[] }>;
}

export type WordImportAdapters = {
  parser: WordSourceParser;
  normalizer: WordPageNormalizer;
  generator: CanonicalPageGenerator;
  validator: ImportAuditValidator;
};

// This orchestrator defines the stage order. A DOCX parser is deliberately not
// bundled until it can be validated against the authoritative Word masters.
export async function importVerifiedWordBatch(
  source: WordBatchSource,
  assignments: CanonicalPageAssignment[],
  adapters: WordImportAdapters,
) {
  if (!source.verified) throw new Error("Word import requires a verified source batch.");
  if (!/^[a-f0-9]{64}$/i.test(source.sha256)) throw new Error("Word source SHA-256 is invalid.");
  if (source.pageStart < 1 || source.pageEnd < source.pageStart)
    throw new Error("Word source page range is invalid.");

  const parsedPages = await adapters.parser.parseBatch(source);
  if (parsedPages.length !== source.pageEnd - source.pageStart + 1)
    throw new Error("Parsed Word page count does not match the declared source range.");
  if (assignments.length !== parsedPages.length)
    throw new Error("Every parsed Word page needs an explicit canonical mapping.");
  const artifacts: GeneratedPageArtifact[] = [];
  const mappedSourcePages = new Set<number>();
  const canonicalIndexes = new Set<number>();
  for (const parsed of parsedPages) {
    const assignment = assignments.find((entry) => entry.wordPageIndex === parsed.wordPageIndex);
    if (!assignment || !assignment.mappingVerified)
      throw new Error(`Word page ${parsed.wordPageIndex} has no verified canonical mapping.`);
    if (
      parsed.wordPageIndex < source.pageStart ||
      parsed.wordPageIndex > source.pageEnd ||
      mappedSourcePages.has(parsed.wordPageIndex)
    )
      throw new Error("Word page mapping is out of range or duplicated.");
    if (
      !Number.isSafeInteger(assignment.canonicalIndex) ||
      assignment.canonicalIndex < 1 ||
      canonicalIndexes.has(assignment.canonicalIndex)
    )
      throw new Error("Canonical page index is invalid or duplicated.");
    const expectedId = `book2-page-${String(assignment.canonicalIndex).padStart(4, "0")}`;
    if (assignment.canonicalId !== expectedId)
      throw new Error(`Canonical ID does not match page index ${assignment.canonicalIndex}.`);
    mappedSourcePages.add(parsed.wordPageIndex);
    canonicalIndexes.add(assignment.canonicalIndex);
    const normalized = await adapters.normalizer.normalize(parsed, assignment);
    const artifact = await adapters.generator.generate(normalized, assignment);
    const audit = await adapters.validator.validate(artifact);
    if (!audit.valid)
      throw new Error(
        `Canonical page ${assignment.canonicalIndex} failed validation: ${audit.issues.join("; ")}`,
      );
    artifacts.push(artifact);
  }
  if (mappedSourcePages.size !== parsedPages.length)
    throw new Error("Not all Word pages have a unique canonical mapping.");
  return artifacts;
}
