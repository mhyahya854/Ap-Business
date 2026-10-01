import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (relativePath) =>
  JSON.parse(readFileSync(path.join(projectRoot, relativePath), "utf8"));
const config = readJson("book.config.json");
const manifest = readJson("public/book-data/B2/manifest.json");
const contents = readJson("src/content/book2/contents/index.json");
const assetsManifest = readJson("src/content/book2/assets/manifest.json");
const publicBookRoot = path.resolve(projectRoot, "public", "book-data", "B2");
const errors = [];
const warnings = [];

if (manifest.bookId !== config.bookId || manifest.partId !== config.partId)
  errors.push("canonical manifest identity does not match book.config.json");
if (manifest.schemaVersion !== 1) errors.push("unsupported canonical manifest schema version");
if (!Array.isArray(manifest.pages)) errors.push("canonical manifest pages must be an array");
if (!Number.isInteger(manifest.planningEstimate) || manifest.planningEstimate < 1)
  errors.push("planning estimate must be a positive integer");
if (
  manifest.canonicalPageCount !== null &&
  (!Number.isInteger(manifest.canonicalPageCount) || manifest.canonicalPageCount < 1)
)
  errors.push("canonical page count must be a positive integer or null");
if (!Array.isArray(manifest.wordBatches)) errors.push("Word source batches must be an array");
if (!Array.isArray(assetsManifest.assets)) errors.push("asset manifest entries must be an array");
if (!contents.entries || !Array.isArray(contents.entries))
  errors.push("contents entries must be an array");
if (!new Set(["complete", "partial", "missing"]).has(contents.sourceState))
  errors.push("contents source state is invalid");

const entries = Array.isArray(manifest.pages) ? manifest.pages : [];
const pageIds = new Set();
const pageIndexes = new Set();
const assetIds = new Set();
const assetHashes = new Set();
const moduleSource = readFileSync(
  path.join(projectRoot, "src/content/book2/pages/registry.ts"),
  "utf8",
);
for (const [offset, page] of entries.entries()) {
  const label = `manifest page ${offset + 1}`;
  if (!/^book2-page-\d{4}$/.test(page.canonicalId ?? ""))
    errors.push(`${label}: canonical ID is invalid`);
  if (!Number.isInteger(page.canonicalIndex) || page.canonicalIndex < 1)
    errors.push(`${label}: canonical index is invalid`);
  if (pageIds.has(page.canonicalId)) errors.push(`${label}: duplicate canonical ID`);
  if (pageIndexes.has(page.canonicalIndex)) errors.push(`${label}: duplicate canonical index`);
  pageIds.add(page.canonicalId);
  pageIndexes.add(page.canonicalIndex);
  if (
    page.auditStatus === "verified" &&
    (!page.contentHash || !page.contentVersion || !page.source?.documentSha256)
  )
    errors.push(`${label}: verified page lacks content/source hashes`);
  if (
    page.contentModule &&
    !new RegExp(`['\"]${escapeRegex(page.contentModule)}['\"]\\s*:`).test(moduleSource)
  )
    errors.push(`${label}: page content module is absent from the generated loader registry`);
  if (page.contentModule && (!page.contentHash || !page.contentVersion))
    errors.push(`${label}: imported page requires a content hash and version`);
  if (
    page.pdfAssetId &&
    !(assetsManifest.assets ?? []).some((asset) => asset.id === page.pdfAssetId)
  )
    errors.push(`${label}: PDF asset ID is absent from the asset manifest`);
  if (page.wordPacketPath) checkPublicArtifact(page.wordPacketPath, `${label}: Word packet`);
}

for (const asset of assetsManifest.assets ?? []) {
  if (!asset.id || assetIds.has(asset.id)) errors.push("asset IDs must be present and unique");
  if (
    !Number.isInteger(asset.widthPx) ||
    asset.widthPx < 1 ||
    !Number.isInteger(asset.heightPx) ||
    asset.heightPx < 1
  )
    errors.push(`asset ${asset.id ?? "(unknown)"}: pixel dimensions must be positive integers`);
  if (!/^[a-f0-9]{64}$/i.test(asset.contentHash ?? ""))
    errors.push(`asset ${asset.id ?? "(unknown)"}: SHA-256 content hash is invalid`);
  if (assetHashes.has(asset.contentHash))
    errors.push(`asset ${asset.id}: duplicate binary should reuse the existing stable asset ID`);
  if (asset.contentHash && !String(asset.path ?? "").includes(asset.contentHash))
    errors.push(`asset ${asset.id}: public path must be content-addressed by its hash`);
  if (asset.path) checkPublicArtifact(asset.path, `asset ${asset.id}`);
  assetIds.add(asset.id);
  assetHashes.add(asset.contentHash);
}

