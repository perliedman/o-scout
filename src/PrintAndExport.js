import useEvent, { useMap } from "./store";
import Button from "./ui/Button";
import shallow from "zustand/shallow";
import { useMemo } from "react";
import { courseBounds, courseToSvg } from "./models/course";

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
    const paperExtent = courseBounds(selectedCourse);
    const buffer = 10;
    const projectedExtent = [
      [paperExtent[0] - buffer, paperExtent[1] - buffer],
      [paperExtent[2] + buffer, paperExtent[3] + buffer],
    ]
      // Convert from PPEN mm to OCAD coordinates, 1/100 mm
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
