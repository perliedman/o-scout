import bboxPolygon from "@turf/bbox-polygon";
import { featureCollection, lineString, polygon } from "@turf/helpers";
import lineOffset from "@turf/line-offset";
import { useMemo } from "react";
import { getControlDescriptionExtent } from "./create-svg";
import { palette } from "../models/course";
import cmykToRgb from "ocad2geojson/src/cmyk-to-rgb";
import { asArray } from "ol/color";

export default function useSpecialObjects(specialObjects, numberControls) {
  return useMemo(
    () => createSpecialObjects(specialObjects, numberControls),
    [specialObjects, numberControls]
  );
}

export function createSpecialObjects(specialObjects, numberControls) {
  return featureCollection(
    specialObjects
      .map((object) => {
        const { id, kind, locations } = object;
        switch (kind) {
          case "white-out":
            return polygon([[...locations, locations[0]]], { kind }, { id });
          case "line": {
            const {
              color = "purple",
              "line-width": lineWidth = 1,
              "gap-size": gapSize = 0,
            } = object;

            const cmykParts = color.split(",");
            const rgb =
              cmykParts.length === 4
                ? cmykToRgb(cmykParts.map((p) => p * 255))
                : asArray(palette[color]);

            const line = lineString(
              [...locations],
              { kind, color: [...rgb, 255], lineWidth },
              { id }
            );
            return !gapSize
              ? line
              : [
                  lineOffset(line, gapSize / 2, { units: "degrees" }),
                  lineOffset(line, -gapSize / 2, { units: "degrees" }),
                ];
          }
          case "boundary":
            return lineString([...locations], { kind }, { id });
          case "descriptions":
            return bboxPolygon(
              getControlDescriptionExtent(object, numberControls + 2),
              {
                properties: { kind },
                id,
              }
            );
          case "forbidden-area":
            return polygon([[...locations, locations[0]]], { kind }, { id });
          default:
            console.warn(`Unknown special object kind "${kind}".`);
            return null;
        }
      })
      .filter(Boolean)
      .flat()
  );
}
