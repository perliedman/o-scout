import { courseBounds } from "./course";
import { buffer } from "ol/extent";

export function create(options) {
  return {
    auto: true,
    restrictToPage: true,
    ...options,
  };
}

export function getExtent(printArea, course) {
  return !printArea.auto && printArea.extent
    ? printArea.extent
    : buffer(courseBounds(course), 10);
}
