import { featureCollection, lineString } from "@turf/helpers";
import { pointToGeometryDistance } from "../models/coordinate";
import { createNumberPositions } from "./use-number-positions";

describe("create-number-positions", () => {
  test("numbers keep distance to all objects", () => {
    const controls = [
      { coordinates: [0, 0] },
      { coordinates: [30, 0] },
      { coordinates: [15, 15] },
    ];
    const courseObjects = featureCollection([
      lineString([
        [6, 0],
        [24, 0],
      ]),
      lineString([
        [25, 5],
        [20, 10],
      ]),
      lineString([
        [10, 10],
        [5, 5],
      ]),
    ]);
    const numberPositions = createNumberPositions(
      controls,
      courseObjects,
      (x) => x,
      1
    );

    numberPositions.features.forEach(
      ({ geometry: { coordinates: numberCoordinate } }) => {
        courseObjects.features.forEach(({ geometry: courseObjectGeometry }) => {
          expect(
            pointToGeometryDistance(numberCoordinate, courseObjectGeometry)
          ).toBeGreaterThan(10);
        });
      }
    );
  });
});
