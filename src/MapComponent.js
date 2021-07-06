import OlMap from "ol/Map";
import { register } from "ol/proj/proj4";
import { get as getOlProjection } from "ol/proj";
import { useCallback, useEffect, useRef, useState } from "react";
import proj4 from "proj4";
import { getProjection } from "./services/epsg";
import "ol/ol.css";
import { useMap, useNotifications } from "./store";
import { View } from "ol";
import Spinner from "./ui/Spinner";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import useClip from "./use-clip";
import useMapLayer from "./services/use-map-layer";

export default function MapComponent() {
  const { mapFile, map, tiler, setMapInstance, setClipLayer, clipLayer } =
    useMap(getMap);
  const pushNotification = useNotifications(getPush);

  const container = useRef();
  const [projection, setProjection] = useState();
  const hasTileErrors = useRef(false);
  const [state, setState] = useState("idle");

  const registerProjection = useCallback(_registerProjection, [mapFile]);
  useEffect(() => {
    setState("loading");
    hasTileErrors.current = false;
    registerProjection();
    return () => {
      setProjection(null);
    };
  }, [registerProjection, hasTileErrors, mapFile]);
  useEffect(createMap, [setMapInstance, mapFile, projection]);
  const onSuccess = useCallback(() => setState("idle"), []);
  const onError = useCallback(
    (e) => {
      console.log(e);
      if (!hasTileErrors.current) {
        pushNotification(
          "warning",
          "Some parts of the map failed to display",
          e.toString()
        );
        hasTileErrors.current = true;
      }
    },
    [hasTileErrors, pushNotification]
  );
  const mapLayer = useMapLayer({ map, projection, tiler, onSuccess, onError });
  useEffect(() => {
    if (map && mapLayer) {
      map.addLayer(mapLayer);
      map.getView().fit(tiler.bounds);
      return () => {
        map.removeLayer(mapLayer);
      };
    }
  }, [map, mapLayer, tiler?.bounds]);
  useEffect(addClipLayer, [map, setClipLayer]);
  useClip(mapLayer);

  return (
    <>
      <div className="absolute w-full h-full" ref={container} />
      {state === "loading" && (
        <div className="flex h-screen">
          <div className="m-auto text-center bg-white text-2xl text-gray-400">
            <Spinner className="text-gray-400" /> Loading map...
          </div>
        </div>
      )}
    </>
  );

  async function _registerProjection() {
    const crs = mapFile.getCrs();
    const projectionName =
      crs.catalog === "EPSG"
        ? `${crs.catalog}:${crs.code}`
        : // TODO: This is a really stupid fallback; figure out how
          // to set a really "generic" projection
          "EPSG:3006";
    proj4.defs(projectionName, await getProjection(crs.code));
    register(proj4);
    setProjection(getOlProjection(projectionName));
  }

  function createMap() {
    if (projection) {
      const map = new OlMap({
        target: container.current,
        view: new View({ projection }),
      });
      setMapInstance(map);

      return () => {
        map.setTarget(null);
        setMapInstance(null);
      };
    }
  }

  function addClipLayer() {
    if (map) {
      const source = new VectorSource();
      const nextClipLayer = new VectorLayer({
        style: null,
        source,
      });

      setClipLayer(nextClipLayer);
      map.addLayer(nextClipLayer);

      return () => {
        map.removeLayer(nextClipLayer);
        setClipLayer(undefined);
      };
    }
  }
}

function getMap({
  mapFile,
  map,
  tiler,
  setMapInstance,
  clipGeometry,
  clipLayer,
  setClipLayer,
}) {
  return {
    mapFile,
    map,
    tiler,
    setMapInstance,
    clipGeometry,
    setClipLayer,
    clipLayer,
  };
}

function getPush({ push }) {
  return push;
}
