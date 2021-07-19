import { featureCollection } from "@turf/helpers";
import { useMemo } from "react";
import { add, mul } from "../models/coordinate";
import {
  controlCircleOutsideDiameter,
  overprintLineWidth,
  startTriangleRadius,
} from "./use-number-positions";

export default function useControlConnections(
  controls,
  autoLegGapSize,
  labelKind,
  objScale
) {
  return useMemo(
    () =>
      createControlConnections(controls, autoLegGapSize, labelKind, objScale),
    [controls, autoLegGapSize, labelKind, objScale]
  );
}

export function createControlConnections(
  controls,
  autoLegGapSize,
  labelKind,
  objScale = 1
) {
  return featureCollection(
    labelKind === "sequence"
      ? controls
          .slice(1)
          .map((control, index) => {
            const previous = controls[index];
            const c1 = previous.coordinates;
            const c2 = control.coordinates;
            const dx = c2[0] - c1[0];
            const dy = c2[1] - c1[1];
            const l = Math.sqrt(dx * dx + dy * dy);
            const startSpace =
              (spacing(previous) + autoLegGapSize / 2) * objScale;
            const endSpace = (spacing(control) + autoLegGapSize / 2) * objScale;
            if (l > startSpace + endSpace) {
              const v = mul([dx, dy], 1 / l);
              const startCoord = add(c1, mul(v, startSpace));
              const endCoord = add(c2, mul(v, -endSpace));

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
          .filter(Boolean)
      : []
  );
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
