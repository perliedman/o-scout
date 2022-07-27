import { length, sub } from "./coordinate";

export const controlDistance = (c1: Control, c2: Control): number => {
  return length(sub(c1.coordinates, c2.coordinates));
};

type ControlKind = "start" | "finish" | "normal";

type CreateProps = {
  id: number;
  kind: ControlKind;
  code: number;
  coordinates: number[];
  description?: Description;
};

export function create({
  id,
  kind,
  code,
  coordinates,
  description,
}: CreateProps): Control {
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
      all: undefined,
      ...description,
    },
  };
}

export function clone(control: Control): Control {
  return {
    ...control,
    coordinates: [...control.coordinates],
    description: { ...control.description },
  };
}

export interface Description {
  A?: string;
  B?: string;
  C?: string;
  D?: string;
  E?: string;
  F?: string;
  G?: string;
  H?: string;
  all?: string;
}

export interface Control {
  id: number;
  kind: ControlKind;
  code?: number;
  coordinates: number[];
  description: Description;
}
