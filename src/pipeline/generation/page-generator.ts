import type { CanonicalPageGenerator } from "../word-import/contracts";

export interface PageGenerationAdapter extends CanonicalPageGenerator {
  readonly schemaVersion: number;
  readonly rendererVersion: string;
}

export type GenerationOutput = {
  contentModule: string;
  moduleHash: string;
  publicAssets: string[];
  exportArtifacts: string[];
};

// One page is the incremental build unit. The release manifest is updated only
// after generated page modules, assets, and validation records are complete.
