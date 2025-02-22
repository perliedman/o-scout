let testMode = false;

export function setTestMode(enabled = true) {
  testMode = enabled;
}

export function createSvgNode(document, n) {
  if (n instanceof SVGElement) {
    // Currently tests with @xmldom/xmldom barfs if we try to appendChild with
    // an SVGElement instance, so in testmode we return a dummy element. Should probably
    // investigate why this happens and hopefully get rid of testMode...
    return !testMode
      ? n
      : document.createElementNS("http://www.w3.org/2000/svg", "g");
  }

  const node = document.createElementNS("http://www.w3.org/2000/svg", n.type);
  if (n.id) {
    node.id = n.id;
  }
  for (const [attrName, value] of Object.entries(n.attrs || {})) {
    node.setAttribute(attrName, value);
  }

  if (n.text) {
    node.appendChild(document.createTextNode(n.text));
  }

  for (const child of n.children || []) {
    try {
      node.appendChild(createSvgNode(document, child));
    } catch (e) {
      console.error("Failed to add child", child);
      throw e;
    }
  }

  return node;
}

export function getSvgDimensions(svg) {
  return ["width", "height"].map((attr) => parseInt(svg.getAttribute(attr)));
}
