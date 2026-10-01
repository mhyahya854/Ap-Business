export type VirtualWindow = {
  start: number;
  end: number;
  topSpacer: number;
  bottomSpacer: number;
  indices: number[];
};
export function getVirtualWindow(
  totalPages: number,
  activeIndex: number,
  viewportHeight: number,
  stride: number,
  overscan?: number,
): VirtualWindow;
