import * as olExtent from "ol/extent";
import { courseBounds } from "../models/course";
import { courseToSvg } from "./create-svg";

export function printCourse(course, mapFile, tiler, svgOptions) {
  const crs = mapFile.getCrs();
  const paperExtent =
    course.printArea?.extent || olExtent.buffer(courseBounds(course), 10);
  // Convert from PPEN mm to OCAD coordinates, 1/100 mm
  const projectedExtent = [
    [paperExtent[0], paperExtent[1]],
    [paperExtent[2], paperExtent[3]],
  ]
    .map(([x, y]) => crs.toProjectedCoord([x * 100, y * 100]))
    .flat();
  const width = projectedExtent[2] - projectedExtent[0];
  const height = projectedExtent[3] - projectedExtent[1];
  const mapSvg = tiler.renderSvg(projectedExtent, 1, svgOptions);
  mapSvg.setAttribute("width", width);
  mapSvg.setAttribute("height", height);
  mapSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const courseGroup = courseToSvg(course, window.document);

  const mapGroup = mapSvg.querySelector("g");
  mapGroup.appendChild(courseGroup);

  return mapSvg;
}
