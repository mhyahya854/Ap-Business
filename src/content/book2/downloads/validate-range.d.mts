export type RangeValidation =
  | { valid: true }
  | {
      valid: false;
      reason:
        "from-invalid" | "to-invalid" | "order-invalid" | "outside-book" | "book-count-unresolved";
    };
export function validatePageRange(
  from: number,
  to: number,
  totalPages: number | null,
): RangeValidation;
