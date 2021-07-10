export function create(options) {
  return {
    scaleSizes: "RelativeToMap",
    scaleSizesCircleGaps: true,
    autoLegGapSize: 0,
    blendPurple: true,
    ...options,
  };
}
