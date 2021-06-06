import Coordinate from "./coordinate";

export function createControl(id, kind, code, coordinates, description) {
  return {
    id: id,
    kind: kind,
    code: code,
    coordinates: new Coordinate(coordinates[0], coordinates[1]),
    description: {
      C: undefined,
      D: undefined,
      E: undefined,
      F: undefined,
      G: undefined,
      H: undefined,
      ...description,
    },
  };
}

//   toGeoJson (scaleFactor, rotation) {
//     return {
//       type: 'Feature',
//       id: this.id,
//       properties: {
//         ...this
//       },
//       geometry: this.kind !== 'start'
//         ? {
//           type: 'Point',
//           coordinates: this.coordinates.toArray()
//         }
//         : {
//           type: 'Polygon',
//           coordinates: [startTriangle.map(p => p
//             .mul(scaleFactor)
//             .rotate(rotation)
//             .add(this.coordinates).toArray())]
//         }
//     }
//   }

//   toSvg (rotation, objScale) {
//     let node

//     switch (this.kind) {
//     case 'normal':
//       node = circle(this, 300, courseOverPrintRgb, objScale)
//       break
//     case 'start':
//       node = lines(
//         startTriangle.map(p => p
//           .mul(objScale)
//           .rotate(rotation)
//           .add(this.coordinates).toArray()), true, courseOverPrintRgb, objScale)
//       break
//     case 'finish':
//       node = {
//         type: 'g',
//         children: [
//           circle(this, 250, courseOverPrintRgb, objScale),
//           circle(this, 350, courseOverPrintRgb, objScale)
//         ]
//       }
//       break
//     default:
//       throw new Error(`Unhandled control kind "${this.kind}"`)
//     }

//     return createSvgNode(window.document, node)
//   }
// }

// const startTriangle = [new Coordinate(0, 3.464), new Coordinate(3, -1.732), new Coordinate(-3, -1.732), new Coordinate(0, 3.464)]
