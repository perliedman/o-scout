const svgNamespace = "http://www.w3.org/2000/svg";

export function createSvg(svgChildren) {
  const doc = document.implementation.createDocument(null, "xml", null);
  const rootNode = createSvgNode(doc, {
    type: "svg",
    attrs: {
      xmlns: svgNamespace,
    },
    children: svgChildren,
  });
  return createSvgNode(doc, rootNode);
}

export function createSvgNode(document, n) {
  if (n instanceof SVGElement) {
    return n;
  }

  const node = document.createElementNS(svgNamespace, n.type);
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

export function getSvgDimensions(svg) {
  return ["width", "height"].map((attr) => parseInt(svg.getAttribute(attr)));
}
