import { useMemo } from "react";
import Coordinate from "../models/coordinate";

export default function useNumberPositions(
  controls,
  transformCoord,
  courseObjRatio = 1
) {
  return useMemo(
    () => createNumberPositions(controls, transformCoord, courseObjRatio),
    [controls, courseObjRatio, transformCoord]
  );
}

export function createNumberPositions(
  controls,
  transformCoord,
  courseObjRatio
) {
  const objects = controls.slice();
  const result = [];
  controls
    .filter((c) => c.kind !== "start" && c.kind !== "finish")
    .forEach((c, i) => {
      const textLocation = createTextPlacement(
        objects,
        c,
        (i + 1).toString(),
        courseObjRatio
      );
      objects.push({
        coordinates: new Coordinate(textLocation.geometry.coordinates),
      });
      textLocation.geometry.coordinates = transformCoord(
        textLocation.geometry.coordinates
      );
      result.push(textLocation);
    });

  return {
    type: "FeatureCollection",
    features: result,
  };

  // This is more or less a re-implementation of Purple Pen's CourseFormatter's
  // text placement logic, found in
  // https://github.com/petergolde/PurplePen/blob/master/src/PurplePen/CourseFormatter.cs
  function createTextPlacement(controls, control, label, courseObjRatio) {
    let textCoord;
    if (control.numberLocation) {
      textCoord = control.coordinates.add(control.numberLocation);
    } else {
      const textDistance =
        (controlCircleOutsideDiameter / 2 +
          controlNumberCircleDistance * courseObjRatio * controlCircleSize) *
        courseObjRatio;
      textCoord = getTextLocation(
        control.coordinates,
        textDistance,
        control.code,
        controls
      );
    }

    return {
      type: "Feature",
      properties: { ...control, label, kind: "number" },
      geometry: {
        type: "Point",
        coordinates: textCoord.toArray(),
      },
    };
  }

  function getTextLocation(
    controlLocation,
    distanceFromCenter,
    text,
    controls
  ) {
    const deltaAngle = Math.PI / 16;
    const d = distanceFromCenter + 1.2;

    const nearbyObjects = controls.filter((c) => {
      const d = c.coordinates.sub(controlLocation).vLength();
      return d > 0 && d <= distanceFromCenter * 4;
    });

    let bestPoint;
    let bestDistance = -1;

    for (
      let angle = defaultControlNumberAngle;
      angle < defaultControlNumberAngle + 2 * Math.PI;
      angle += deltaAngle
    ) {
      const pt = controlLocation.add(
        new Coordinate(d * Math.cos(angle), d * Math.sin(angle))
      );
      const distanceFromNearby = nearbyObjects.reduce(
        (a, o) => Math.min(a, o.coordinates.sub(pt).vLength()),
        Number.MAX_VALUE
      );
      if (distanceFromNearby > bestDistance) {
        bestPoint = pt;
        bestDistance = distanceFromNearby;
      }
    }

    return bestPoint;
  }
}

// Units in mm, from ISOM-2017
export const startTriangleRadius = Math.sqrt(6 * 6 + 3 * 3) / 2;
export const controlCircleOutsideDiameter = 5.0;
export const overprintLineWidth = 0.35;
const controlNumberCircleDistance = 1.825;
const defaultControlNumberAngle = Math.PI / 6;
const controlCircleSize = 1;
