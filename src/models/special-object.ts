import type { Coordinate } from "ol/coordinate";
import { Course } from "./course";

interface SpecialObjectBase {
  id: number;
  kind: string;
  isAllCourses: boolean;
  locations: Coordinate[];
}

interface LineObject extends SpecialObjectBase {
  kind: "line";
  color?: string;
  lineWidth?: string;
}

interface WhiteOutObject extends SpecialObjectBase {
  kind: "white-out";
}

interface DescriptionsObject extends SpecialObjectBase {
  kind: "descriptions";
}

export type SpecialObject = LineObject | WhiteOutObject | DescriptionsObject;

export function toPpen(object: SpecialObject, courses: Course[]) {
  return {
    type: "special-object",
    attrs: {
      id: object.id,
      kind: object.kind,
    },
    children: [
      ...object.locations.map((l) => ({
        type: "location",
        attrs: {
          x: l[0],
          y: l[1],
        },
      })),
      ...appearance(object),
      {
        type: "courses",
        attrs: {
          all: object.isAllCourses,
        },
        children: !object.isAllCourses
          ? courses
              .filter((c) => c.specialObjects.some((o) => o.id === object.id))
              .map((c) => ({
                type: "course",
                attrs: { course: c.id },
              }))
          : [],
      },
    ],
  };
}

function appearance(object: SpecialObject) {
  if (object.kind === "line") {
    return [
      {
        type: "appearance",
        attrs: {
          "line-kind": "single",
          color: object.color,
          "line-width": object.lineWidth,
        },
      },
    ];
  } else {
    return [];
  }
}
