import bboxPolygon from "@turf/bbox-polygon";
import { featureCollection, lineString, polygon } from "@turf/helpers";
import lineOffset from "@turf/line-offset";
import { useMemo } from "react";

export default function useSpecialObjects(specialObjects) {
  return useMemo(() => createSpecialObjects(specialObjects), [specialObjects]);
}

export function createSpecialObjects(specialObjects) {
  return featureCollection(
    specialObjects
      .map((object) => {
        const { id, kind, locations } = object;
        switch (kind) {
          case "white-out":
            return polygon([[...locations, locations[0]]], { kind }, { id });
          case "line": {
            const {
              color,
              "line-width": lineWidth,
              "gap-size": gapSize,
            } = object;

            const line = lineString([...locations], { kind, color, lineWidth });
            return !gapSize
              ? line
              : [
                  lineOffset(line, gapSize / 2, { units: "degrees" }),
                  lineOffset(line, -gapSize / 2, { units: "degrees" }),
                ];
          }
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
      .flat()
  );
}
