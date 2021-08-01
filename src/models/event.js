import { cloneDeep } from "lodash";
import * as Control from "./control";
import * as Course from "./course";
import * as CourseAppearance from "./course-appearance";
import * as PrintArea from "./print-area";

export const ALL_CONTROLS_ID = "all-controls";

export function create(name) {
  const event = {
    name: name,
    courses: [],
    controlCodeGenerator: sequence(30),
    idGenerator: sequence(1),
    map: { scale: 15000 },
    controls: {},
    specialObjects: [],
    courseAppearance: CourseAppearance.create(),
    printArea: PrintArea.create(),
    allControls: { printScale: 15000 },
  };
  event.courses.push(
    Course.create(ALL_CONTROLS_ID, "All Controls", [], 15000, "all-controls", {
      labelKind: "code",
    })
  );
  return event;
}

export function load(data) {
  const maxId = toFinite(
    Math.max(
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

  return {
    ...data,
    idGenerator: sequence(maxId + 1),
    controlCodeGenerator: sequence(maxControlCode + 1),
  };
}

export function setMap(event, mapFile, mapFilename) {
  const mapScale = mapFile.getCrs().scale;
  event.mapScale = mapScale;
  event.mapFilename = mapFilename;
  event.courses
    .filter((course) => course.controls.length === 0)
    .forEach((course) => (course.printScale = mapScale));
  event.allControls.printScale = mapScale;
}

export function addCourse(event, course) {
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

export function addControl(event, control) {
  const id = (control.id = event.idGenerator.next());
  const { kind } = control;
  if (kind !== "start" && kind !== "finish") {
    control.code = event.controlCodeGenerator.next();
  }
  event.controls[id] = control;
  updateAllControls(event);
  return control;
}

export function updateControl(event, controlId, updateFn) {
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

export function updateAllControls(event) {
  const allControls = event.courses.find(
    (course) => course.id === ALL_CONTROLS_ID
  );
  allControls.controls = Object.values(event.controls)
    .filter((control) => control.kind === "normal")
    .map((control) => cloneDeep(control));
  allControls.printScale = event.allControls.printScale;
  allControls.printArea = event.printArea && cloneDeep(event.printArea);
}

const sequence = (start) =>
  (() => {
    let s = start - 1;
    return {
      next: () => ++s,
      current: () => s,
    };
  })();

function toFinite(x, fallback) {
  return !isNaN(x) && Math.abs(x) !== Infinity ? x : fallback;
}
