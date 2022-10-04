import fetch from "./fetch";
import { getSvgDimensions } from "./svg-utils";

export default async function fetchSymbolSvg(symbol) {
  const svgUrl = (
    await import(`../../node_modules/svg-control-descriptions/symbols/${symbol}.svg`)
  ).default;
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
