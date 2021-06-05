import { featureCollection } from "@turf/helpers";
import Coordinate from "./coordinate";
import { createSvgNode, lines } from "../create-svg";

const distance = (c1, c2) => {
  const crd1 = c1.coordinates;
  const crd2 = c2.coordinates;
  const dx = crd2[0] - crd1[0];
  const dy = crd2[1] - crd1[1];
  return Math.sqrt(dx * dx + dy * dy);
};

export const courseOverPrintRgb = "rgba(182, 44, 152, 0.8)";

export default class Course {
  constructor(event, id, name, controls = [], printScale, type) {
    this.event = event;
    this.id = id;
    this.name = name;
    this.controls = controls;
    this.printScale = printScale;
    this.type = type;
  }

  distance() {
    const controls = this.controls;
    return (
      (controls.slice(1).reduce((a, c, i) => a + distance(controls[i], c), 0) /
        1000 /
        1000) *
      this.event.map.scale
    );
  }

  bounds() {
    return this.controls.reduce(
      (a, c) => [
        Math.min(a[0], c.coordinates[0]),
        Math.min(a[1], c.coordinates[1]),
        Math.max(a[2], c.coordinates[0]),
        Math.max(a[3], c.coordinates[1]),
      ],
      [Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE]
    );
  }

  objScale() {
    return this.printScale / this.event.map.scale;
  }

  addControl(id) {
    this.controls.push(this.event.controls[id]);
  }

  removeControl(controlId) {
    const index = this.controls.findIndex((c) => c.id === controlId);
    this.controls.splice(index, 1);
  }

  controlsToGeoJson() {
    const scaleFactor = this.objScale();

    return featureCollection(
      this.controls.map((c, i) =>
        c.toGeoJson(
          scaleFactor,
          c.kind === "start" && this.controls.length > i + 1
            ? Math.atan2.apply(
                Math,
                this.controls[i + 1].coordinates
                  .sub(c.coordinates)
                  .toArray()
                  .reverse()
              ) -
                Math.PI / 2
            : 0
        )
      )
    );
  }

  controlLabelsToGeoJson() {
    return featureCollection(
      createControlTextLocations(this.controls, this.objScale())
    );
  }

  controlConnectionsToGeoJson() {
    switch (this.type) {
      case "normal":
        return featureCollection(
          createControlConnections(this.controls, this.objScale())
        );
      case "score":
        return featureCollection([]);
      default:
        throw new Error(`Unknown course type "${this.type}".`);
    }
  }

  toSvg() {
    const controls = this.controls;
    const objScale = this.objScale();

    return createSvgNode(document, {
      type: "g",
      children: controls
        .map((c, i) =>
          c.toSvg(
            c.kind === "start" && this.controls.length > i + 1
              ? Math.atan2.apply(
                  Math,
                  this.controls[i + 1].coordinates
                    .sub(c.coordinates)
                    .toArray()
                    .reverse()
                ) -
                  Math.PI / 2
              : 0,
            objScale
          )
        )
        .concat(
          createControlConnections(controls, objScale).map(
            ({ geometry: { coordinates } }) =>
              lines(coordinates, false, courseOverPrintRgb, objScale)
          )
        )
        .concat(
          createControlTextLocations(controls, objScale).map(
            ({ properties, geometry: { coordinates } }, i) => ({
              type: "text",
              attrs: {
                x: coordinates[0] * 100,
                y: -coordinates[1] * 100,
                dx: "-50%",
                dy: "50%",
                fill: courseOverPrintRgb,
                style: `font: normal ${600 * objScale}px sans-serif;`,
              },
              text:
                properties.kind !== "start" && properties.kind !== "finish"
                  ? (i + 1).toString()
                  : "",
            })
          )
        ),
    });
  }
}

const defaultControlNumberAngle = Math.PI / 6;
const controlCircleOutsideDiameter = 5.9; //5.35
const controlNumberCircleDistance = 2; // 1.825
const controlCircleSize = 1;

const createControlTextLocations = (controls, courseObjRatio) => {
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
      result.push(textLocation);
    });

  return result;
};

// This is more or less a re-implementation of Purple Pen's CourseFormatter's
// text placement logic, found in
// https://github.com/petergolde/PurplePen/blob/master/src/PurplePen/CourseFormatter.cs
const createTextPlacement = (controls, control, label, courseObjRatio) => {
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
    properties: { ...control, label },
    geometry: {
      type: "Point",
      coordinates: textCoord.toArray(),
    },
  };
};

const getTextLocation = (
  controlLocation,
  distanceFromCenter,
  text,
  controls
) => {
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
};

const createControlConnections = (controls, courseObjScale) =>
  controls.slice(1).map((_, i) => {
    const r = (controlCircleOutsideDiameter / 2) * courseObjScale;
    const c0 = controls[i].coordinates;
    const c1 = controls[i + 1].coordinates;
    const v = c1.sub(c0);
    const l = v.vLength();

    const dx = v[0] / l;
    const dy = v[1] / l;

    const p0 = c0.add(new Coordinate(dx * r, dy * r));
    const p1 = c1.sub(new Coordinate(dx * r, dy * r));

    return {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates: [p0.toArray(), p1.toArray()],
      },
    };
  });
