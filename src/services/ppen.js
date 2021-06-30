import flatten from "arr-flatten";
import { addCourse, createEvent } from "../models/event";
import { createControl } from "../models/control";
import { createCourse } from "../models/course";

export function parsePPen(doc) {
  const eventTag = doc.getElementsByTagName("event")[0];
  const mapTag = eventTag.getElementsByTagName("map")[0];
  const scale = Number(mapTag.getAttribute("scale"));
  const mapAbsPath = mapTag.getAttribute("absolute-path");
  const warnings = [];

  const controls = Array.from(doc.getElementsByTagName("control")).map(
    parseControl
  );

  const courseControls = Array.from(
    doc.getElementsByTagName("course-control")
  ).reduce((a, cc) => {
    const id = Number(cc.getAttribute("id"));
    const control = Number(cc.getAttribute("control"));
    const nextTag = cc.getElementsByTagName("next");
    let next = undefined;
    if (nextTag && nextTag[0]) {
      next = nextTag[0].getAttribute("course-control");
    }

    a[id] = {
      control,
      next,
    };

    return a;
  }, {});

  const getCourseControls = (id, sequence) => {
    const control = controls.find((c) => c.id === courseControls[id].control);
    const next = courseControls[id].next;

    return [control].concat(next ? getCourseControls(next, sequence + 1) : []);
  };

  const event = createEvent(
    eventTag.getElementsByTagName("title")[0].textContent,
    []
  );
  event.map = {
    name: mapAbsPath.substring(
      Math.max(mapAbsPath.lastIndexOf("/"), mapAbsPath.lastIndexOf("\\") + 1)
    ),
    scale,
  };
  event.courseAppearance = parseCourseAppearance(
    eventTag.getElementsByTagName("course-appearance")[0]
  );

  const courses = Array.from(doc.getElementsByTagName("course"))
    .filter((c) => c.getElementsByTagName("first").length > 0)
    .map((c) => {
      const courseControls = getCourseControls(
        c.getElementsByTagName("first")[0].getAttribute("course-control"),
        0
      );
      const optionsTag = c.getElementsByTagName("options")[0];
      const printScale =
        (optionsTag && Number(optionsTag.getAttribute("print-scale"))) || scale;
      const course = createCourse(
        c.getAttribute("id"),
        c.getElementsByTagName("name")[0].textContent,
        courseControls,
        printScale,
        c.getAttribute("kind")
      );
      course.order = Number(c.getAttribute("order"));
      course.printArea = parsePrintArea(
        c.getElementsByTagName("print-area")?.[0]
      );

      return course;
    })
    .sort((a, b) => a.order - b.order);

  courses.forEach((c) => addCourse(event, c));

  parseSpecialObjects(event, doc.getElementsByTagName("special-object"));

  return { ...event, warnings };

  function parseLocation(loc) {
    return [Number(loc.getAttribute("x")), Number(loc.getAttribute("y"))];
  }

  function parseControl(tag) {
    const codeTag = tag.getElementsByTagName("code")[0];
    const id = tag.getAttribute("id");
    return createControl(
      Number(id),
      tag.getAttribute("kind"),
      codeTag ? codeTag.textContent : undefined,
      parseLocation(tag.getElementsByTagName("location")[0]),
      Array.from(tag.getElementsByTagName("description")).reduce((a, dtag) => {
        a[dtag.getAttribute("box")] = dtag.getAttribute("iof-2004-ref");
        return a;
      }, {})
    );
  }

  function parseSpecialObjects(event, specialObjectsTags) {
    for (const specialObjectTag of Array.from(specialObjectsTags)) {
      const id = specialObjectTag.getAttribute("id");
      const kind = specialObjectTag.getAttribute("kind");
      const coursesTag = specialObjectTag.getElementsByTagName("courses")[0];
      const isAllCourses = coursesTag.getAttribute("all") === "true";
      const courseIds = isAllCourses
        ? event.courses.map(({ id }) => id)
        : Array.from(coursesTag.getElementsByTagName("course")).map(
            (courseTag) => courseTag.getAttribute("course")
          );
      const locations = Array.from(
        specialObjectTag.getElementsByTagName("location")
      ).map((locationTag) =>
        ["x", "y"].map((attribute) =>
          Number(locationTag.getAttribute(attribute))
        )
      );

      const specialObject = {
        id,
        kind,
        isAllCourses,
        locations,
      };

      courseIds.forEach((courseId) => {
        const course = event.courses.find((c) => c.id === courseId);
        if (course) {
          course.specialObjects.push(specialObject);
        } else {
          warnings.push(
            `No course with id ${courseId} found for special object ${id}.`
          );
        }
      });
      event.specialObjects.push(specialObject);
    }
  }

  function parsePrintArea(printAreaTag) {
    if (!printAreaTag) return { auto: true, restrictToPage: true };
    return {
      auto: printAreaTag.getAttribute("automatic") === "true",
      restrictToPage:
        printAreaTag.getAttribute("restrict-to-page-size") === "true",
      extent: ["left", "bottom", "right", "top"].map((attr) =>
        Number(printAreaTag.getAttribute(attr))
      ),
      pageWidth: Number(printAreaTag.getAttribute("page-width")),
      pageHeight: Number(printAreaTag.getAttribute("page-height")),
      pageMargins: Number(printAreaTag.getAttribute("page-margins")),
      pageLandscape: printAreaTag.getAttribute("page-landscape") === "true",
    };
  }

  function parseCourseAppearance(courseAppearanceTag) {
    if (!courseAppearanceTag)
      return {
        scaleSizes: "RelativeToMap",
        scaleSizesCircleGaps: true,
        autoLegGapSize: 0,
        blendPurple: true,
      };
    return {
      scaleSizes:
        courseAppearanceTag.getAttribute("scale-sizes") || "RelativeToMap",
      scaleSizesCircleGaps:
        courseAppearanceTag.getAttribute("scale-sizes-circle-gaps") === "true",
      autoLegGapSize:
        Number(courseAppearanceTag.getAttribute("auto-leg-gap-size")) || 0,
      blendPurple: courseAppearanceTag.getAttribute("blend-purple") === "true",
    };
  }
}

