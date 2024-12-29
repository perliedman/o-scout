import { buffer, Extent } from "ol/extent";
import { mmToMeter } from "../services/coordinates";
import { Control, controlDistance } from "./control";
import * as PrintArea from "./print-area";
import { PrintArea as PrintAreaType } from "./print-area";
import { SpecialObject } from "./special-object";
import { ALL_CONTROLS_ID } from "./event";

export interface Course {
  id: number;
  name: string;
  controls: Control[];
  printScale: number;
  type: string;
  specialObjects: SpecialObject[];
  labelKind: string;
  printArea: PrintAreaType;
}

export const palette = {
  purple: "rgba(182, 44, 152, 0.8)",
  black: "black",
};

export const courseOverPrintRgb = palette.purple;
export const selectedOverPrintRgb = "rgba(182, 44, 152, 1)";

export function create(
  id: number,
  name: string,
  controls: Control[] = [],
  printScale: number,
  type: string,
  options?: Partial<Course>
): Course {
  return {
    id: id,
    name: name,
    controls: controls,
    printScale: printScale,
    type: type,
    specialObjects: [],
    labelKind: "sequence",
    printArea: PrintArea.create(),
    ...options,
  };
}

export function courseDistance(course: Course, scale: number): number {
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

export function courseBounds(course: Course): Extent {
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

export function getPrintAreaExtent(course: Course, mapScale: number): Extent {
  const { printArea } = course;
  return !printArea.auto && printArea.extent
    ? printArea.extent
    : buffer(courseBounds(course), 200 / mmToMeter / mapScale);
}

export function getStartRotation({ controls }: Course): number {
  const startIndex = controls.findIndex((control) => control.kind === "start");
  const start = controls[startIndex];
  const next = controls[startIndex + 1];
  if (start && next) {
    const c1 = start.coordinates;
    const c2 = next.coordinates;
    const dx = c2[0] - c1[0];
    const dy = c2[1] - c1[1];
    const angle = Math.atan2(dy, dx) - Math.PI / 2;
    return angle;
  }
  return 0;
}

export function toPpen(courses: Course[]) {
  let id = 1;

  return courses
    .filter((course) => course.id !== ALL_CONTROLS_ID)
    .map((course, i) => {
      const ids = course.controls.map(() => ++id);
      return [
        {
          type: "course",
          id: course.id,
          attrs: {
            kind: "normal",
            order: i + 1,
          },
          children: [
            { type: "name", text: course.name },
            { type: "labels", attrs: { "label-kind": "sequence" } },
            {
              type: "options",
              attrs: {
                "print-scale": course.printScale,
                load: 10, // TODO: what?
                "description-kind": "symbols",
              },
            },
            ...(course.printArea ? [PrintArea.toPpen(course.printArea)] : []),
            ...(course.controls.length > 0
              ? [{ type: "first", attrs: { "course-control": ids[0] } }]
              : []),
          ],
        },
        ...course.controls.map((control, i, cs) => ({
          type: "course-control",
          id: ids[i],
          attrs: { control: control.id },
          children:
            i < cs.length - 1
              ? [{ type: "next", attrs: { "course-control": ids[i + 1] } }]
              : [],
        })),
      ];
    })
    .flat();
}
