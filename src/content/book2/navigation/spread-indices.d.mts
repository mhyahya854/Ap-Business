export type SpreadPolicyInput = {
  firstCanonicalPageSide: "left" | "right" | null;
  coversParticipate: boolean | null;
  coverPageIndices: number[] | null;
  intentionalBlankBehavior: "show" | "skip" | null;
  intentionalBlankPageIndices: number[] | null;
};
export function spreadIndices(
  activeIndex: number,
  totalPages: number,
  policy: SpreadPolicyInput,
): Array<number | null>;
