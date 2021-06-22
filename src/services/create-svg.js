import Coordinate from "../models/coordinate";
import { courseDistance, courseOverPrintRgb } from "../models/course";
import { createControls } from "./use-controls";
import {
  controlCircleOutsideDiameter,
  createNumberPositions,
} from "./use-number-positions";
import { createControlConnections } from "./user-control-connections";
import fetch from "./fetch";
import { controlDistance } from "../models/control";

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
    "stroke-width": 50 * (scale || 1),
  },
});

export const lines = (coordinates, close, stroke, scale) => ({
  type: "path",
  attrs: {
    d: coordinates
      .map((c, i) => `${i ? "L" : "M"} ${c[0]} ${c[1]}`)
      .concat(close ? ["Z"] : [])
      .join(" "),
    stroke,
    "stroke-width": 50 * (scale || 1),
  },
});

export function courseToSvg(course, document) {
  const controls = course.controls;
  const objScale = 1; //course.objScale();

  // Convert from PPEN mm to OCAD coordinates, 1/100 mm;
  // also flip y axis since SVG y-axis increases downwards
  const transformCoord = ([x, y]) => new Coordinate(x * 100, -y * 100);

  return createSvgNode(document, {
    type: "g",
    children: createControls(controls, transformCoord)
      .features.map(({ geometry: { type, coordinates } }) =>
        type === "Point"
          ? circle(
              coordinates,
              (controlCircleOutsideDiameter / 2) * 100,
              courseOverPrintRgb
            )
          : lines(coordinates, true, courseOverPrintRgb)
      )
      .concat(
        createControlConnections(
          controls,
          transformCoord,
          objScale
        ).features.map(({ geometry: { coordinates } }) =>
          lines(coordinates, false, courseOverPrintRgb, objScale)
        )
      )
      .concat(
        createNumberPositions(controls, transformCoord, objScale).features.map(
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
        )
      ),
  });
}

export async function courseDefinitionToSvg(eventName, course) {
  const { controls } = course;
  const cellSize = 25;
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
        type: "rect",
        attrs: {
          x: 0,
          y: 0,
          width: width,
          height: height,
          stroke: "black",
        },
      },
      ...header(),
      ...courseInfo(),
      ...(await controlDescriptions()),
    ],
  });

  return svg;
  // return new Promise((resolve, reject) => {
  //   const svgContainer = new Image();
  //   svgContainer.onload = () => {
  //     resolve(svg);
  //     debugger;
  //   };
  //   svgContainer.onerror = (err) => {
  //     debugger;
  //     reject(new Error(`Failed to load SVG: ${err}`));
  //   };

  //   svgContainer.src = svgToUrl(svg);
  // });

  function header() {
    return [
      text(eventName, width / 2, cellSize - 7, "black", 14, "bold", "middle"),
      lines(
        [
          [0, cellSize],
          [width - 1, cellSize],
        ],
        false,
        "black",
        1 / 100
      ),
    ];
  }

  function courseInfo() {
    const y = cellSize * 2 - 7;
    return [
      text(course.name, (cellSize * 3) / 2, y, "black", 14, "bold", "middle"),
      text(
        `${courseDistance(course, 15000).toFixed(1)} km`,
        cellSize * 3 + (cellSize * 3) / 2,
        y,
        "black",
        14,
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
              : text(index, cellSize / 2, baseLine, "black", 14, "bold"),
            text(code, cellSize + cellSize / 2, baseLine, "black", 14),
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
                    14,
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
    const [svgWidth, svgHeight] = getSvgDimensions(
      svg.getRootNode().firstChild
    );
    const aspectRatio = svgHeight / svgWidth;
    const ratio = svgWidth / 130;
    const imageWidth = (width - margin * 2) * ratio;
    const imageHeight = (width - margin * 2) * aspectRatio * ratio;

    return {
      type: "image",
      attrs: {
        href: `data:image/svg+xml,${encodeURIComponent(symbolXml)}`,
        x: cellSize * col + cellSize / 2 - imageWidth / 2,
        y: cellSize * row + cellSize / 2 - imageHeight / 2,
        width: imageWidth,
        height: imageHeight,
      },
    };
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
      strokeWidth / 50
    );
  }

  // function grid() {
  //   return [
  //     // Columns
  //     ...Array.from({length: 7}).map((_, index) => {
  //       const x = (index + 1) * cellSize
  //       const y = 2 * cellSize
  //       lines([[x, 2 * cellSize], [x, height - 1]])
  //   ]
  // }
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
