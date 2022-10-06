import cloneDeep from "lodash/cloneDeep";
import { MakeOptional } from "../ts-utils";
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
  seed: (values: (number | string | null | undefined)[]) => void;
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
    controlCodeGenerator: sequence(31),
    idGenerator: sequence(1),
    controls: {},
    specialObjects: [],
    courseAppearance: CourseAppearance.create(),
    printArea: PrintArea.create(),
  };

  event.courses.push(
    Course.create(ALL_CONTROLS_ID, "All Controls", [], 15000, "all-controls", {
      labelKind: "code",
    })
  );
  return event;
}

export function load(data: Event): Event {
  const event = {
    ...data,
    idGenerator: sequence([
      ...Object.keys(data.controls),
      ...data.courses.map((course) => course.id),
      ...data.specialObjects.map((object) => object.id),
      0,
    ]),
    controlCodeGenerator: sequence([
      ...Object.keys(data.controls).map((id) => data.controls[id].code),
      30,
    ]),
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

export type ControlCreationOptions = MakeOptional<ControlType, "id" | "code">;

export function addControl(
  event: Event,
  controlOptions: ControlCreationOptions
): ControlType {
  const { kind } = controlOptions;
  const control = {
    ...controlOptions,
    id: controlOptions.id || event.idGenerator.next(),
    code:
      controlOptions.code ||
      (kind !== "start" && kind !== "finish"
        ? event.controlCodeGenerator.next()
        : undefined),
  };

  const { id } = control;
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
  event.controlCodeGenerator.seed(
    Object.values(event.controls)
      .map((c) => c.code)
      .filter((code: number | undefined): code is number => code != null)
  );
}

export function updateAllControls(event: Event): void {
  const allControls = getAllControls(event);
  allControls.controls = Object.values(event.controls)
    .map((control) => cloneDeep(control))
    .sort((a, b) => {
      const aVal = value(a);
      const bVal = value(b);
      return aVal - bVal;

      function value(x: ControlType): number {
        return x.kind === "start"
          ? -1
          : x.kind === "finish"
          ? Number.MAX_SAFE_INTEGER
          : x.code || 0;
      }
    });
  allControls.printArea = event.printArea && cloneDeep(event.printArea);
}

export function getAllControls(event: Event): CourseType {
  const allControls = event.courses.find(
    (course) => course.id === ALL_CONTROLS_ID
  );
  if (!allControls) throw new Error("All controls course not found.");
  return allControls;
}

export function addSpecialObject(
  event: Event,
  object: Omit<SpecialObject, "id">,
  courseId: number | undefined
): SpecialObject {
  const specialObject = { id: event.idGenerator.next(), ...object };

  event.specialObjects.push(specialObject);

  for (const course of event.courses) {
    if (object.isAllCourses || courseId === course.id) {
      course.specialObjects.push({
        ...specialObject,
        locations: [...specialObject.locations],
      });
    }
  }

  return specialObject;
}

/**
 *
 * @param seed if a number, this is the first value that will be generated by the sequence;
 *        if an array, the sequence will return the first successor to that is not in the array.
 * @returns the newly created and seeded sequence
 */
const sequence = (
  seed: number | (number | string | null | undefined)[]
): Sequence =>
  (() => {
    let s = 0;
    const sequence = {
      next: () => ++s,
      current: () => s,
      seed: (values: (number | string | null | undefined)[]) => {
        s = toFinite(
          Math.max(...values.map(Number).filter((x) => !isNaN(x))),
          0
        );
      },
    };
    sequence.seed(Array.isArray(seed) ? seed : [seed - 1]);

    return sequence;
  })();

function toFinite(x: number, fallback: number): number {
  return !isNaN(x) && Math.abs(x) !== Infinity ? x : fallback;
}
