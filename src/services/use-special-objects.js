import bboxPolygon from "@turf/bbox-polygon";
import { featureCollection, polygon } from "@turf/helpers";
import { useMemo } from "react";

export default function useSpecialObjects(specialObjects) {
  return useMemo(() => createSpecialObjects(specialObjects), [specialObjects]);
}

export function createSpecialObjects(specialObjects) {
  return featureCollection(
    specialObjects
      .map(({ id, kind, locations }) => {
        switch (kind) {
          case "white-out":
            return polygon([[...locations, locations[0]]], { kind }, { id });
          case "descriptions":
            return bboxPolygon(locations.flat(), {
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
