import { Extent } from "ol/extent";
import { PAPER_SIZES } from "../services/print";

const a4 = PAPER_SIZES.find((paper) => paper.name === "A4");
if (!a4) throw new Error(`Can't find default paper A4.`);
const {
  dimensions: [defaultWidth, defaultHeight],
} = a4;

export function create(options?: PrintArea): PrintArea {
  return {
    auto: true,
    restrictToPage: false,
    pageWidth: defaultWidth,
    pageHeight: defaultHeight,
    ...options,
  };
}

export interface PrintArea {
  auto: boolean;
  restrictToPage: boolean;
  /**
   * Page width in 1/100 inches
   */
  pageWidth: number;
  /**
   * Page height in 1/100 inches
   */
  pageHeight: number;
  /**
   * The manually selected extent (if any); only used if `auto` is `false`
   */
  extent?: Extent;
}

export function toPpen(printArea: PrintArea) {
  //<print-area automatic="true" restrict-to-page-size="true" left="0" top="0" right="0" bottom="0" page-width="827" page-height="1169" page-margins="0" page-landscape="false" />
  return {
    type: "print-area",
    attrs: {
      automatic: printArea.auto,
      "restrict-to-page-size": printArea.restrictToPage,
      "page-width": printArea.pageWidth,
      "page-height": printArea.pageHeight,
      "page-margins": 0,
      "page-landscape": false,
      ...(printArea.extent
        ? {
            left: printArea.extent[0],
            bottom: printArea.extent[1],
            right: printArea.extent[2],
            top: printArea.extent[3],
          }
        : {}),
    },
  };
}
