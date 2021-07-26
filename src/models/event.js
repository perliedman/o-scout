import * as Control from "./control";
import * as CourseAppearance from "./course-appearance";

export function create(name, courses) {
  return {
    name: name,
    courses: courses || [],
    controlCodeGenerator: sequence(30),
    idGenerator: sequence(1),
    map: { scale: 15000 },
    controls: {},
    specialObjects: [],
    courseAppearance: CourseAppearance.create(),
    selectedCourseId: courses?.[0]?.id,
  };
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
    ({ id }) => id === "all-controls"
  );
  event.courses.splice(
    allControlsIndex >= 0 ? allControlsIndex : event.courses.length,
    0,
    course
  );
}

export function addControl(event, control) {
  const id = (control.id = event.idGenerator.next());
  const { kind } = control;
  if (kind !== "start" && kind !== "finish") {
    control.code = event.controlCodeGenerator.next();
  }
  event.controls[id] = control;
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
}

const sequence = (start) =>
  (() => {
    let s = start - 1;
    return {
      next: () => ++s,
      current: () => s,
    };
  })();
