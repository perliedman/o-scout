import { controlDistance } from "./control";

export const courseOverPrintRgb = "rgba(182, 44, 152, 0.8)";

export function createCourse(id, name, controls = [], printScale, type) {
  return {
    id: id,
    name: name,
    controls: controls,
    printScale: printScale,
    type: type,
    specialObjects: [],
    labelKind: "sequence",
  };
}

export function courseDistance(course, scale) {
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

export function courseBounds(course) {
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

export function getStartRotation({ controls }) {
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
