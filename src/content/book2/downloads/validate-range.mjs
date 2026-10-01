export function validatePageRange(from, to, totalPages) {
  if (!Number.isSafeInteger(from) || from < 1) return { valid: false, reason: "from-invalid" };
  if (!Number.isSafeInteger(to) || to < 1) return { valid: false, reason: "to-invalid" };
  if (from > to) return { valid: false, reason: "order-invalid" };
  if (totalPages === null) return { valid: false, reason: "book-count-unresolved" };
  if (to > totalPages) return { valid: false, reason: "outside-book" };
  return { valid: true };
}
