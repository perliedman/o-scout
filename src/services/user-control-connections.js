import { useMemo } from "react";
import {
  controlCircleOutsideDiameter,
  overprintLineWidth,
  startTriangleRadius,
} from "./use-number-positions";

export default function useControlConnections(controls, transformCoord) {
  return useMemo(
    () => createControlConnections(controls, transformCoord),
    [controls, transformCoord]
  );
}

export function createControlConnections(controls, transformCoord) {
  return {
    type: "FeatureCollection",
    features: controls
      .slice(1)
      .map((control, index) => {
        const previous = controls[index];
        const c1 = transformCoord(previous.coordinates);
        const c2 = transformCoord(control.coordinates);
        const dx = c2[0] - c1[0];
        const dy = c2[1] - c1[1];
        const l = Math.sqrt(dx * dx + dy * dy);
        const startSpace = spacing(previous);
        const endSpace = spacing(control);
        if (l > startSpace + endSpace) {
          const vx = dx / l;
          const vy = dy / l;
          const startCoord = c1.add([vx * startSpace, vy * startSpace]);
          const endCoord = c2.add([-vx * endSpace, -vy * endSpace]);

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
      return startTriangleRadius * 10;
    case "finish":
      return 30 + (overprintLineWidth * 10) / 2;
    default:
      return (
        (controlCircleOutsideDiameter / 2) * 10 + (overprintLineWidth * 10) / 2
      );
  }
}
