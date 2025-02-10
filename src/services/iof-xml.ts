import { Coordinate } from "ol/coordinate";
import { courseDistance } from "../models/course";
import { ALL_CONTROLS_ID, Event } from "../models/event";
import { OcadCrs } from "../store";
import { createXml } from "./xml-utils";

export function writeIofXml(
  event: Event,
  crs: OcadCrs,
  projectedToLngLat: ((c: Coordinate) => Coordinate) | undefined
): XMLDocument {
  const doc = document.implementation.createDocument("", "", null);
  const root = createXml(doc, {
    type: "CourseData",
    attrs: {
      xmlns: "http://www.orienteering.org/datastandard/3.0",
      "xmlns:xsi": "http://www.w3.org/2001/XMLSchema-instance",
      iofVersion: "3.0",
      createTime: new Date().toISOString(),
      creator: "O-Scout",
    },
    children: [
      {
        type: "Event",
        children: [{ type: "Name", text: event.name }],
      },
      {
        type: "RaceCourseData",
        children: [...controls(), ...courses()],
      },
    ],
  });

  doc.appendChild(root);

  return doc;

  function controls() {
    return Object.keys(event.controls).map((controlId) => {
      const control = event.controls[controlId];
      const [lng, lat] = projectedToLngLat
        ? projectedToLngLat(
            crs.toProjectedCoord(control.coordinates.map((c) => c * 100))
          )
        : [undefined, undefined];
      return {
        type: "Control", attrs: {type: controlKindToIofType(control.kind)},
        children: [
          { type: "Id", text: control.code || `_${control.id}` },
          ...(lng != null
            ? [
                {
                  type: "Position",
                  attrs: {
                    lng,
                    lat,
                  },
                },
              ]
            : []),
          {
            type: "MapPosition",
            attrs: {
              unit: "mm",
              x: control.coordinates[0],
              y: control.coordinates[1],
            },
          },
        ],
      };
    });
  }

  function courses() {
    return event.courses
      .filter((course) => course.id !== ALL_CONTROLS_ID)
      .map((course) => ({
        type: "Course",
        children: [
          { type: "Name", text: course.name },
          {
            type: "Length",
            text: (courseDistance(course, crs.scale) * 1000).toFixed(0),
          },
          ...course.controls.map((control, i) => ({
            type: "CourseControl",
            attrs: {
              type: controlKindToIofType(control.kind),
            },
            children: [
              { type: "Control", text: control.code || `_${control.id}` },
              {
                type: "MapText",
                text: course.labelKind === "sequence" ? i : control.code,
              },
            ],
          })),
        ],
      }));
  }
}

function controlKindToIofType(kind: string): "Start" | "Finish" | "Control" {
  switch (kind) {
    case "start":
      return "Start";
    case "finish":
      return "Finish";
    case "normal":
      return "Control";
    default:
      throw new Error(`Unhandled control kind ${kind}.`);
  }
}
