import {
  courseDistance,
  courseOverPrintRgb,
  getStartRotation,
} from "../models/course";
import { createControls } from "./use-controls";
import {
  controlCircleOutsideDiameter,
  createNumberPositions,
  overprintLineWidth,
} from "./use-number-positions";
import { createControlConnections } from "./user-control-connections";
import fetch from "./fetch";
import { controlDistance } from "../models/control";
import { createSpecialObjects } from "./use-special-objects";

export function createSvgNode(document, n) {
  if (n instanceof SVGElement) {
    return n;
  }

  const node = document.createElementNS("http://www.w3.org/2000/svg", n.type);
  n.id && (node.id = n.id);
  n.attrs &&
    Object.keys(n.attrs).forEach((attrName) =>
      node.setAttribute(attrName, n.attrs[attrName])
    );
  n.text && node.appendChild(document.createTextNode(n.text));
  n.children &&
    n.children.forEach((child) =>
      node.appendChild(createSvgNode(document, child))
    );

  return node;
}

export const circle = ([cx, cy], r, stroke, scale) => ({
  type: "circle",
  attrs: {
    cx,
    cy,
    r: r * (scale || 1),
    stroke,
    "stroke-width": overprintLineWidth * 100 * (scale || 1),
  },
});

export const lines = (coordinates, close, stroke, fill, scale) => ({
  type: "path",
  attrs: {
    d: coordinates
      .map((c, i) => `${i ? "L" : "M"} ${c[0]} ${c[1]}`)
      .concat(close ? ["Z"] : [])
      .join(" "),
    stroke,
    fill,
    "stroke-width": overprintLineWidth * 100 * (scale || 1),
  },
});

export async function courseToSvg(
  course,
  courseAppearance,
  eventName,
  mapScale,
  document
) {
  const controls = course.controls;
  const objScale = getObjectScale(
    courseAppearance.scaleSizes,
    mapScale,
    course.printScale
  );

  // Convert from PPEN mm to OCAD coordinates, 1/100 mm;
  // also flip y axis since SVG y-axis increases downwards
  const transformCoord = ([x, y]) => [x * 100, -y * 100];

  const controlConnections = createControlConnections(
    controls,
    transformCoord,
    courseAppearance.autoLegGapSize,
    objScale
  );

  return createSvgNode(document, {
    type: "g",
    children: [
      ...controlsToSvg(),
      ...controlConnectionsToSvg(controlConnections),
      ...controlNumbersToSvg(controlConnections),
      ...(await specialObjectsToSvg()),
    ],
  });

  function controlsToSvg() {
    return createControls(controls, transformCoord).features.map(controlToSvg);
  }

  function controlConnectionsToSvg(controlConnections) {
    return controlConnections.features.map(({ geometry: { coordinates } }) =>
      lines(coordinates, false, courseOverPrintRgb, null, objScale)
    );
  }

  function controlNumbersToSvg(courseObjects) {
    return createNumberPositions(
      controls,
      courseObjects,
      transformCoord,
      objScale
    ).features.map(
      (
        {
          properties,
          geometry: {
            coordinates: [x, y],
          },
        },
        i
      ) => ({
        type: "text",
        attrs: {
          x,
          y,
          "text-anchor": "middle",
          fill: courseOverPrintRgb,
          style: `font: normal ${600 * objScale}px sans-serif;`,
        },
        text:
          properties.kind !== "start" && properties.kind !== "finish"
            ? (i + 1).toString()
            : "",
      })
    );
  }

  async function specialObjectsToSvg() {
    return (
      await Promise.all(
        createSpecialObjects(course.specialObjects, transformCoord)
          // Put descriptions last, to render them on top of everything else
          .features.sort(descriptionsOnTop)
          .map(async (specialObject) => {
            const {
              properties: { kind },
              geometry: { coordinates },
            } = specialObject;
            switch (kind) {
              case "white-out":
                return lines(coordinates[0], true, null, "white");
              case "descriptions": {
                const descriptionSvg = await courseDefinitionToSvg(
                  eventName,
                  course
                );
                const descriptionDimensions = getSvgDimensions(descriptionSvg);
                const descriptionGroup = descriptionSvg.firstChild;
                const extent = getControlDescriptionExtent(
                  specialObject,
                  descriptionSvg
                );
                const scale =
                  (extent[2] - extent[0]) / descriptionDimensions[0];
                descriptionGroup.setAttribute(
                  "transform",
                  `translate(${extent[0]}, ${extent[3]}) scale(${scale}) `
                );
                return descriptionGroup;
              }
              default:
                return null;
            }
          })
      )
    ).filter(Boolean);
  }

  function descriptionsOnTop(
    { properties: { kind: aKind } },
    { properties: { kind: bKind } }
  ) {
    return aKind === "descriptions" ? 1 : bKind === "descriptions" ? -1 : 0;
  }

  function controlToSvg({ properties: { kind }, geometry: { coordinates } }) {
    switch (kind) {
      case "start":
        const rotation = getStartRotation(course);
        return lines(
          startTriangle.map((p) =>
            p
              .mul(objScale * 100)
              .rotate(rotation)
              .add(coordinates)
              .toArray()
          ),
          true,
          courseOverPrintRgb
        );
      case "normal":
        return circle(
          coordinates,
          (controlCircleOutsideDiameter / 2) * 100 * objScale,
          courseOverPrintRgb
        );
      case "finish":
        return {
          type: "g",
          children: Array.from({ length: 2 }).map((_, index) =>
            circle(
              coordinates,
              200 + index * 100 * objScale,
              courseOverPrintRgb
            )
          ),
        };
      default:
        throw new Error(`Unknown control kind "${kind}".`);
    }
  }
}

