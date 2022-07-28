import { readMap } from "./services/map";
import OcadTiler from "ocad-tiler";
import { svgToUrl } from "./services/svg-to-bitmap";
import { XMLSerializer, DOMImplementation } from "xmldom";

const domImplementation = new DOMImplementation();

onmessage = async function ({ data }) {
  switch (data.type) {
    case "SET_MAP_FILE":
      const mapFile = await readMap(data.blob);
      this.tiler = new OcadTiler(mapFile);
      break;
    case "GET_TILE":
      const { tileId, extent, resolution, tileSize } = data;

      const svg = this.tiler.renderSvg(extent, resolution, {
        DOMImplementation: domImplementation,
      });
      svg.setAttributeNS(null, "width", tileSize[0]);
      svg.setAttributeNS(null, "height", tileSize[1]);
      svg.setAttribute("viewBox", `0 0 ${tileSize[0]} ${tileSize[1]}`);

      postMessage({
        type: "TILE",
        tileId: tileId,
        url: await svgToUrl(svg, new XMLSerializer()),
      });
      break;
    default:
      throw new Error(`Unhandled message type "${data.type}.`);
  }
};