if (manifest.searchIndexPath) checkPublicArtifact(manifest.searchIndexPath, "search index");

for (const batch of manifest.wordBatches ?? []) {
  if (!batch.batchId) errors.push("Word source batch ID is required");
  if (
    batch.verified &&
    (!batch.documentPath ||
      !/^[a-f0-9]{64}$/i.test(batch.sha256 ?? "") ||
      !Number.isInteger(batch.pageStart) ||
      !Number.isInteger(batch.pageEnd) ||
      batch.pageStart < 1 ||
      batch.pageEnd < batch.pageStart)
  ) {
    errors.push(
      `Word source batch ${batch.batchId ?? "(unknown)"} is marked verified without complete source provenance`,
    );
  }
}

if (manifest.canonicalPageCount !== null) {
  if (entries.length !== manifest.canonicalPageCount)
    errors.push("manifest page count does not match the verified canonical page count");
  for (let index = 1; index <= manifest.canonicalPageCount; index += 1) {
    if (!pageIndexes.has(index))
      errors.push(`canonical page index ${index} is missing from the manifest`);
  }
}
if (entries.length > 0 && !manifest.releaseId)
  errors.push("a manifest with page records requires a release ID");
if (
  !manifest.spreadPolicy ||
  ![null, "left", "right"].includes(manifest.spreadPolicy.firstCanonicalPageSide)
)
  errors.push("spread policy first-page side is invalid");
if (
  manifest.fullPartAuditStatus !== "not_started" &&
  manifest.fullPartAuditStatus !== "in_progress" &&
  manifest.fullPartAuditStatus !== "complete"
)
  errors.push("full-part audit status is invalid");

const tocIds = new Set();
let tocCount = 0;
function validateToc(nodes, parent = "contents root") {
  if (!Array.isArray(nodes)) {
    errors.push(`${parent}: contents children must be an array`);
    return;
  }
  for (const entry of nodes) {
    tocCount += 1;
    if (typeof entry.id !== "string" || !entry.id)
      errors.push(`${parent}: TOC entry ID is missing`);
    if (tocIds.has(entry.id)) errors.push(`TOC entry ID is duplicated: ${entry.id}`);
    tocIds.add(entry.id);
    if (typeof entry.title !== "string" || !entry.title.trim())
      errors.push(`${entry.id}: TOC title is missing`);
    if (!(entry.printedPageLabel === null || typeof entry.printedPageLabel === "string"))
      errors.push(`${entry.id}: printed page label must be a string or null`);
    if (entry.canonicalPageId !== null && !pageIds.has(entry.canonicalPageId))
      errors.push(`${entry.id}: TOC canonical page mapping is not in the manifest`);
    if (!Array.isArray(entry.children)) errors.push(`${entry.id}: TOC children must be an array`);
    else validateToc(entry.children, entry.id);
  }
}
validateToc(contents.entries);
if (contents.sourceState !== "complete")
  warnings.push(
    "complete supplied contents/index source is not available; titles and printed page labels remain partial or unresolved",
  );
if (manifest.canonicalPageCount === null)
  warnings.push("canonical page count and Word source mapping remain unresolved");

if (errors.length) {
  console.error(errors.map((error) => `ERROR: ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Reader architecture valid: ${entries.length} imported page records; ${tocCount} supplied TOC titles; ${contents.sourceState} contents source.`,
  );
  for (const warning of warnings) console.log(`Pending: ${warning}.`);
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkPublicArtifact(urlPath, label) {
  if (typeof urlPath !== "string" || !urlPath.startsWith("/book-data/B2/")) {
    errors.push(`${label}: public artifact path must stay under /book-data/B2/`);
    return;
  }
  const target = path.resolve(projectRoot, "public", urlPath.slice(1));
  const relative = path.relative(publicBookRoot, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    errors.push(`${label}: public artifact path escapes the Book 2 data folder`);
  } else if (!existsSync(target)) {
    errors.push(`${label}: referenced public artifact has not been generated`);
  }
}
