import source from "./manifest.json";
import type { AssetRecord } from "../schema";

function isAsset(value: unknown): value is AssetRecord {
  if (typeof value !== "object" || value === null) return false;
  const asset = value as Record<string, unknown>;
  return (
    typeof asset.id === "string" &&
    typeof asset.contentHash === "string" &&
    typeof asset.path === "string" &&
    typeof asset.widthPx === "number" &&
    Number.isInteger(asset.widthPx) &&
    asset.widthPx > 0 &&
    typeof asset.heightPx === "number" &&
    Number.isInteger(asset.heightPx) &&
    asset.heightPx > 0 &&
    typeof asset.alt === "string"
  );
}

const records: unknown[] = source.assets;
if (!records.every(isAsset)) throw new Error("Book asset manifest is malformed.");
export const BOOK_ASSETS: Record<string, AssetRecord> = Object.fromEntries(
  (source.assets as AssetRecord[]).map((asset) => [asset.id, asset]),
);
