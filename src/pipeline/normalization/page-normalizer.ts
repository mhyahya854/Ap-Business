import type {
  CanonicalPageAssignment,
  ParsedWordPage,
  NormalizedWordPage,
  WordPageNormalizer,
} from "../word-import/contracts";

export type WordNormalizationRules = {
  version: string;
  preserveRuns: boolean;
  equationPolicy: "semantic-when-supported";
};

export interface WordNormalizationAdapter extends WordPageNormalizer {
  normalize(parsed: ParsedWordPage, context: CanonicalPageAssignment): Promise<NormalizedWordPage>;
}

// Conversion rules remain injected so unsupported Word constructs cannot be
// silently flattened or represented as if they had been faithfully parsed.
export type NormalizationStage =
  "text" | "typography" | "tables" | "equations" | "media" | "layout";
