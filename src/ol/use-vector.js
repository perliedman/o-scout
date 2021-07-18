import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { useEffect, useMemo } from "react";

export default function useVector(map, features, options = {}) {
  const source = useMemo(
    () => new VectorSource(options.sourceOptions),
    [options.sourceOptions]
  );
  const layer = useMemo(
    () => new VectorLayer({ ...options.layerOptions, source }),
    [source, options.layerOptions]
  );
  useEffect(() => {
    if (map) {
      map.addLayer(layer);
      return () => {
        map.removeLayer(layer);
      };
    }
  }, [map, layer]);
  useEffect(() => {
    source.addFeatures(features);
    return () => {
      source.clear();
    };
  }, [source, features]);

  return { source, layer };
}
