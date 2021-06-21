import { controlDistance } from "./control";

export const courseOverPrintRgb = "rgba(182, 44, 152, 0.8)";

export function createCourse(id, name, controls = [], printScale, type) {
  return {
    id: id,
    name: name,
    controls: controls,
    printScale: printScale,
    type: type,
    specialObjects: [],
  };
}

export function courseDistance(course, scale) {
  const controls = course.controls;
  return (
    (controls
      .slice(1)
      .reduce((a, c, i) => a + controlDistance(controls[i], c), 0) /
      1000 /
      1000) *
    scale
  );
}

export function courseBounds(course) {
  return course.controls.reduce(
    (a, c) => [
      Math.min(a[0], c.coordinates[0]),
      Math.min(a[1], c.coordinates[1]),
      Math.max(a[2], c.coordinates[0]),
      Math.max(a[3], c.coordinates[1]),
    ],
    [Number.MAX_VALUE, Number.MAX_VALUE, -Number.MAX_VALUE, -Number.MAX_VALUE]
  );
}

//   objScale() {
//     return this.printScale / this.event.map.scale;
//   }

//   addControl(id) {
//     this.controls.push(this.event.controls[id]);
//   }

//   removeControl(controlId) {
//     const index = this.controls.findIndex((c) => c.id === controlId);
//     this.controls.splice(index, 1);
//   }

//   controlsToGeoJson() {
//     const scaleFactor = this.objScale();

//     return featureCollection(
//       this.controls.map((c, i) =>
//         c.toGeoJson(
//           scaleFactor,
//           c.kind === "start" && this.controls.length > i + 1
//             ? Math.atan2.apply(
//                 Math,
//                 this.controls[i + 1].coordinates
//                   .sub(c.coordinates)
//                   .toArray()
//                   .reverse()
//               ) -
//                 Math.PI / 2
//             : 0
//         )
//       )
//     );
//   }

//   controlLabelsToGeoJson() {
//     return featureCollection(
//       createControlTextLocations(this.controls, this.objScale())
//     );
//   }

//   controlConnectionsToGeoJson() {
//     switch (this.type) {
//       case "normal":
//         return featureCollection(
//           createControlConnections(this.controls, this.objScale())
//         );
//       case "score":
//         return featureCollection([]);
//       default:
//         throw new Error(`Unknown course type "${this.type}".`);
//     }
//   }

// const defaultControlNumberAngle = Math.PI / 6;
// const controlCircleOutsideDiameter = 5.9; //5.35
// const controlNumberCircleDistance = 2; // 1.825
// const controlCircleSize = 1;

// const createControlTextLocations = (controls, courseObjRatio) => {
//   const objects = controls.slice();
//   const result = [];
//   controls
//     .filter((c) => c.kind !== "start" && c.kind !== "finish")
//     .forEach((c, i) => {
//       const textLocation = createTextPlacement(
//         objects,
//         c,
//         (i + 1).toString(),
//         courseObjRatio
//       );
//       objects.push({
//         coordinates: new Coordinate(textLocation.geometry.coordinates),
//       });
//       result.push(textLocation);
//     });

//   return result;
// };

// // This is more or less a re-implementation of Purple Pen's CourseFormatter's
// // text placement logic, found in
// // https://github.com/petergolde/PurplePen/blob/master/src/PurplePen/CourseFormatter.cs
// const createTextPlacement = (controls, control, label, courseObjRatio) => {
//   let textCoord;
//   if (control.numberLocation) {
//     textCoord = control.coordinates.add(control.numberLocation);
//   } else {
//     const textDistance =
//       (controlCircleOutsideDiameter / 2 +
//         controlNumberCircleDistance * courseObjRatio * controlCircleSize) *
//       courseObjRatio;
//     textCoord = getTextLocation(
//       control.coordinates,
//       textDistance,
//       control.code,
//       controls
//     );
//   }

//   return {
//     type: "Feature",
//     properties: { ...control, label },
//     geometry: {
//       type: "Point",
//       coordinates: textCoord.toArray(),
//     },
//   };
// };

// const getTextLocation = (
//   controlLocation,
//   distanceFromCenter,
//   text,
//   controls
// ) => {
//   const deltaAngle = Math.PI / 16;
//   const d = distanceFromCenter + 1.2;

//   const nearbyObjects = controls.filter((c) => {
//     const d = c.coordinates.sub(controlLocation).vLength();
//     return d > 0 && d <= distanceFromCenter * 4;
//   });

//   let bestPoint;
//   let bestDistance = -1;

//   for (
//     let angle = defaultControlNumberAngle;
//     angle < defaultControlNumberAngle + 2 * Math.PI;
//     angle += deltaAngle
//   ) {
//     const pt = controlLocation.add(
//       new Coordinate(d * Math.cos(angle), d * Math.sin(angle))
//     );
//     const distanceFromNearby = nearbyObjects.reduce(
//       (a, o) => Math.min(a, o.coordinates.sub(pt).vLength()),
//       Number.MAX_VALUE
//     );
//     if (distanceFromNearby > bestDistance) {
//       bestPoint = pt;
//       bestDistance = distanceFromNearby;
//     }
//   }

//   return bestPoint;
// };
