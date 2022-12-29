declare module "ocad-tiler" {
  import { OcadFile } from "./store";
  import { Extent } from "ol/extent";

  type SvgOptions = Record<string, never>;

  export default class OcadTiler {
    constructor(ocadMap: OcadFile);
    bounds: Extent;
    renderSvg(
      extent: Extent,
      resolution: number,
      options: SvgOptions
    ): XMLDocument;
  }
}
