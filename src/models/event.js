import { createControl } from "./control";
import * as CourseAppearance from "./course-appearance";

export function create(name, courses) {
  return {
    name: name,
    courses: courses || [],
    controlCodeGenerator: sequence(30),
    idGenerator: sequence(1),
    map: { scale: 15000 },
    controls: {},
    controlList: [],
    specialObjects: [],
    courseAppearance: CourseAppearance.create(),
    selectedCourseId: courses?.[0]?.id,
  };
}

export function addCourse(event, course) {
  course.controls.forEach((c) => {
    if (!event.controls[c.id]) {
      event.controls[c.id] = c;
      event.controlList.push(c);
    }
  });
  event.courses.push(course);
}

export function addControl(event, { kind, coordinates, description }) {
  const id = event.idGenerator.next();
  const control = (event.controls[id] = createControl(
    id,
    kind,
    kind !== "start" && kind !== "finish"
      ? event.controlCodeGenerator.next()
      : null,
    coordinates,
    description
  ));
  event.controlList.push(control);
  return control;
}

const sequence = (start) =>
  (() => {
    let s = start - 1;
    return {
      next: () => ++s,
      current: () => s,
    };
  })();
