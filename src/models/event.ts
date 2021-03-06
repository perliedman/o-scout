import cloneDeep from "lodash/cloneDeep";
import * as Control from "./control";
import { Control as ControlType } from "./control";
import * as Course from "./course";
import { Course as CourseType } from "./course";
import * as CourseAppearance from "./course-appearance";
import { CourseAppearance as CourseAppearanceType } from "./course-appearance";
import * as PrintArea from "./print-area";
import { PrintArea as PrintAreaType } from "./print-area";
import { SpecialObject } from "./special-object";

export const ALL_CONTROLS_ID = -1;

interface Sequence {
  next: () => number;
}

export interface Event {
  name: string;
  courses: CourseType[];
  controlCodeGenerator: Sequence;
  idGenerator: Sequence;
  mapScale: number;
  mapFilename: string;
  controls: Record<string, ControlType>;
  specialObjects: SpecialObject[];
  courseAppearance: CourseAppearanceType;
  printArea: PrintAreaType;
  // allControls: CourseType;
}

export function create(name: string): Event {
  const event: Event = {
    name: name,
    mapScale: 15000,
    mapFilename: "",
    courses: [],
    controlCodeGenerator: sequence(30),
    idGenerator: sequence(1),
    controls: {},
    specialObjects: [],
    courseAppearance: CourseAppearance.create(),
    printArea: PrintArea.create(),
    // allControls: Course.create(
    //   ALL_CONTROLS_ID,
    //   "All Controls",
    //   [],
    //   15000,
    //   "all-controls"
    // ),
  };

  event.courses.push(
    Course.create(ALL_CONTROLS_ID, "All Controls", [], 15000, "all-controls", {
      labelKind: "code",
    })
  );
  return event;
}

export function load(data: Event): Event {
  const maxId = toFinite(
    Math.max(
      0,
      ...[
        ...Object.keys(data.controls),
        ...data.courses.map((course) => course.id),
      ]
        .map(Number)
        .filter((x) => !isNaN(x))
    ),
    0
  );
  const maxControlCode = toFinite(
    Math.max(
      ...[...Object.keys(data.controls).map((id) => data.controls[id].code)]
        .map(Number)
        .filter((x) => !isNaN(x))
    ),
    29
  );

  const event = {
    ...data,
    idGenerator: sequence(maxId + 1),
    controlCodeGenerator: sequence(maxControlCode + 1),
  };
  updateAllControls(event);

  return event;
}

export function setMap(
  event: Event,
  mapScale: number,
  mapFilename: string
): void {
  event.mapScale = mapScale;
  event.mapFilename = mapFilename;
  event.courses
    .filter(
      (course) => course.controls.length === 0 || course.id === ALL_CONTROLS_ID
    )
    .forEach((course) => (course.printScale = mapScale));
}

export function addCourse(event: Event, course: CourseType): void {
  if (!course.id) {
    course.id = event.idGenerator.next();
  }
  course.controls.forEach((c) => {
    if (!event.controls[c.id]) {
      event.controls[c.id] = Control.clone(c);
    }
  });
  const allControlsIndex = event.courses.findIndex(
    (course) => course.id === ALL_CONTROLS_ID
  );
  // Make sure all controls is always last
  if (allControlsIndex >= 0) {
    event.courses.splice(allControlsIndex, 0, course);
  } else {
    event.courses.push(course);
  }
  updateAllControls(event);
}

export function addControl(event: Event, control: ControlType): ControlType {
  const id = (control.id = event.idGenerator.next());
  const { kind } = control;
  if (kind !== "start" && kind !== "finish") {
    control.code = event.controlCodeGenerator.next();
  }
  event.controls[id] = control;
  updateAllControls(event);
  return control;
}

export function updateControl(
  event: Event,
  controlId: number,
  updateFn: (control: ControlType) => void
): void {
  updateFn(event.controls[controlId]);
  event.courses.forEach((course) => {
    for (let i = 0; i < course.controls.length; i++) {
      if (course.controls[i].id === controlId) {
        updateFn(course.controls[i]);
      }
    }
  });
  updateAllControls(event);
}

export function updateAllControls(event: Event): void {
  const allControls = getAllControls(event);
  allControls.controls = Object.values(event.controls)
    .filter((control) => control.kind === "normal")
    .map((control) => cloneDeep(control));
  allControls.printArea = event.printArea && cloneDeep(event.printArea);
}

export function getAllControls(event: Event): CourseType {
  const allControls = event.courses.find(
    (course) => course.id === ALL_CONTROLS_ID
  );
  if (!allControls) throw new Error("All controls course not found.");
  return allControls;
}

const sequence = (start: number) =>
  (() => {
    let s = start - 1;
    return {
      next: () => ++s,
      current: () => s,
    };
  })();

function toFinite(x: number, fallback: number): number {
  return !isNaN(x) && Math.abs(x) !== Infinity ? x : fallback;
}
