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
    restrictToPage: true,
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
