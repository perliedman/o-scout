import fetch from "./fetch";
import { getSvgDimensions } from "./svg-utils";

const symbols = import.meta.glob(
  "../../node_modules/svg-control-descriptions/symbols/*.svg"
);

export const descriptionSymbols = {};
for (const path in symbols) {
  const symbol = /symbols\/(.*)\.svg/.exec(path)[1];
  descriptionSymbols[symbol] = symbols[path];
}

export default async function fetchSymbolSvg(symbol) {
  const svgUrl = (await descriptionSymbols[symbol]()).default;
  const symbolXml = await fetch(svgUrl, null, { format: "text" });
  const svg = new window.DOMParser().parseFromString(
    symbolXml,
    "image/svg+xml"
  );
  const svgNode = svg.getRootNode().firstChild;
  const group = svg.createElementNS("http://www.w3.org/2000/svg", "g");
  Array.from(svgNode.children).forEach((child) => group.appendChild(child));

  return { group, dimensions: getSvgDimensions(svgNode) };
}
