export function create(options?: CourseAppearance): CourseAppearance {
  return {
    scaleSizes: "RelativeToMap",
    scaleSizesCircleGaps: true,
    autoLegGapSize: 0,
    blendPurple: true,
    controlCircleSizeRatio: 1,
    lineWidthRatio: 1,
    numberSizeRatio: 1,
    ...options,
  };
}

export function toPpen(courseAppearance: CourseAppearance) {
  return {
    type: "course-appearance",
    attrs: {
      "scale-sizes": courseAppearance.scaleSizes,
      "scale-sizes-circle-gaps": courseAppearance.scaleSizesCircleGaps,
      "auto-leg-gap-size": courseAppearance.autoLegGapSize,
      "blend-purple": courseAppearance.blendPurple,
    },
  };
}

export interface CourseAppearance {
  scaleSizes: "RelativeToMap" | "RelativeTo15000" | "None";
  scaleSizesCircleGaps: boolean;
  autoLegGapSize: number;
  blendPurple: boolean;
  controlCircleSizeRatio: number;
  lineWidthRatio: number;
  numberSizeRatio: number;
}
