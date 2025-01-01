import { useMemo } from "react";

export default function useControls(controls) {
  return useMemo(() => createControls(controls), [controls]);
}

export function createControls(controls) {
  return {
    type: "FeatureCollection",
    features: controls
      .map((control, index) => ({
        type: "Feature",
        id: control.id,
        properties: { ...control, index },
        geometry: {
          type: "Point",
          coordinates: control.coordinates,
        },
      }))
      .concat(),
  };
}
