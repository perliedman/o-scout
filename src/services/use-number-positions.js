import { useMemo } from "react";
import { add, pointToGeometryDistance } from "../models/coordinate";

export default function useNumberPositions(
  controls,
  courseObjects /* GeoJSON FeatureCollection */,
  courseObjRatio = 1
) {
  return useMemo(
    () => createNumberPositions(controls, courseObjects, courseObjRatio),
    [controls, courseObjects, courseObjRatio]
  );
}

export function createNumberPositions(
  controls,
  courseObjects /* GeoJSON FeatureCollection */,
  courseObjRatio
) {
  const objects = [
    ...controls.map(({ coordinates }) => ({ type: "Point", coordinates })),
    ...courseObjects.features.map(({ geometry }) => geometry),
  ];
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
        type: "Point",
        coordinates: [textLocation.geometry.coordinates],
      });
      result.push(textLocation);
    });

  return {
    type: "FeatureCollection",
    features: result,
  };

  // This is more or less a re-implementation of Purple Pen's CourseFormatter's
  // text placement logic, found in
  // https://github.com/petergolde/PurplePen/blob/master/src/PurplePen/CourseFormatter.cs
  function createTextPlacement(courseObjects, control, label, courseObjRatio) {
    let textCoord;
    if (control.numberLocation) {
      textCoord = control.coordinates.add(control.numberLocation);
    } else {
      const textDistance =
        (controlCircleOutsideDiameter / 2 +
          controlNumberCircleDistance * courseObjRatio * controlCircleSize) *
        courseObjRatio;
      textCoord = getTextLocation(
        control,
        textDistance,
        control.code,
        courseObjects
      );
    }

    return {
      type: "Feature",
      properties: { ...control, label, kind: "number" },
      geometry: {
        type: "Point",
        coordinates: textCoord,
      },
    };
  }

  function getTextLocation(control, distanceFromCenter, text, courseObjects) {
    const deltaAngle = Math.PI / 16;
    distanceFromCenter += 1.2;

    const nearbyObjects = courseObjects.filter((c) => {
      const d = pointToGeometryDistance(control.coordinates, c);
      return d > 0 && d <= distanceFromCenter * 4;
    });

    let bestPoint;
    let bestDistance = -1;

    for (
      let angle = defaultControlNumberAngle;
      angle < defaultControlNumberAngle + 2 * Math.PI;
      angle += deltaAngle
    ) {
      const candidate = add(control.coordinates, [
        distanceFromCenter * Math.cos(angle),
        distanceFromCenter * Math.sin(angle),
      ]);
      const distanceFromNearby = nearbyObjects.reduce(
        (a, o) => Math.min(a, pointToGeometryDistance(candidate, o)),
        Number.MAX_VALUE
      );
      if (distanceFromNearby > bestDistance) {
        bestPoint = candidate;
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
