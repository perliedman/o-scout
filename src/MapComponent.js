import OlMap from "ol/Map";
import { register } from "ol/proj/proj4";
import { get as getOlProjection } from "ol/proj";
import { useCallback, useEffect, useRef, useState } from "react";
import proj4 from "proj4";
import { getProjection } from "./services/epsg";
import XYZ from "ol/source/XYZ";
import "ol/ol.css";
import OcadTiler from "ocad-tiler";
import TileLayer from "ol/layer/Tile";
import * as olSize from "ol/size";

export default function MapComponent({ mapFile }) {
  const container = useRef();
  const [projection, setProjection] = useState();
  const [map, setMap] = useState();

  const registerProjection = useCallback(_registerProjection, [mapFile]);
  useEffect(() => {
    registerProjection();
    return () => {
      setProjection(null);
    };
  }, [registerProjection, mapFile]);
  useEffect(createMap, [mapFile, projection]);
  useEffect(addLayer, [map, mapFile]);

  return <div className="absolute w-full h-full" ref={container} />;

  async function _registerProjection() {
    const crs = mapFile.getCrs();
    if (crs.catalog === "EPSG") {
      const projectionName = `${crs.catalog}:${crs.code}`;
      proj4.defs(projectionName, await getProjection(crs.code));
      register(proj4);
      setProjection(getOlProjection(projectionName));
    } else {
      throw new Error("Map file CRS is not EPSG, can't find projection.");
    }
  }

  function createMap() {
    if (projection) {
      const map = new OlMap({ target: container.current, projection });
      setMap(map);

      return () => {
        map.setTarget(null);
      };
    }
  }

  function addLayer() {
    if (map) {
      const source = new XYZ({
        tileLoadFunction: loadTile,
        url: "{z}/{x}/{y}.png",
      });
      const ocadTiler = new OcadTiler(mapFile);

      const layer = new TileLayer({ source });
      map.addLayer(layer);
      map.getView().fit(ocadTiler.bounds);

      return () => {
        map.removeLayer(layer);
      };

      function loadTile(tile) {
        if (!tile.getImage().src) {
          const { tileCoord } = tile;
          const [z] = tileCoord;
          const tileGrid = source.getTileGrid();
          const resolution = tileGrid.getResolution(z);
          const tileSize = olSize.toSize(tileGrid.getTileSize(z));
          const extent = tileGrid.getTileCoordExtent(tileCoord);
          const svg = ocadTiler.renderSvg(extent, resolution, {
            DOMImplementation: document.implementation,
          });

          svg.setAttribute("width", tileSize[0]);
          svg.setAttribute("height", tileSize[1]);
          svg.setAttribute("viewBox", `0 0 ${tileSize[0]} ${tileSize[1]}`);

          const xml = svg.outerHTML;
          const url = `data:image/svg+xml;base64,${btoa(
            unescape(encodeURIComponent(xml))
          )}`;
          tile.getImage().src = url;
        }
      }
    }
  }
}
