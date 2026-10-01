import type { CanonicalPage } from "@/content/book2/schema";

export type PageAuditResult = {
  valid: boolean;
  issues: string[];
  counts: { tables: number; figures: number; equations: number };
};

export function auditCanonicalPage(page: CanonicalPage): PageAuditResult {
  const issues: string[] = [];
  if (!Number.isSafeInteger(page.canonicalIndex) || page.canonicalIndex < 1)
    issues.push("canonical index must be a positive integer");
  if (page.canonicalId !== `book2-page-${String(page.canonicalIndex).padStart(4, "0")}`)
    issues.push("canonical ID does not match the canonical index");
  if (page.pageSize.widthMm !== 210 || page.pageSize.heightMm !== 297)
    issues.push("page size must be A4 portrait");
  if (!page.contentHash || !page.contentVersion)
    issues.push("content hash and version are required");
  if (
    page.audit.status === "verified" &&
    (!page.source.documentPath ||
      !page.source.documentSha256 ||
      !page.audit.sourceHash ||
      page.audit.structuralValidation !== "pass" ||
      page.audit.visualComparison !== "pass")
  ) {
    issues.push(
      "verified status requires source traceability and passing structural and visual audits",
    );
  }

  const counts = countBlocks(page.blocks);
  for (const assetId of page.assets) {
    if (!assetId.trim()) issues.push("asset references must use stable non-empty IDs");
  }
  return { valid: issues.length === 0, issues, counts };
}

function countBlocks(blocks: CanonicalPage["blocks"]): PageAuditResult["counts"] {
  return blocks.reduce<PageAuditResult["counts"]>(
    (counts, block) => {
      if (block.type === "table") counts.tables += 1;
      if (block.type === "figure" || block.type === "image") counts.figures += 1;
      if (block.type === "equation") counts.equations += 1;
      if (block.type === "callout" || block.type === "shaded-box") {
        const nested = countBlocks(block.blocks);
        counts.tables += nested.tables;
        counts.figures += nested.figures;
        counts.equations += nested.equations;
      }
      if (block.type === "columns") {
        for (const column of block.columns) {
          const nested = countBlocks(column);
          counts.tables += nested.tables;
          counts.figures += nested.figures;
          counts.equations += nested.equations;
        }
      }
      return counts;
    },
    { tables: 0, figures: 0, equations: 0 },
  );
}
