import useEvent, { useMap, useNotifications } from "./store";
import Button from "./ui/Button";
import shallow from "zustand/shallow";
import { useEffect, useMemo, useState } from "react";
import { printCourse, renderPdf } from "./services/print";
import downloadBlob, { download } from "./services/download-blob";
import Spinner from "./ui/Spinner";
import { svgToBitmap } from "./services/svg-to-bitmap";
import * as Course from "./models/course";
import { transformExtent } from "./services/coordinates";
import Section from "./ui/Section";

export default function PrintAndExport() {
  const [state, setState] = useState("idle");
  const pushNotification = useNotifications(getPush);
  const { eventName, courseAppearance, courses, selectedCourseId } = useEvent(
    getCourses,
    shallow
  );
  const { mapFile, tiler } = useMap(getMap);
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId]
  );
  const [format, setFormat] = useState("pdf");
  const [selection, setSelection] = useState(
    courses?.length > 0
      ? "allCourses"
      : selectedCourse
      ? "selectedCourse"
      : "map"
  );

  useEffect(() => {
    if (!selectionOptions[selection].enabled(courses)) {
      const nextSelection = Object.keys(selectionOptions).find((option) =>
        selectionOptions[option].enabled(courses)
      );
      setSelection(nextSelection);
    }
  }, [courses, selection]);

  return (
    <>
      <Section title="Options" headingComponent="h3" headingTextStyle="">
        <div className="flex flex-col ml-4 text-sm">
          <div>Print selection</div>
          {Object.keys(selectionOptions).map((option) => (
            <label key={option}>
              <input
                className="mr-2"
                type="radio"
                name="selection"
                value={option}
                checked={option === selection}
                disabled={!selectionOptions[option].enabled(courses)}
                onChange={() => setSelection(option)}
              />
              {selectionOptions[option].name}
            </label>
          ))}
          <div className="mt-2">Print format</div>
          {Object.keys(formatOptions).map((option) => (
            <label key={option}>
              <input
                className="mr-2"
                type="radio"
                name="format"
                value={option}
                checked={option === format}
                onChange={() => setFormat(option)}
              />
              {formatOptions[option].name}
            </label>
          ))}
        </div>
      </Section>
      <div className="flex justify-end mt-4">
        <Button onClick={onPrint}>
          {state === "printing" && <Spinner className="text-indigo-600" />}
          {`Print ${selectionOptions[selection].name} to ${formatOptions[format].name}`}
        </Button>
      </div>
    </>
  );

  function onPrint() {
    setState("printing");

    const printCourses =
      selection === "allCourses"
        ? [...courses]
        : selection === "currentCourse"
        ? [selectedCourse]
        : [emptyCourse()];
    const postProcess =
      format === "pdf"
        ? (svg) =>
            renderPdf(
              mapFile,
              selectedCourse?.printArea || defaultPrintArea,
              svg
            )
        : format === "svg"
        ? (svg) =>
            Promise.resolve(
              new Blob([svg.outerHTML], { type: "application/svg+xml" })
            )
        : format === "png"
        ? (svg) => svgToBitmap(svg)
        : null;

    printNext();

    async function printNext() {
      if (printCourses.length === 0) {
        setState("idle");
        return;
      }

      try {
        const course = printCourses.pop();
        const mapSvg = await printCourse(
          course,
          courseAppearance,
          eventName,
          mapFile,
          tiler,
          {
            fill: format !== "pdf" ? "white" : undefined,
          }
        );
        const output = await postProcess(mapSvg);
        if (output instanceof Blob) {
          downloadBlob(output, `${eventName} - ${course.name}.${format}`);
        } else {
          download(output, `${eventName} - ${course.name}.${format}`);
        }

        setTimeout(printNext, 250);
      } catch (e) {
        console.error(e);
        pushNotification({ type: "danger", message: "Failed to print." });
        setState("error");
      }
    }
  }

  function emptyCourse() {
    const crs = mapFile.getCrs();
    const course = Course.create(0, "", [], crs.scale, "");
    course.printArea = {
      extent: transformExtent(tiler.bounds, (c) => {
        const [x, y] = crs.toMapCoord(c);
        return [x / 100, y / 100];
      }),
    };
    return course;
  }
}

const selectionOptions = {
  allCourses: { name: "All Courses", enabled: (courses) => courses.length > 1 },
  currentCourse: {
    name: "Current Course",
    enabled: (courses) => courses.length > 0,
  },
  map: { name: "Map", enabled: () => true },
};

const formatOptions = {
  pdf: { name: "PDF", mime: "application/pdf" },
  svg: { name: "SVG", mime: "image/svg+xml" },
  png: { name: "PNG", mime: "image/png" },
};

const defaultPrintArea = {
  margins: 0,
  pageLandscape: false,
  pageWidth: 827,
  pageHeight: 1169,
};

function getCourses({ name, courses, courseAppearance, selectedCourseId }) {
  return {
    eventName: name,
    courses,
    courseAppearance,
    selectedCourseId,
  };
}

function getMap({ mapFile, tiler }) {
  return { mapFile, tiler };
}

function getPush({ push }) {
  return push;
}
