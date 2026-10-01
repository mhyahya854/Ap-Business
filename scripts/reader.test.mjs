import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { validatePageRange } from "../src/content/book2/downloads/validate-range.mjs";
import { spreadIndices } from "../src/content/book2/navigation/spread-indices.mjs";
import { getVirtualWindow } from "../src/content/book2/navigation/virtual-window.mjs";

const unresolvedSpreadPolicy = {
  firstCanonicalPageSide: null,
  coversParticipate: null,
  coverPageIndices: null,
  intentionalBlankBehavior: null,
  intentionalBlankPageIndices: null,
};

test("page-range validation distinguishes invalid input, unresolved bounds, and verified bounds", () => {
  assert.deepEqual(validatePageRange(1, 12, 20), { valid: true });
  assert.deepEqual(validatePageRange(0, 2, 20), { valid: false, reason: "from-invalid" });
  assert.deepEqual(validatePageRange(5, 4, 20), { valid: false, reason: "order-invalid" });
  assert.deepEqual(validatePageRange(1, 21, 20), { valid: false, reason: "outside-book" });
  assert.deepEqual(validatePageRange(1, 12, null), {
    valid: false,
    reason: "book-count-unresolved",
  });
});

test("virtual windows keep a small mounted range and preserve spacer height", () => {
  const stride = 1200;
  const result = getVirtualWindow(1900, 950, 900, stride);
  assert.ok(result.indices.length < 10);
  assert.equal(result.indices[0], result.start);
  assert.equal(result.indices.at(-1), result.end);
  assert.equal(
    result.topSpacer + result.indices.length * stride + result.bottomSpacer,
    1900 * stride,
  );

  const lastPage = getVirtualWindow(1900, 1900, 900, stride);
  assert.equal(lastPage.end, 1900);
  assert.equal(lastPage.bottomSpacer, 0);
});

test("unresolved spreads preserve sequence without assigning book parity", () => {
  assert.deepEqual(spreadIndices(1, 1900, unresolvedSpreadPolicy), [1, 2]);
  assert.deepEqual(spreadIndices(1900, 1900, unresolvedSpreadPolicy), [1899, 1900]);
});

test("configured spread policy can start on the right and exclude mapped covers or intentional blanks", () => {
  const startsRight = {
    ...unresolvedSpreadPolicy,
    firstCanonicalPageSide: "right",
    coversParticipate: true,
    intentionalBlankBehavior: "show",
  };
  assert.deepEqual(spreadIndices(1, 8, startsRight), [null, 1]);
  assert.deepEqual(spreadIndices(2, 8, startsRight), [2, 3]);

  const excludesCover = {
    ...startsRight,
    firstCanonicalPageSide: "left",
    coversParticipate: false,
    coverPageIndices: [1],
  };
  assert.deepEqual(spreadIndices(2, 8, excludesCover), [2, 3]);

  const skipsBlank = {
    ...excludesCover,
    coversParticipate: true,
    coverPageIndices: [],
    intentionalBlankBehavior: "skip",
    intentionalBlankPageIndices: [2],
  };
  assert.deepEqual(spreadIndices(3, 8, skipsBlank), [1, 3]);
});

test("contents data preserves explicit source titles and leaves missing mappings unresolved", () => {
  const contents = JSON.parse(
    readFileSync(new URL("../src/content/book2/contents/index.json", import.meta.url), "utf8"),
  );
  const entries = flatten(contents.entries);
  const titles = new Set(entries.map((entry) => entry.title));
  for (const title of [
    "Practice Your AP® Skills",
    "Consumer Psychology: Cialdini’s Seven Principles of Influence",
    "Module 4.4 Strategic Frameworks: Porter’s Five Forces and SWOT Analysis",
    "Case Study Bernard L. Madoff Investment Securities, LLC.",
    "Appendix: The Business Model Canvas",
    "Glossary/Glosario",
  ])
    assert.ok(titles.has(title), `missing explicit source title: ${title}`);
  assert.equal(contents.sourceState, "partial");
  assert.equal(entries.find((entry) => entry.id === "module-1-1")?.printedPageLabel, "4");
  assert.ok(entries.every((entry) => entry.canonicalPageId === null));
});

function flatten(entries) {
  return entries.flatMap((entry) => [entry, ...flatten(entry.children)]);
}
