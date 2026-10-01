export function spreadIndices(activeIndex, totalPages, policy) {
  if (!Number.isSafeInteger(activeIndex) || activeIndex < 1 || activeIndex > totalPages)
    return [null, null];
  if (
    policy.firstCanonicalPageSide === null ||
    policy.coversParticipate === null ||
    policy.intentionalBlankBehavior === null ||
    (!policy.coversParticipate && policy.coverPageIndices === null) ||
    (policy.intentionalBlankBehavior === "skip" && policy.intentionalBlankPageIndices === null)
  ) {
    const first = activeIndex === totalPages && activeIndex > 1 ? activeIndex - 1 : activeIndex;
    return [first, first < totalPages ? first + 1 : null];
  }

  const excluded = new Set();
  if (!policy.coversParticipate) {
    for (const index of policy.coverPageIndices ?? []) excluded.add(index);
  }
  if (policy.intentionalBlankBehavior === "skip") {
    for (const index of policy.intentionalBlankPageIndices ?? []) excluded.add(index);
  }
  const pages = [];
  for (let index = 1; index <= totalPages; index += 1) {
    if (!excluded.has(index)) pages.push(index);
  }
  const currentPosition = pages.indexOf(activeIndex);
  if (currentPosition < 0) return [activeIndex, null];
  const start =
    policy.firstCanonicalPageSide === "right"
      ? Math.floor((currentPosition + 1) / 2) * 2 - 1
      : Math.floor(currentPosition / 2) * 2;
  return [pages[start] ?? null, pages[start + 1] ?? null];
}