const startTriangle = [
  [0, 3.464],
  [3, -1.732],
  [-3, -1.732],
  [0, 3.464],
];

export async function courseDefinitionToSvg(eventName, course) {
  const { controls } = course;
  const cellSize = 25;
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
      text(
        eventName,
        width / 2,
        cellSize - 7,
        "black",
        fontSize,
        "bold",
        "middle"
      ),
      lines(
        [
          [0, cellSize],
          [width - 1, cellSize],
        ],
        false,
        "black",
        null,
        1 / 100
      ),
    ];
  }

  function courseInfo() {
    const y = cellSize * 2 - 7;
    return [
      text(
        course.name,
        (cellSize * 3) / 2,
        y,
        "black",
        fontSize,
        "bold",
        "middle"
      ),
      text(
        `${courseDistance(course, 15000).toFixed(1)} km`,
        cellSize * 3 + (cellSize * 3) / 2,
        y,
        "black",
        fontSize,
        "bold",
        "middle"
      ),
      colLine(3, 1, 2),
      colLine(6, 1, 2),
      rowLine(2, 2),
    ];
  }

  async function controlDescriptions() {
    return (
      await Promise.all(
        course.controls.map(async ({ kind, code, description }, index) => {
          const y = (index + 2) * cellSize;
          const baseLine = y + cellSize - 7;
          return [
            kind === "start"
              ? await descriptionSymbol("start", index + 2, 0)
              : text(index, cellSize / 2, baseLine, "black", fontSize, "bold"),
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
                    (
                      (controlDistance(
                        course.controls[index - 1],
                        course.controls[index]
                      ) /
                        1000) *
                      15000
                    ).toFixed(0) + " m",
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
                        await descriptionSymbol(
                          description[column],
                          index + 2,
                          colIndex + 2
                        ),
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

    const margin = 5;
    const svgUrl = (
      await import(`svg-control-descriptions/symbols/${symbol}.svg`)
    ).default;
    const symbolXml = await fetch(svgUrl, null, { format: "text" });
    const svg = new window.DOMParser().parseFromString(
      symbolXml,
      "image/svg+xml"
    );
    const svgNode = svg.getRootNode().firstChild;
    const [svgWidth, svgHeight] = getSvgDimensions(svgNode);
    const aspectRatio = svgHeight / svgWidth;
    const ratio = svgWidth / 130;
    const imageWidth = (width - margin * 2) * ratio;
    const imageHeight = (width - margin * 2) * aspectRatio * ratio;
    const group = svg.createElementNS("http://www.w3.org/2000/svg", "g");
    Array.from(svgNode.children).forEach((child) => group.appendChild(child));

    const x = cellSize * col + cellSize / 2 - imageWidth / 2;
    const y = cellSize * row + cellSize / 2 - imageHeight / 2;
    group.setAttribute(
      "transform",
      `translate(${x + imageWidth / 2}, ${y + imageHeight / 2}) scale(${
        imageWidth / svgWidth
      })`
    );

    return group;
    // return {
    //   type: "image",
    //   attrs: {
    //     href: `data:image/svg+xml,${encodeURIComponent(symbolXml)}`,
    //     x: cellSize * col + cellSize / 2 - imageWidth / 2,
    //     y: cellSize * row + cellSize / 2 - imageHeight / 2,
    //     width: imageWidth,
    //     height: imageHeight,
    //   },
    // };
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
      width / 50
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
      strokeWidth / 50
    );
  }
}

export function getControlDescriptionExtent(descriptionObject, descriptionSvg) {
  const imageSize = getSvgDimensions(descriptionSvg);
  const aspectRatio = imageSize[1] / imageSize[0];
  const { bbox } = descriptionObject;
  // PPen gives size of one "cell" (column width)
  const extentWidth = (bbox[2] - bbox[0]) * 8;
  const extentHeight = extentWidth * aspectRatio;
  return [bbox[0], bbox[1] - extentHeight, bbox[0] + extentWidth, bbox[1]];
}

function text(text, x, y, fill, fontSize, fontStyle = "normal") {
  return {
    type: "text",
    attrs: {
      x,
      y,
      fill,
      style: `font: ${fontStyle} ${fontSize}px sans-serif;`,
      "text-anchor": "middle",
    },
    text,
  };
}

export function getSvgDimensions(svg) {
  return ["width", "height"].map((attr) => parseInt(svg.getAttribute(attr)));
}

function getObjectScale(scaleSizes, mapScale, printScale) {
  switch (scaleSizes) {
    case "None":
      return printScale / mapScale;
    case "RelativeToMap":
      return 1;
    case "RelativeTo15000":
      return 15000 / mapScale;
    default:
      throw new Error(`Unknown scaleSizes mode "${scaleSizes}".`);
  }
}
