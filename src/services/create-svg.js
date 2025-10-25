import {
  courseDistance,
  courseOverPrintRgb,
  getStartRotation,
  palette,
} from "../models/course";
import { createControls } from "./use-controls";
import {
  controlCircleOutsideDiameter,
  courseObjectsGeoJSON,
  createNumberPositions,
  overprintLineWidth,
} from "./use-number-positions";
import { createControlConnections } from "./user-control-connections";
import { controlDistance } from "../models/control";
import { createSpecialObjects } from "./use-special-objects";
import { add, mul, rotate } from "../models/coordinate";
import fetchSymbolSvg from "./fetch-symbol-svg";
import { createSvgNode, getSvgDimensions } from "./svg-utils";
import { getObjectScale } from "./coordinates";

export const circle = ([cx, cy], r, stroke, scale) => ({
  type: "circle",
  attrs: {
    cx,
    cy,
    r: r * (scale || 1),
    stroke,
    "stroke-width": overprintLineWidth * (scale || 1),
  },
});

export const lines = (
  coordinates,
  close,
  stroke,
  fill,
  scale = 1,
  width = overprintLineWidth
) => ({
  type: "path",
  attrs: {
    d: coordinates
      .map((c, i) => `${i ? "L" : "M"} ${c[0]} ${c[1]}`)
      .concat(close ? ["Z"] : [])
      .join(" "),
    stroke,
    fill,
    "stroke-width": width * scale,
  },
});

/**
 * Create SVG representation of a course.
 * Output coordinate system should be paper coordinates (millimeters) but y-axis inverted
 * since SVG has y-axis growing downwards
 *
 * @param {import("../models/course").Course} course
 * @param {import("../models/course-appearance").CourseAppearance} courseAppearance
 * @param {string} eventName
 * @param {number} mapScale
 * @param {Document} document
 * @returns
 */
