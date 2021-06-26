import * as olExtent from "ol/extent";
import { courseBounds } from "../models/course";
import { courseToSvg, getSvgDimensions } from "./create-svg";
import PDFDocument from "@react-pdf/pdfkit";
import blobStream from "blob-stream";
import SVGtoPDF from "svg-to-pdfkit";

const mmToPt = 2.83465;
const inToPt = 72;

export function printCourse(
  course,
  courseAppearance,
  mapFile,
  tiler,
  svgOptions
) {
  const crs = mapFile.getCrs();
  const printAreaExtent =
    course.printArea?.extent || olExtent.buffer(courseBounds(course), 10);
  // Convert from PPEN mm to OCAD coordinates, 1/100 mm
  const projectedExtent = [
    [printAreaExtent[0], printAreaExtent[1]],
    [printAreaExtent[2], printAreaExtent[3]],
  ]
    .map(([x, y]) => crs.toProjectedCoord([x * 100, y * 100]))
    .flat();
  const scaleFactor = crs.scale / course.printScale;
  const printAreaWidthMm = printAreaExtent[2] - printAreaExtent[0];
  const printAreaHeightMm = printAreaExtent[3] - printAreaExtent[1];
  const outputWidthPt = printAreaWidthMm * scaleFactor * mmToPt;
  const outputHeightPt = printAreaHeightMm * scaleFactor * mmToPt;
  const mapSvg = tiler.renderSvg(projectedExtent, 1, svgOptions);
  mapSvg.setAttribute("width", outputWidthPt);
  mapSvg.setAttribute("height", outputHeightPt);
  mapSvg.setAttribute(
    "viewBox",
    `0 0 ${printAreaWidthMm * (crs.scale / 1000)} ${
      printAreaHeightMm * (crs.scale / 1000)
    }`
  );
  const courseGroup = courseToSvg(course, courseAppearance, window.document);

  const mapGroup = mapSvg.querySelector("g");
  mapGroup.appendChild(courseGroup);

  return mapSvg;
}

export function renderPdf(
  mapFile,
  { pageLandscape, pageWidth, pageHeight, pageMargins },
  svg
) {
  return new Promise((resolve, reject) => {
    const pageSize = [(pageWidth / 100) * inToPt, (pageHeight / 100) * inToPt];
    const doc = new PDFDocument({
      size: pageSize,
      margin: (pageMargins / 100) * inToPt,
      layout: pageLandscape ? "landscape" : "portrait",
    });
    const stream = doc.pipe(blobStream());
    const [widthPt, heightPt] = getSvgDimensions(svg);

    SVGtoPDF(
      doc,
      svg,
      pageSize[0] / 2 - widthPt / 2,
      pageSize[1] / 2 - heightPt / 2,
      {
        width: widthPt,
        height: heightPt,
        assumePt: true,
        colorCallback: (x) => {
          const color =
            x &&
            mapFile.colors.find(
              (c) =>
                c &&
                c.rgbArray[0] === x[0][0] &&
                c.rgbArray[1] === x[0][1] &&
                c.rgbArray[2] === x[0][2]
            );
          return color?.cmyk ? [color.cmyk, x[1]] : x;
        },
      }
    );

    doc.end();
    stream.on("finish", () => {
      const blob = stream.toBlob("application/pdf");
      resolve(blob);
    });
    stream.on("error", (err) => {
      reject(err);
    });
  });
}
