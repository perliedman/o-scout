import { boundingExtent, buffer, extend, Extent, getCenter } from "ol/extent";
import { mmToMeter } from "../services/coordinates";
import { Control, controlDistance } from "./control";
import * as PrintArea from "./print-area";
import { PrintArea as PrintAreaType } from "./print-area";
import { SpecialObject } from "./special-object";
import { ALL_CONTROLS_ID } from "./event";
import { getControlDescriptionExtent } from "../services/create-svg";
import { paperSizeToMm } from "../services/print";

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
  return boundingExtent(course.controls.map((c) => c.coordinates));
}

export function getPrintAreaExtent(course: Course, mapScale: number): Extent {
  const { printArea } = course;
  if (!printArea.auto && printArea.extent) {
    return printArea.extent;
  } else if (printArea.restrictToPage) {
    const { pageWidth, pageHeight } = printArea;
    const pageSizeMm = [pageWidth * paperSizeToMm, pageHeight * paperSizeToMm];
    const printAreaCenter = getCenter(courseBounds(course));

    return [
      printAreaCenter[0] - pageSizeMm[0] / 4,
      printAreaCenter[1] - pageSizeMm[1] / 4,
      printAreaCenter[0] + pageSizeMm[0] / 4,
      printAreaCenter[1] + pageSizeMm[1] / 4,
    ];
  } else {
    let extent = buffer(courseBounds(course), 200 / mmToMeter / mapScale);
    for (const object of course.specialObjects) {
      if (object.kind === "descriptions") {
        extent = extend(
          extent,
          getControlDescriptionExtent(object, course.controls.length + 2)
        );
      }
    }
    return extent;
  }
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
