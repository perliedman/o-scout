import { lineSegmentDistance, pointToGeometryDistance } from "./coordinate";

describe("coordinate", () => {
  test("lineSegmentDistance", () => {
    expect(lineSegmentDistance([0, 0], [0, 0], [1, 0])).toBeCloseTo(0);

    expect(lineSegmentDistance([0.5, 1], [0, 0], [1, 0])).toBeCloseTo(1);

    expect(lineSegmentDistance([4, 0], [0, 0], [2, 0])).toBeCloseTo(2);

    expect(lineSegmentDistance([-3, 0], [0, -5], [0, 5])).toBeCloseTo(3);
  });

  test("pointToGeometryDistance", () => {
    expect(
      pointToGeometryDistance([0, 0], {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0],
        ],
      })
    ).toBeCloseTo(0);

    expect(
      pointToGeometryDistance([0.5, 1], {
        type: "LineString",
        coordinates: [
          [0, 0],
          [1, 0],
        ],
      })
    ).toBeCloseTo(1);

    expect(
      pointToGeometryDistance([4, 0], {
        type: "LineString",
        coordinates: [
          [0, 0],
          [2, 0],
        ],
      })
    ).toBeCloseTo(2);

    expect(
      pointToGeometryDistance([-3, 0], {
        type: "LineString",
        coordinates: [
          [0, -5],
          [0, 5],
        ],
      })
    ).toBeCloseTo(3);
  });
});
