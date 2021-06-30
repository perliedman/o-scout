import { useMemo } from "react";
import { add } from "../models/coordinate";
import {
  controlCircleOutsideDiameter,
  overprintLineWidth,
  startTriangleRadius,
} from "./use-number-positions";

export default function useControlConnections(controls, autoLegGapSize = 0) {
  return useMemo(
    () => createControlConnections(controls, autoLegGapSize),
    [controls, autoLegGapSize]
  );
}

export function createControlConnections(controls, autoLegGapSize = 0) {
  return {
    type: "FeatureCollection",
    features: controls
      .slice(1)
      .map((control, index) => {
        const previous = controls[index];
        const c1 = previous.coordinates;
        const c2 = control.coordinates;
        const dx = c2[0] - c1[0];
        const dy = c2[1] - c1[1];
        const l = Math.sqrt(dx * dx + dy * dy);
        const startSpace = spacing(previous) + autoLegGapSize / 2;
        const endSpace = spacing(control) + autoLegGapSize / 2;
        if (l > startSpace + endSpace) {
          const vx = dx / l;
          const vy = dy / l;
          const startCoord = add(c1, [vx * startSpace, vy * startSpace]);
          const endCoord = add(c2, [-vx * endSpace, -vy * endSpace]);

          return {
            type: "Feature",
            properties: {
              kind: "line",
              start: previous,
              end: control,
            },
            geometry: {
              type: "LineString",
              coordinates: [startCoord, endCoord],
            },
          };
        }
        return null;
      })
      .filter(Boolean),
  };
}

function spacing(control) {
  const { kind } = control;
  switch (kind) {
    case "start":
      return startTriangleRadius;
    case "finish":
      return 3 + overprintLineWidth / 2;
    default:
      return controlCircleOutsideDiameter / 2 + overprintLineWidth / 2;
  }
}
