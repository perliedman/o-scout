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

type DescriptionColumn = string | { value: string };

export interface Description {
  A?: DescriptionColumn;
  B?: DescriptionColumn;
  C?: DescriptionColumn;
  D?: DescriptionColumn;
  E?: DescriptionColumn;
  F?: DescriptionColumn;
  G?: DescriptionColumn;
  H?: DescriptionColumn;
  all?: DescriptionColumn;
}

export interface Control {
  /**
   * Control's internal id
   */
  id: number;
  /**
   * Type of control (start, finish, etc.)
   */
  kind: ControlKind;
  /**
   * Control's punch code, usually 31, 32, etc.
   */
  code?: number;
  /**
   * Control's coordinates (x, y) in paper coordinates (millimeters).
   */
  coordinates: number[];
  description: Description;
}

export function toPpen(c: Control) {
  return {
    type: "control",
    id: c.id,
    attrs: {
      kind: c.kind,
    },
    children: [
      {
        type: "location",
        attrs: { x: c.coordinates[0], y: c.coordinates[1] },
      },
      ...(c.code ? [{ type: "code", text: c.code.toString() }] : []),
      ...Object.keys(c.description)
        .filter(
          (box): box is keyof Description =>
            !!c.description[box as keyof Description]
        )
        .map((box) => {
          const d = c.description[box];

          if (typeof d === "string") {
            return {
              type: "description",
              attrs: {
                box,
                "iof-2004-ref": d,
              },
            };
          } else {
            return {
              type: "description",
              attrs: {
                box,
              },
              text: d?.value,
            };
          }
        }),
    ],
  };
}