export async function courseToSvg(
  course,
  courseAppearance,
  eventName,
  mapScale,
  document
) {
  const patterns = { forbiddenArea: createPatternForbiddenArea() };
  const controls = course.controls;
  const objScale = getObjectScale(
    courseAppearance.scaleSizes,
    mapScale,
    course.printScale
  );

  const controlConnections = createControlConnections(
    controls,
    courseAppearance.autoLegGapSize,
    course.labelKind,
    objScale
  );
  const specialObjects = createSpecialObjects(
    course.specialObjects,
    course.controls.length
  );

  return createSvgNode(document, {
    type: "g",
    children: [
      {
        type: "defs",
        children: Object.values(patterns).flat(),
      },
      ...(await specialObjectsToSvg()),
      ...controlsToSvg(),
      ...controlConnectionsToSvg(controlConnections),
      ...controlNumbersToSvg(
        courseObjectsGeoJSON(controlConnections, specialObjects),
        course.labelKind
      ),
    ],
  });

  function controlsToSvg() {
    return createControls(controls).features.map(controlToSvg);
  }

  function controlConnectionsToSvg(controlConnections) {
    return controlConnections.features.map(({ geometry: { coordinates } }) =>
      lines(
        coordinates.map(toSvgCoord),
        false,
        courseOverPrintRgb,
        null,
        objScale
      )
    );
  }

  function controlNumbersToSvg(courseObjects, labelKind) {
    return createNumberPositions(
      controls,
      courseObjects,
      objScale,
      labelKind
    ).features.map(({ properties, geometry: { coordinates } }) => {
      const [x, y] = toSvgCoord(coordinates);
      return {
        type: "text",
        attrs: {
          x,
          y,
          "text-anchor": "middle",
          "dominant-baseline": "middle",
          fill: courseOverPrintRgb,
          style: `font: normal ${6 * objScale}px sans-serif;`,
        },
        text: properties.label,
      };
    });
  }

  async function specialObjectsToSvg() {
    return (
      await Promise.all(
        createSpecialObjects(course.specialObjects, course.controls.length)
          // Put descriptions last, to render them on top of everything else
          .features.sort(descriptionsOnTop)
          .map(async (specialObject) => {
            const {
              properties: { kind },
              geometry: { coordinates },
            } = specialObject;

            switch (kind) {
              case "forbidden-area": {
                return {
                  type: "g",
                  children: [
                    {
                      type: "path",
                      attrs: {
                        d: coordinates[0]
                          .map(toSvgCoord)
                          .map((c, i) => `${i ? "L" : "M"} ${c[0]} ${c[1]}`)
                          .concat(["Z"])
                          .join(" "),
                        fill: `url(#${patterns.forbiddenArea[0].id})`,
                        "stroke-width": 2,
                      },
                    },
                  ],
                };
              }
              case "white-out":
                return lines(
                  coordinates[0].map(toSvgCoord),
                  true,
                  null,
                  "white",
                  objScale
                );
              case "line": {
                const { color: featureColor, width = overprintLineWidth } =
                  specialObject.properties;
                const color = Array.isArray(featureColor)
                  ? `rgba(${[
                      ...featureColor.slice(0, 3),
                      featureColor[3] / 255,
                    ].join(",")})`
                  : palette[featureColor] || courseOverPrintRgb;
                return lines(
                  coordinates.map(toSvgCoord),
                  false,
                  color,
                  null,
                  objScale,
                  width
                );
              }
              case "descriptions": {
                const descriptionSvg = await courseDefinitionToSvg(
                  eventName,
                  course,
                  mapScale
                );
                const descriptionDimensions = getSvgDimensions(descriptionSvg);
                const descriptionGroup = descriptionSvg.firstChild;
                const [extentXmin, extentYmin, extentXmax, extentYmax] = [
                  ...specialObject.geometry.coordinates[0][0],
                  ...specialObject.geometry.coordinates[0][2],
                ];
                const extentMin = toSvgCoord([extentXmin, extentYmin]);
                const extentMax = toSvgCoord([extentXmax, extentYmax]);
                const scale =
                  (extentMax[0] - extentMin[0]) / descriptionDimensions[0];
                descriptionGroup.setAttribute(
                  "transform",
                  `translate(${extentMin[0]}, ${extentMax[1]}) scale(${scale}) `
                );
                return descriptionGroup;
              }
              default:
                console.warn(`Unhandled special object kind "${kind}".`);
                return null;
            }
          })
      )
    ).filter(Boolean);
  }

  //Function for pattern forbidden-area, scale and area need to be fixed
  function createPatternForbiddenArea() {
    const canvas = document.createElement("canvas");
    const highResSize = 20;
    canvas.width = highResSize;
    canvas.height = highResSize;

    const ctx = canvas.getContext("2d");

    ctx.strokeStyle = "rgba(197,86,173,255)";
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(highResSize, highResSize);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, highResSize);
    ctx.lineTo(highResSize, 0);
    ctx.stroke();

    const patternId = "forbidden-pattern";
    const pattern = {
      type: "pattern",
      attrs: {
        id: patternId,
        patternUnits: "userSpaceOnUse",
        width: 2,
        height: 2,
      },
      children: [
        {
          type: "image",
          attrs: {
            href: canvas.toDataURL(),
            width: 2,
            height: 2,
          },
        },
      ],
    };

    return pattern;
  }

  // Function for pattern forbidden-area, scale and area need to be fixed
  function createPatternForbiddenArea() {
    const d = 1.2;
    return [
      {
        type: "pattern",
        id: "oscout-forbidden-area",
        attrs: {
          patternUnits: "userSpaceOnUse",
          width: d,
          height: d,
        },
        children: [
          {
            type: "line",
            attrs: {
              x1: 0,
              y1: 0,
              x2: d,
              y2: d,
              stroke: "rgb(182,44,152)",
              "stroke-width": 0.2,
            },
          },
          {
            type: "line",
            attrs: {
              x1: d,
              y1: 0,
              x2: 0,
              y2: d,
              stroke: "rgb(182,44,152)",
              "stroke-width": 0.2,
            },
          },
        ],
      },
    ];
  }

  function descriptionsOnTop(
    { properties: { kind: aKind } },
    { properties: { kind: bKind } }
  ) {
    return aKind === "descriptions" ? 1 : bKind === "descriptions" ? -1 : 0;
  }

  function controlToSvg({ properties: { kind }, geometry: { coordinates } }) {
    switch (kind) {
      case "start": {
        const rotation = getStartRotation(course);
        return lines(
          startTriangle.map((p) =>
            toSvgCoord(add(rotate(mul(p, objScale), rotation), coordinates))
          ),
          true,
          courseOverPrintRgb,
          null,
          objScale
        );
      }
      case "normal":
        return circle(
          toSvgCoord(coordinates),
          controlCircleOutsideDiameter / 2,
          courseOverPrintRgb,
          objScale
        );
      case "finish":
        return {
          type: "g",
          children: Array.from({ length: 2 }).map((_, index) =>
            circle(
              toSvgCoord(coordinates),
              2 + index,
              courseOverPrintRgb,
              objScale
            )
          ),
        };
      default:
        throw new Error(`Unknown control kind "${kind}".`);
    }
  }
}

function toSvgCoord([x, y]) {
  return [x, -y];
}

const startTriangle = [
  [0, 3.464],
  [3, -1.732],
  [-3, -1.732],
  [0, 3.464],
];

