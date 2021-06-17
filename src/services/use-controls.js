import { useMemo } from "react";

export default function useControls(controls, transformCoord) {
  return useMemo(
    () => createControls(controls, transformCoord),
    [controls, transformCoord]
  );
}

export function createControls(controls, transformCoord) {
  return {
    type: "FeatureCollection",
    features: controls
      .map((control, index) => ({
        type: "Feature",
        properties: { ...control, index },
        geometry: {
          type: "Point",
          coordinates: transformCoord(control.coordinates),
        },
      }))
      .concat(),
  };
}
