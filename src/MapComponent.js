import OlMap from "ol/Map";
import { useCallback, useEffect, useRef, useState } from "react";
import "ol/ol.css";
import useEvent, { useMap, useNotifications } from "./store";
import { View } from "ol";
import Spinner from "./ui/Spinner";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import useClip from "./use-clip";
import shallow from "zustand/shallow";
import EventMapMismatchDialog from "./EventMapMismatchDialog";

export default function MapComponent() {
  const { mapProvider, map, setMapInstance, setClipLayer } = useMap(
    getMap,
    shallow
  );
  const pushNotification = useNotifications(getPush);

  useRestoredData();

  const container = useRef();
  const [projection, setProjection] = useState();
  const hasTileErrors = useRef(false);
  const [state, setState] = useState("idle");

  const registerProjection = useCallback(_registerProjection, [mapProvider]);
  useEffect(() => {
    setState("loading");
    hasTileErrors.current = false;
    registerProjection();
    return () => {
      setProjection(null);
    };
  }, [registerProjection, hasTileErrors, mapProvider]);
  useEffect(createMap, [setMapInstance, mapProvider, projection]);
  const onSuccess = useCallback(() => setState("idle"), []);
  const onError = useCallback(
    (e) => {
      console.log(e);
      if (!hasTileErrors.current) {
        pushNotification(
          "warning",
          "Some parts of the map failed to display",
          e.message || e.toString()
        );
        hasTileErrors.current = true;
      }
    },
    [hasTileErrors, pushNotification]
  );
  const mapLayer = useMapLayer({
    mapProvider,
    onSuccess,
    onError,
  });
  useEffect(() => {
    if (map && mapLayer) {
      map.addLayer(mapLayer);
      map.getView().fit(mapLayer.getExtent(), { padding: [50, 370, 50, 50] });
      return () => {
        map.removeLayer(mapLayer);
      };
    }
  }, [map, mapLayer]);
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
    if (mapProvider) {
      const projection = await mapProvider.getOlProjection();
      setProjection(projection);
    }
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
  mapProvider,
  map,
  setMapInstance,
  clipGeometry,
  setClipLayer,
}) {
  return {
    mapProvider,
    map,
    setMapInstance,
    clipGeometry,
    setClipLayer,
  };
}

function getPush({ push }) {
  return push;
}

function getEvent({ isRestored, mapFilename }) {
  return { mapFilename, isRestored };
}

function useRestoredData() {
  const { isRestored, mapFilename: eventMapName } = useEvent(getEvent, shallow);
  const { mapFilename: currentMapFilename } = useMap(({ mapFilename }) => ({
    mapFilename,
  }));
  const { push, pop } = useNotifications(
    ({ push, pop }) => ({
      push,
      pop,
    }),
    shallow
  );
  useEffect(() => {
    if (isRestored && eventMapName && eventMapName !== currentMapFilename) {
      push(
        "info",
        "Event's map does not match selected map",
        <EventMapMismatchDialog onClose={pop} />
      );
    }
  }, [push, pop, isRestored, currentMapFilename, eventMapName]);
}

function useMapLayer({ mapProvider, onError, onSuccess }) {
  const [layer, setLayer] = useState();
  useEffect(() => {
    if (mapProvider) {
      createLayer();
    }

    async function createLayer() {
      setLayer(await mapProvider.createTileLayer({ onError, onSuccess }));
    }
  }, [mapProvider, onError, onSuccess]);

  return layer;
}
