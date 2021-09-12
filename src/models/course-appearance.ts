export function create(options?: CourseAppearance): CourseAppearance {
  return {
    scaleSizes: "RelativeToMap",
    scaleSizesCircleGaps: true,
    autoLegGapSize: 0,
    blendPurple: true,
    ...options,
  };
}

export interface CourseAppearance {
  scaleSizes: "RelativeToMap" | "RelativeTo15000" | "None";
  scaleSizesCircleGaps: boolean;
  autoLegGapSize: number;
  blendPurple: boolean;
}
