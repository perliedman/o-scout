import { length, sub } from "./coordinate";

export const controlDistance = (c1, c2) => {
  return length(sub(c1.coordinates, c2.coordinates));
};

export function createControl(id, kind, code, coordinates, description) {
  return {
    id: id,
    kind: kind,
    code: code,
    coordinates: [...coordinates],
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
