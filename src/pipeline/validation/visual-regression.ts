export type VisualComparisonInput = {
  canonicalId: string;
  referenceImagePath: string;
  renderedImagePath: string;
  width: number;
  height: number;
  threshold: number;
  regions?: Array<{ id: string; x: number; y: number; width: number; height: number }>;
};

export type VisualComparisonResult = {
  canonicalId: string;
  comparedAt: string;
  width: number;
  height: number;
  diffRatio: number | null;
  threshold: number;
  textDiff: { expected: string | null; actual: string | null; passed: boolean | null };
  structuralPass: boolean | null;
  visualPass: boolean | null;
};

// CI render and comparison tooling is intentionally a contract only; current pages have no Word reference renders.
