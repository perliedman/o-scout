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
import Projection from "ol/proj/Projection";
import TileState from "ol/TileState";
import { useMap } from "./store";

export default function MapComponent() {
  const { mapFile, map, setMapInstance } = useMap(getMap);

  const container = useRef();
  const [projection, setProjection] = useState();

  const registerProjection = useCallback(_registerProjection, [mapFile]);
  useEffect(() => {
    registerProjection();
    return () => {
      setProjection(null);
    };
  }, [registerProjection, mapFile]);
  useEffect(createMap, [setMapInstance, mapFile, projection]);
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
      const ocadTiler = new OcadTiler(mapFile);

      const layer = new TileLayer({ source });
      map.addLayer(layer);
      map.getView().fit(ocadTiler.bounds);

      return () => {
        map.removeLayer(layer);
      };

      function loadTile(tile) {
        if (!tile.getImage().src) {
          try {
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

            const image = new Image();
            const xml = svg.outerHTML;
            const url = `data:image/svg+xml;base64,${btoa(
              unescape(encodeURIComponent(xml))
            )}`;
            image.src = url;

            image.onload = () => {
              const canvas = document.createElement("canvas");
              canvas.width = tileSize[0];
              canvas.height = tileSize[1];
              const ctx = canvas.getContext("2d");
              ctx.drawImage(image, 0, 0);

              tile.getImage().src = canvas.toDataURL();
            };
          } catch (e) {
            console.log(e);
            tile.setState(TileState.ERROR);
          }
        }
      }
    }
  }
}

function getMap({ mapFile, map, setMapInstance }) {
  return { mapFile, map, setMapInstance };
}
