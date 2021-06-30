import { createControl } from "./control";

export function createEvent(name, courses) {
  return {
    name: name,
    courses: courses || [],
    controlCodeGenerator: sequence(30),
    idGenerator: sequence(1),
    map: { scale: 15000 },
    controls: {},
    controlList: [],
    specialObjects: [],
    courseAppearance: {},
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
  event.controls[id] = createControl(
    id,
    kind,
    kind !== "start" && kind !== "finish"
      ? event.controlCodeGenerator.next()
      : null,
    coordinates,
    description
  );
  event.controlList.push(event.controls[id]);
}

const sequence = (start) =>
  (() => {
    let s = start - 1;
    return {
      next: () => ++s,
      current: () => s,
    };
  })();
