import TileLayer from "ol/layer/Tile";
import XYZ from "ol/source/XYZ";
import * as olSize from "ol/size";
import { useMemo } from "react";
import TileState from "ol/TileState";
import { svgUrlToBitmapDataUrl } from "./svg-to-bitmap";

export default function useMapLayer({
  map,
  projection,
  tileWorker,
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

      const awaitedTiles = {};
      tileWorker.onmessage = async ({ data: { type, tileId, url } }) => {
        if (type === "TILE") {
          const tileData = awaitedTiles[tileId];
          if (tileData) {
            const { tile, resolve, reject } = tileData;
            try {
              const tileGrid = source.getTileGrid();
              const tileSize = olSize.toSize(
                tileGrid.getTileSize(tile.tileCoord[0])
              );
              // Ideally, converting the SVG to a bitmap data URL should also
              // be done in the worker, but I have not found a way to do that yet.
              tile.getImage().src = await svgUrlToBitmapDataUrl(url, tileSize);
              delete awaitedTiles[tileId];
              onSuccess();
              resolve();
            } catch (e) {
              reject(e);
            }
          } else {
            console.warn(`Received unknown tile ${tileId}.`);
          }
        }
      };

      return new TileLayer({ source });

      function loadTile(tile) {
        return new Promise((resolve, reject) => {
          if (!tile.getImage().src) {
            try {
              const { tileCoord } = tile;
              const [z] = tileCoord;
              const tileGrid = source.getTileGrid();
              const resolution = tileGrid.getResolution(z);
              const tileSize = olSize.toSize(tileGrid.getTileSize(z));
              const extent = tileGrid.getTileCoordExtent(tileCoord);
              const tileId = tileCoord.join("/");
              awaitedTiles[tileId] = { tile, resolve, reject };
              tileWorker.postMessage({
                type: "GET_TILE",
                tileId,
                extent,
                resolution,
                tileSize,
              });
            } catch (e) {
              onError(e);
              tile.setState(TileState.ERROR);
              reject(e);
            }
          } else {
            resolve();
          }
        });
      }
    }
  }, [map, projection, tileWorker, onSuccess, onError]);
}