const createXml = (document, n) => {
  const node = document.createElement(n.type);
  n.id && (node.id = n.id);
  n.attrs &&
    Object.keys(n.attrs).forEach((attrName) =>
      node.setAttribute(attrName, n.attrs[attrName])
    );
  n.text && node.appendChild(document.createTextNode(n.text));
  n.children &&
    n.children.forEach((child) => node.appendChild(createXml(document, child)));

  return node;
};

const courses = (courses) => {
  let id = 1;

  return flatten(
    courses.map((course, i) => {
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
          ].concat(
            course.controls.length > 0
              ? [{ type: "first", attrs: { "course-control": ids[0] } }]
              : []
          ),
        },
      ].concat(
        course.controls.map((control, i, cs) => ({
          type: "course-control",
          id: ids[i],
          attrs: { control: control.id },
          children:
            i < cs.length - 1
              ? [{ type: "next", attrs: { "course-control": ids[i + 1] } }]
              : [],
        }))
      );
    })
  );
};

export function writePpen(event) {
  const doc = document.implementation.createDocument("", "", null);
  const root = createXml(doc, {
    type: "course-scribe-event",
    children: [
      {
        type: "event",
        id: 1,
        children: [
          { type: "title", text: event.name },
          {
            type: "map",
            attrs: {
              type: "OCAD",
              scale: event.map.scale,
              "ignore-missing-fonts": false,
              "absolute-path": event.map.name,
              text: event.map.name,
            },
          },
        ],
      },
    ]
      .concat(
        event.controlList.map((c) => ({
          type: "control",
          id: c.id,
          attrs: {
            kind: c.kind,
          },
          children: [
            {
              type: "location",
              attrs: { x: c.coordinates[0], y: c.coordinates[1] },
            },
          ]
            .concat(c.code ? [{ type: "code", text: c.code.toString() }] : [])
            .concat(
              Object.keys(c.description)
                .filter((box) => c.description[box])
                .map((box) => ({
                  type: "description",
                  attrs: { box, "iof-2004-ref": c.description[box] },
                }))
            ),
        }))
      )
      .concat(courses(event.courses)),
  });

  doc.appendChild(root);
  return doc;
}
