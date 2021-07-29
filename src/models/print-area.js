import { courseBounds } from "./course";
import { buffer } from "ol/extent";
import { PAPER_SIZES } from "../services/print";

const {
  dimensions: [defaultWidth, defaultHeight],
} = PAPER_SIZES.find((paper) => paper.name === "A4");

export function create(options) {
  return {
    auto: true,
    restrictToPage: true,
    pageWidth: defaultWidth,
    pageHeight: defaultHeight,
    ...options,
  };
}

export function getExtent(printArea, course) {
  return !printArea.auto && printArea.extent
    ? printArea.extent
    : buffer(courseBounds(course), 10);
}