const cellSize = 25;
export async function courseDefinitionToSvg(eventName, course, mapScale) {
  const { controls } = course;
  const fontSize = 14;
  const width = 8 * cellSize;
  const height = cellSize * (controls.length + 2);

  const svg = createSvgNode(window.document, {
    type: "svg",
    attrs: {
      width: width,
      height: height,
      viewbox: `0 0 ${width} ${height}`,
      fill: "white",
    },
    children: [
      {
        type: "g",
        children: [
          {
            type: "rect",
            attrs: {
              x: 0,
              y: 0,
              width: width,
              height: height,
              stroke: "black",
              fill: "white",
            },
          },
          ...header(),
          ...courseInfo(),
          ...(await controlDescriptions()),
        ],
      },
    ],
  });

  return svg;

  function header() {
    return [
      text(eventName, width / 2, cellSize - 7, "black", fontSize, "bold"),
      lines(
        [
          [0, cellSize],
          [width - 1, cellSize],
        ],
        false,
        "black",
        null,
        1
      ),
    ];
  }

  function courseInfo() {
    const y = cellSize * 2 - 7;
    return [
      text(course.name, (cellSize * 3) / 2, y, "black", fontSize, "bold"),
      text(
        // TODO: Use correct map scale
        `${courseDistance(course, 15000).toFixed(1)} km`,
        cellSize * 3 + (cellSize * 3) / 2,
        y,
        "black",
        fontSize,
        "bold"
      ),
      colLine(3, 1, 2),
      colLine(6, 1, 2),
      rowLine(2, 2),
    ];
  }

  async function controlDescriptions() {
    let sequenceNumber = 0;
    return (
      await Promise.all(
        course.controls.map(async ({ kind, code, description }, index) => {
          const y = (index + 2) * cellSize;
          const baseLine = y + cellSize - 7;

          if (kind === "normal") {
            sequenceNumber++;
          }

          return [
            kind === "start"
              ? await descriptionSymbol("start", index + 2, 0)
              : text(
                  course.labelKind === "sequence" ? sequenceNumber : "",
                  cellSize / 2,
                  baseLine,
                  "black",
                  fontSize,
                  "bold"
                ),
            text(code, cellSize + cellSize / 2, baseLine, "black", fontSize),
            colLine(1, index + 2, 1),
            description.all
              ? [
                  await descriptionSymbol(
                    description.all,
                    index + 2,
                    4,
                    cellSize - 1 // TODO: LOL
                  ),
                  text(
                    (index > 0
                      ? Math.round(
                          ((controlDistance(
                            course.controls[index - 1],
                            course.controls[index]
                          ) /
                            1000) *
                            // TODO: Use correct map scale
                            mapScale) /
                            10
                        ) * 10
                      : 0) + " m",
                    cellSize * 4 + cellSize / 2,
                    baseLine,
                    "black",
                    fontSize,
                    "bold"
                  ),
                ]
              : (
                  await Promise.all(
                    ["C", "D", "E", "F", "G", "H"].map(
                      async (column, colIndex) => [
                        description[column]
                          ? typeof description[column] === "string"
                            ? await descriptionSymbol(
                                description[column],
                                index + 2,
                                colIndex + 2
                              )
                            : text(
                                description[column].value,
                                cellSize * (colIndex + 2) + cellSize / 2,
                                baseLine,
                                "black",
                                fontSize
                              )
                          : null,
                        colLine(
                          colIndex + 2,
                          index + 2,
                          (colIndex + 2) % 3 === 0 ? 2 : 1
                        ),
                      ]
                    )
                  )
                )
                  .flat()
                  .filter(Boolean),
            rowLine(index + 2, index % 3 === 0 ? 2 : 1),
          ].flat();
        })
      )
    ).flat();
  }

  async function descriptionSymbol(symbol, row, col, width = cellSize) {
    if (!symbol) return null;

    const {
      group,
      dimensions: [svgWidth, svgHeight],
    } = await fetchSymbolSvg(symbol);

    const margin = 5;
    const aspectRatio = svgHeight / svgWidth;
    const ratio = svgWidth / 130;
    const imageWidth = (width - margin * 2) * ratio;
    const imageHeight = (width - margin * 2) * aspectRatio * ratio;
    const x = cellSize * col + cellSize / 2 - imageWidth / 2;
    const y = cellSize * row + cellSize / 2 - imageHeight / 2;
    group.setAttribute(
      "transform",
      `translate(${x + imageWidth / 2}, ${y + imageHeight / 2}) scale(${
        imageWidth / svgWidth
      })`
    );

    return group;
  }

  function colLine(col, row, width) {
    const x = col * cellSize;
    const y = row * cellSize;
    return lines(
      [
        [x, y],
        [x, y + cellSize],
      ],
      false,
      "black",
      null,
      width
    );
  }

  function rowLine(row, strokeWidth) {
    const y = row * cellSize;
    return lines(
      [
        [0, y],
        [width - 1, y],
      ],
      false,
      "black",
      null,
      strokeWidth
    );
  }
}

export function getControlDescriptionExtent(descriptionObject, numberRows) {
  const { locations } = descriptionObject;
  // PPen gives size of one "cell" (column width)
  const cellSize = locations[1][0] - locations[0][0];
  const extentWidth = cellSize * 8;
  const extentHeight = cellSize * numberRows;
  return [
    locations[0][0],
    locations[0][1] - extentHeight,
    locations[0][0] + extentWidth,
    locations[0][1],
  ];
}

function text(
  text,
  x,
  y,
  fill,
  fontSize,
  fontWeight = "normal",
  fontFamily = "sans-serif"
) {
  return {
    type: "text",
    attrs: {
      x,
      y,
      fill,
      "font-family": fontFamily,
      "font-weight": fontWeight,
      "font-size": fontSize,
      "text-anchor": "middle",
    },
    text,
  };
}
