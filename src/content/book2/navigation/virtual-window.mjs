export function getVirtualWindow(totalPages, activeIndex, viewportHeight, stride, overscan = 2) {
  if (
    !Number.isSafeInteger(totalPages) ||
    totalPages < 1 ||
    !Number.isFinite(stride) ||
    stride <= 0
  ) {
    return { start: 0, end: -1, topSpacer: 0, bottomSpacer: 0, indices: [] };
  }
  const current = Math.min(totalPages, Math.max(1, Math.floor(activeIndex)));
  const visible = Math.max(1, Math.ceil(Math.max(0, viewportHeight) / stride));
  const start = Math.max(1, current - overscan);
  const end = Math.min(totalPages, current + Math.max(3, visible + overscan));
  return {
    start,
    end,
    topSpacer: (start - 1) * stride,
    bottomSpacer: (totalPages - end) * stride,
    indices: Array.from({ length: end - start + 1 }, (_, offset) => start + offset),
  };
}
