import { readMap } from "./services/map";
import OcadTiler from "ocad-tiler";
import { svgToUrl } from "./services/svg-to-bitmap";
import { XMLSerializer, DOMImplementation } from "@xmldom/xmldom";

const domImplementation = new DOMImplementation();

onmessage = async function ({ data }) {
  try {
    switch (data.type) {
      case "SET_MAP_FILE": {
        const mapFile = await readMap(data.blob);
        this.tiler = new OcadTiler(mapFile);
        postMessage({
          type: "READY",
        });
        break;
      }
      case "GET_TILE": {
        const { tileId, extent, resolution, tileSize } = data;

        const svg = this.tiler.renderSvg(extent, resolution, {
          DOMImplementation: domImplementation,
        });
        svg.setAttributeNS(null, "width", tileSize[0]);
        svg.setAttributeNS(null, "height", tileSize[1]);
        svg.setAttribute("viewBox", `0 0 ${tileSize[0]} ${tileSize[1]}`);
        fixIds(svg);

        postMessage({
          type: "TILE",
          tileId: tileId,
          url: svgToUrl(svg, new XMLSerializer()),
        });
        break;
      }
      default:
        throw new Error(`Unhandled message type "${data.type}.`);
    }
  } catch (e) {
    postMessage({
      type: "ERROR",
      request: data,
      error: { message: e.message, stack: e.stack },
    });
  }
};

// In xmldom, node ids are normal attributes, while in the browser's
// DOM, they are a property on the node object itself. This method
// recursively "fixes" nodes by adding id attributes.
export function fixIds(n) {
  if (n.id) {
    n.setAttributeNS("http://www.w3.org/2000/svg", "id", n.id);
  }
  if (n.childNodes) {
    for (let i = 0; i < n.childNodes.length; i++) {
      fixIds(n.childNodes[i]);
    }
  }
}
