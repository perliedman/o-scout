import { getPrintAreaExtent } from "../models/course";
import { courseToSvg } from "./create-svg";
import PDFDocument from "@react-pdf/pdfkit";
import blobStream from "blob-stream";
import SVGtoPDF from "svg-to-pdfkit";
import { mmToMeter, toProjectedCoord, transformExtent } from "./coordinates";
import { getSvgDimensions } from "./svg-utils";

const mmToPt = 2.83465;
const inToPt = 72;
/**
 * Factor to convert paper size units (1/100 inch) to millimeters
 */
export const paperSizeToMm = inToPt / 100 / mmToPt;

/*
  Printing a map correctly is a complex task, since it involves data in
  a lot of different coordinate systems:

  * The source map's (OCAD) coordinates are in 1/100 mm units of paper,
    at the source map's scale (often 1:15000, but far from always)
  * The course setting objects (controls, special objects etc.) are in
    mm of paper at the source map's scale
  * The source map rendered to SVG (by ocad-tiler), where the source map's
    coordinates are transformed (using an SVG transform) to real-world-meters,
    that is, they are geographic distances in the world the map depicts,
    no longer paper coordinates. The origin is the geographic coordinate
    corresponding to the print area's top left corner. (As a side note,
    this is not very useful for O-Scout's purpose, but it is how ocad-tiler
    works for other reasons.) Also, SVG coordinates have the y-axis flipped
    compared to OCAD and course setting coordinates (paper coordinates use
    y-grows-up, SVG uses y-grows-down)
  * So, the coordinates inside the SVG are in real-world meters,
    y-grows-down; we set the SVGs viewbox to the real world meters
    area that correspond to the print area
  * To make the print output the correct size, we set the SVG's
    width and height attributes. These attributes are calculated by 
    determining the size of the print area (which is in the source map's
    scale) in the print scale, measured as points (pt); this will ensure
    the SVG is printed with the correct size when we convert it to PDF,
    where all units are points (pt).

  *Note*: Unless you are _really sure_, don't use ocad2geojson's
  coordinate conversion methods (crs.toProjectedCoord/crs.toMapCoord),
  since they take map's grivation into account; for map output, that is
  almost certainly not what you want (since it rotates the map, including
  texts). Instead, use toProjectedCoord/fromProjectedCoord in O-Scout's
  "coordinates" module.
*/

export async function printCourse(
  course,
  courseAppearance,
  eventName,
  mapFile,
  tiler,
  svgOptions
) {
  const crs = mapFile.getCrs();
  const printAreaExtent = getPrintAreaExtent(course, crs.scale);
  // Convert from PPEN mm to OCAD coordinates, 1/100 mm
  const projectedExtent = transformExtent(printAreaExtent, ([x, y]) =>
    toProjectedCoord(crs, [x, y])
  );
  // Print area in millimeters in map's original scale
  const printAreaWidthMm = printAreaExtent[2] - printAreaExtent[0];
  const printAreaHeightMm = printAreaExtent[3] - printAreaExtent[1];
  // The scale factor between map's original scale and the requested print scale
  const scaleFactor = crs.scale / course.printScale;
  // Output dimensions in pt on the actually printed paper (in print scale)
  const outputWidthPt = printAreaWidthMm * scaleFactor * mmToPt;
  const outputHeightPt = printAreaHeightMm * scaleFactor * mmToPt;
  const mapSvg = tiler.renderSvg(projectedExtent, 1, svgOptions);
  mapSvg.setAttribute("width", outputWidthPt);
  mapSvg.setAttribute("height", outputHeightPt);
  mapSvg.setAttribute(
    "viewBox",
    `0 0 ${printAreaWidthMm * (crs.scale * mmToMeter)} ${
      printAreaHeightMm * (crs.scale * mmToMeter)
    }`
  );
  const courseGroup = await courseToSvg(
    course,
    courseAppearance,
    eventName,
    crs.scale,
    window.document
  );
  const transform = `scale(${
    mmToMeter * crs.scale
  }) translate(${-printAreaExtent[0]}, ${printAreaExtent[3]})`;
  courseGroup.setAttributeNS("", "transform", transform);
  mapSvg.appendChild(courseGroup);

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

export const PAPER_SIZES = [
  { name: "A2", dimensions: [1654, 2339] },
  { name: "A3", dimensions: [1169, 1654] },
  { name: "A4", dimensions: [827, 1169] },
  { name: "A5", dimensions: [583, 827] },
  { name: "A6", dimensions: [413, 583] },
  { name: "Letter", dimensions: [850, 1100] },
  { name: "Legal", dimensions: [850, 1400] },
  { name: "Tabloid", dimensions: [1100, 1700] },
];
