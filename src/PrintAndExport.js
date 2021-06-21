import useEvent, { useMap } from "./store";
import Button from "./ui/Button";
import shallow from "zustand/shallow";
import { useMemo } from "react";
import { courseBounds } from "./models/course";
import { courseToSvg } from "./services/create-svg";
import * as olExtent from "ol/extent";

export default function PrintAndExport() {
  const { courses, selectedCourseId } = useEvent(getCourses, shallow);
  const { mapFile, tiler } = useMap(getMap);
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId),
    [courses, selectedCourseId]
  );

  return (
    <Button onClick={onPrint} disabled={!selectedCourse}>
      Print
    </Button>
  );

  function onPrint() {
    const crs = mapFile.getCrs();
    const paperExtent =
      selectedCourse.printArea?.extent ||
      olExtent.buffer(courseBounds(selectedCourse), 10);
    // Convert from PPEN mm to OCAD coordinates, 1/100 mm
    const projectedExtent = [
      [paperExtent[0], paperExtent[1]],
      [paperExtent[2], paperExtent[3]],
    ]
      .map(([x, y]) => crs.toProjectedCoord([x * 100, y * 100]))
      .flat();
    const width = projectedExtent[2] - projectedExtent[0];
    const height = projectedExtent[3] - projectedExtent[1];
    const mapSvg = tiler.renderSvg(projectedExtent, 1);
    mapSvg.setAttribute("width", width);
    mapSvg.setAttribute("height", height);
    mapSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    const courseGroup = courseToSvg(selectedCourse, window.document);

    const mapGroup = mapSvg.querySelector("g");
    mapGroup.appendChild(courseGroup);

    const blob = new Blob([mapSvg.outerHTML], { type: "image/svg" });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    a.href = url;
    a.click();
    URL.revokeObjectURL(url);
  }
}

function getCourses({ courses, selectedCourseId }) {
  return {
    courses,
    selectedCourseId,
  };
}

function getMap({ mapFile, tiler }) {
  return { mapFile, tiler };
}
