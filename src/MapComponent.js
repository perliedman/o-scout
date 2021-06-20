import OlMap from "ol/Map";
import { register } from "ol/proj/proj4";
import { get as getOlProjection } from "ol/proj";
import { useCallback, useEffect, useRef, useState } from "react";
import proj4 from "proj4";
import { getProjection } from "./services/epsg";
import XYZ from "ol/source/XYZ";
import "ol/ol.css";
import TileLayer from "ol/layer/Tile";
import * as olSize from "ol/size";
import Projection from "ol/proj/Projection";
import TileState from "ol/TileState";
import { useMap, useNotifications } from "./store";
import { svgToBitmap } from "./services/svg-to-bitmap";

export default function MapComponent() {
  const { mapFile, map, tiler, setMapInstance } = useMap(getMap);
  const pushNotification = useNotifications(getPush);

  const container = useRef();
  const [projection, setProjection] = useState();
  const hasTileErrors = useRef(false);

  const registerProjection = useCallback(_registerProjection, [mapFile]);
  useEffect(() => {
    hasTileErrors.current = false;
    registerProjection();
    return () => {
      setProjection(null);
    };
  }, [registerProjection, hasTileErrors, mapFile]);
  useEffect(createMap, [setMapInstance, mapFile, projection]);
  useEffect(addLayer, [map, mapFile, tiler, pushNotification]);

  return <div className="absolute w-full h-full" ref={container} />;

  async function _registerProjection() {
    const crs = mapFile.getCrs();
    if (crs.catalog === "EPSG") {
      const projectionName = `${crs.catalog}:${crs.code}`;
      proj4.defs(projectionName, await getProjection(crs.code));
      register(proj4);
      setProjection(getOlProjection(projectionName));
    } else {
      setProjection(
        new Projection({
          code: "unspecified-ocad-projection",
          units: "meters",
        })
      );
    }
  }

  function createMap() {
    if (projection) {
      const map = new OlMap({ target: container.current, projection });
      setMapInstance(map);

      return () => {
        map.setTarget(null);
        setMapInstance(null);
      };
    }
  }

  function addLayer() {
    if (map) {
      const source = new XYZ({
        tileLoadFunction: loadTile,
        url: "{z}/{x}/{y}.png",
      });

      const layer = new TileLayer({ source });
      map.addLayer(layer);
      map.getView().fit(tiler.bounds);

      return () => {
        map.removeLayer(layer);
      };

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

            svg.setAttribute("width", tileSize[0]);
            svg.setAttribute("height", tileSize[1]);
            svg.setAttribute("viewBox", `0 0 ${tileSize[0]} ${tileSize[1]}`);

            tile.getImage().src = await svgToBitmap(svg, tileSize);
          } catch (e) {
            console.log(e);
            if (!hasTileErrors.current) {
              pushNotification(
                "warning",
                "Some parts of the map failed to display",
                e.toString()
              );
              hasTileErrors.current = true;
            }
            tile.setState(TileState.ERROR);
          }
        }
      }
    }
  }
}

function getMap({ mapFile, map, tiler, setMapInstance }) {
  return { mapFile, map, tiler, setMapInstance };
}

function getPush({ push }) {
  return push;
}
