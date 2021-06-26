import bboxPolygon from "@turf/bbox-polygon";
import { featureCollection, polygon } from "@turf/helpers";
import { useMemo } from "react";

export default function useSpecialObjects(specialObjects, transformCoord) {
  return useMemo(
    () => createSpecialObjects(specialObjects, transformCoord),
    [specialObjects, transformCoord]
  );
}

export function createSpecialObjects(specialObjects, transformCoord) {
  return featureCollection(
    specialObjects
      .map(({ id, kind, locations }) => {
        const transformedCoords = locations.map(transformCoord);

        switch (kind) {
          case "white-out":
            return polygon(
              [[...transformedCoords, transformedCoords[0]]],
              { kind },
              { id }
            );
          case "descriptions":
            return bboxPolygon(transformedCoords.flat(), {
              properties: { kind },
              id,
            });
          default:
            console.warn(`Unknown special object kind "${kind}".`);
            return null;
        }
      })
      .filter(Boolean)
  );
}
