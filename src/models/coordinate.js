import { toProjectedCoord } from "../services/coordinates";

export function length(vec) {
  return Math.sqrt(length2(vec));
}

export function length2(vec) {
  return vec[0] * vec[0] + vec[1] * vec[1];
}

export function add(vec1, vec2) {
  return [vec1[0] + vec2[0], vec1[1] + vec2[1]];
}

export function sub(vec1, vec2) {
  return [vec1[0] - vec2[0], vec1[1] - vec2[1]];
}

export function mul(vec, c) {
  return [vec[0] * c, vec[1] * c];
}

export function rotate(vec, theta) {
  return [
    vec[0] * Math.cos(theta) - vec[1] * Math.sin(theta),
    vec[0] * Math.sin(theta) + vec[1] * Math.cos(theta),
  ];
}

export function pointToGeometryDistance(
  pointCoordinate,
  { type, coordinates: coordinates2 }
) {
  switch (type) {
    case "Point":
      return length(sub(pointCoordinate, coordinates2));
    case "LineString": {
      let minDist = Number.MAX_VALUE;
      for (let i = 1; i < coordinates2.length; i++) {
        const segDist = lineSegmentDistance(
          pointCoordinate,
          coordinates2[i - 1],
          coordinates2[i]
        );
        if (segDist < minDist) {
          minDist = segDist;
        }
      }
      return minDist;
    }
    default:
      throw new Error(`Unhandled distance to geometry of type ${type}.`);
  }
}

export function lineSegmentDistance(p, v, w) {
  const vw = sub(w, v);
  const l2 = length2(vw);
  if (l2 === 0) return length(sub(p, v));
  const t = Math.max(
    0,
    Math.min(1, ((p[0] - v[0]) * vw[0] + (p[1] - v[1]) * vw[1]) / l2)
  );
  return length(sub(p, [v[0] + t * vw[0], v[1] + t * vw[1]]));
}

export function applyGrivation(c, grivation) {
  return rotate(c, grivation);
}
