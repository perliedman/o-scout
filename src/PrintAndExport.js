import useEvent, { useMap } from "./store";
import Button from "./ui/Button";
import Toggle from "./ui/Toggle";
import shallow from "zustand/shallow";
import { useMemo, useState } from "react";
import { printCourse } from "./services/print";
import downloadBlob, { download } from "./services/download-blob";
import Spinner from "./ui/Spinner";
import { svgToBitmap } from "./services/svg-to-bitmap";

export default function PrintAndExport() {
  const [state, setState] = useState("idle");
  const { eventName, courses, selectedCourseId } = useEvent(
    getCourses,
    shallow
  );
  const { mapFile, tiler } = useMap(getMap);
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId]
  );
  const [format, setFormat] = useState("svg");
  const [selection, setSelection] = useState(
    courses?.length > 0
      ? "allCourses"
      : selectedCourse
      ? "selectedCourse"
      : "map"
  );
  const [showOptions, setShowOptions] = useState(false);

  return (
    <>
      <div className="my-4 flex justify-between">
        <div>Options</div>
        <Toggle
          type="small"
          open={showOptions}
          onClick={() => setShowOptions(!showOptions)}
        />
      </div>
      {showOptions && (
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
                onChange={() => setSelection(option)}
              />
              {selectionOptions[option]}
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
      )}

      <div className="flex justify-end mt-4">
        <Button onClick={onPrint}>
          {state === "printing" && <Spinner className="text-indigo-600" />}
          {`Print ${selectionOptions[selection]} to ${formatOptions[format].name}`}
        </Button>
      </div>
    </>
  );

  function onPrint() {
    setState("printing");

    const printCourses =
      selection === "allCourses"
        ? courses
        : selection === "currentCourse"
        ? [selectedCourse]
        : [];
    const postProcess =
      format === "pdf"
        ? (svg) => null //svgToPdf(svg, mapFile)
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
        const mapSvg = printCourse(course, mapFile, tiler, {
          fill: format !== "pdf" ? "white" : undefined,
        });
        const output = await postProcess(mapSvg);
        if (output instanceof Blob) {
          downloadBlob(output, `${eventName} - ${course.name}.${format}`);
        } else {
          download(output, `${eventName} - ${course.name}.${format}`);
        }

        setTimeout(printNext, 250);
      } catch (e) {
        console.error(e);
        setState("error");
      }
    }
  }
}

const selectionOptions = {
  allCourses: "All Courses",
  currentCourse: "Current Course",
  map: "Map",
};

const formatOptions = {
  svg: { name: "SVG", mime: "image/svg+xml" },
  png: { name: "PNG", mime: "image/png" },
};

function getCourses({ name, courses, selectedCourseId }) {
  return {
    eventName: name,
    courses,
    selectedCourseId,
  };
}

function getMap({ mapFile, tiler }) {
  return { mapFile, tiler };
}
