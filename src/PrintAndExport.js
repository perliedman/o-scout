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
import { writeIofXml } from "./services/iof-xml";
import proj4 from "proj4";

export default function PrintAndExport() {
  const [state, setState] = useState("idle");
  const pushNotification = useNotifications(getPush);
  const event = useEvent();
  const {
    name: eventName,
    courseAppearance,
    courses,
    selectedCourseId,
  } = event;
  const { mapFile, tiler } = useMap(getMap, shallow);
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
    if (!selectionOptions[selection].enabled(format, courses)) {
      const nextSelection = Object.keys(selectionOptions).find((option) =>
        selectionOptions[option].enabled(format, courses)
      );
      setSelection(nextSelection);
    }
  }, [courses, selection, format]);

  return (
    <div className="mx-4 pb-4">
      <div className="flex flex-col my-4 text-sm">
        <div>Selection</div>
        {Object.keys(selectionOptions).map((option) => (
          <label key={option}>
            <input
              className="mr-2"
              type="radio"
              name="selection"
              value={option}
              checked={option === selection}
              disabled={!selectionOptions[option].enabled(format, courses)}
              onChange={() => setSelection(option)}
            />
            {selectionOptions[option].name}
          </label>
        ))}
        <div className="mt-2">Format</div>
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
      <div className="flex justify-end mt-4">
        <Button onClick={onPrint}>
          {state === "printing" && <Spinner className="text-indigo-600" />}
          {`${format !== "iofXml" ? "Print" : "Export"} ${
            selectionOptions[selection].name
          } to ${formatOptions[format].name}`}
        </Button>
      </div>
    </div>
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
        ? (svg) => svgToBitmap(svg, [], new XMLSerializer())
        : null;

    if (format !== "iofXml") {
      printNext();
    } else {
      try {
        const crs = mapFile.getCrs();
        let projectedToLngLat;
        if (crs.catalog === "EPSG") {
          projectedToLngLat = proj4(`EPSG:${crs.code}`, "EPSG:4326").forward;
        }
        const doc = writeIofXml(event, crs, projectedToLngLat);
        const output = new Blob([new XMLSerializer().serializeToString(doc)], {
          mime: "application/xml",
        });
        downloadBlob(output, `${eventName}.xml`);
        setState("idle");
      } catch (e) {
        console.error(e);
        pushNotification("warning", "Failed to export.", e.toString());
        setState("error");
      }
      return;
    }

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
        pushNotification("warning", "Failed to print.", e.toString());
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
  allCourses: {
    name: "All Courses",
    enabled: (format, courses) => courses.length > 1,
  },
  currentCourse: {
    name: "Current Course",
    enabled: (format, courses) => format !== "iofXml" && courses.length > 0,
  },
  map: { name: "Map", enabled: (format) => format !== "iofXml" },
};

const formatOptions = {
  pdf: { name: "PDF", mime: "application/pdf" },
  svg: { name: "SVG", mime: "image/svg+xml" },
  png: { name: "PNG", mime: "image/png" },
  iofXml: { name: "IOF 3.0 XML", mime: "application/xml" },
};

const defaultPrintArea = {
  margins: 0,
  pageLandscape: false,
  pageWidth: 827,
  pageHeight: 1169,
};

function getMap({ mapFile, tiler }) {
  return { mapFile, tiler };
}

function getPush({ push }) {
  return push;
}
