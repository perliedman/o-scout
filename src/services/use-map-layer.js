import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import * as olSize from "ol/size";
import { useMemo } from "react";
import TileState from "ol/TileState";
import { svgToBitmap } from "./svg-to-bitmap";

export default function useMapLayer({
  map,
  projection,
  tiler,
  onError,
  onSuccess,
}) {
  return useMemo(() => {
    if (map && projection) {
      const source = new XYZ({
        projection,
        tileLoadFunction: loadTile,
        url: "{z}/{x}/{y}.png",
      });

      return new TileLayer({ source });

      async function loadTile(tile) {
        if (!tile.getImage().src) {
          try {
            const { tileCoord } = tile;
            const [z] = tileCoord;
            const tileGrid = source.getTileGrid();
            const resolution = tileGrid.getResolution(z);
            const tileSize = olSize.toSize(tileGrid.getTileSize(z));
            const extent = tileGrid.getTileCoordExtent(tileCoord);
            const svg = tiler.renderSvg(extent, resolution, {
              DOMImplementation: document.implementation,
            });

            svg.setAttributeNS(null, "width", tileSize[0]);
            svg.setAttributeNS(null, "height", tileSize[1]);
            svg.setAttribute("viewBox", `0 0 ${tileSize[0]} ${tileSize[1]}`);

            tile.getImage().src = await svgToBitmap(svg, tileSize);
            onSuccess();
          } catch (e) {
            onError(e);
            tile.setState(TileState.ERROR);
          }
        }
      }
    }
  }, [map, projection, tiler, onSuccess, onError]);
}
